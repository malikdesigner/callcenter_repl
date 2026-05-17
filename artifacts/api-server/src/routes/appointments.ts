import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, appointmentsTable, doctorsTable, patientsTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  DeleteAppointmentParams,
  ListAppointmentsQueryParams,
  CancelAppointmentParams,
  CancelAppointmentBody,
  CompleteAppointmentParams,
  CompleteAppointmentBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichAppointment(appt: typeof appointmentsTable.$inferSelect) {
  const [doctor] = await db.select({ name: doctorsTable.name, specialty: doctorsTable.specialty })
    .from(doctorsTable).where(eq(doctorsTable.id, appt.doctorId));
  const [patient] = await db.select({ name: patientsTable.name })
    .from(patientsTable).where(eq(patientsTable.id, appt.patientId));
  return {
    ...appt,
    doctorName: doctor?.name ?? null,
    patientName: patient?.name ?? null,
    specialty: doctor?.specialty ?? null,
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const query = ListAppointmentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db.select().from(appointmentsTable).$dynamic();
  const conditions = [];
  if (query.data.tenantId) conditions.push(eq(appointmentsTable.tenantId, query.data.tenantId));
  if (query.data.doctorId) conditions.push(eq(appointmentsTable.doctorId, query.data.doctorId));
  if (query.data.patientId) conditions.push(eq(appointmentsTable.patientId, query.data.patientId));
  if (query.data.status) conditions.push(eq(appointmentsTable.status, query.data.status as "scheduled" | "cancelled" | "completed"));
  if (query.data.date) {
    const dateStr = query.data.date instanceof Date ? query.data.date.toISOString().split("T")[0] : String(query.data.date);
    conditions.push(eq(appointmentsTable.appointmentDate, dateStr));
  }
  if (conditions.length > 0) dbQuery = dbQuery.where(and(...conditions));

  const appts = await dbQuery.orderBy(appointmentsTable.appointmentDate, appointmentsTable.startTime);
  const enriched = await Promise.all(appts.map(enrichAppointment));
  res.json(enriched);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const insertData = {
    ...parsed.data,
    appointmentDate: parsed.data.appointmentDate instanceof Date
      ? parsed.data.appointmentDate.toISOString().split("T")[0]
      : String(parsed.data.appointmentDate),
  };
  const [appt] = await db.insert(appointmentsTable).values(insertData).returning();
  const enriched = await enrichAppointment(appt);
  res.status(201).json(enriched);
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const enriched = await enrichAppointment(appt);
  res.json(enriched);
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { appointmentDate: rawDate, ...restData } = parsed.data;
  const updateData: typeof restData & { appointmentDate?: string } = { ...restData };
  if (rawDate != null) {
    updateData.appointmentDate = rawDate instanceof Date
      ? rawDate.toISOString().split("T")[0]
      : String(rawDate);
  }
  const [appt] = await db.update(appointmentsTable).set(updateData).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const enriched = await enrichAppointment(appt);
  res.json(enriched);
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [appt] = await db.delete(appointmentsTable).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/appointments/:id/cancel", async (req, res): Promise<void> => {
  const params = CancelAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CancelAppointmentBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [appt] = await db
    .update(appointmentsTable)
    .set({ status: "cancelled", cancelReason: body.data.cancelReason ?? null })
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const enriched = await enrichAppointment(appt);
  res.json(enriched);
});

router.post("/appointments/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CompleteAppointmentBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [appt] = await db
    .update(appointmentsTable)
    .set({ status: "completed", notes: body.data.notes ?? null })
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const enriched = await enrichAppointment(appt);
  res.json(enriched);
});

export default router;
