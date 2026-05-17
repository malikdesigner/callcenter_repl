import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, doctorsTable, appointmentsTable } from "@workspace/db";
import {
  CreateDoctorBody,
  UpdateDoctorBody,
  GetDoctorParams,
  UpdateDoctorParams,
  DeleteDoctorParams,
  ListDoctorsQueryParams,
  ListDoctorSlotsParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/doctors", async (req, res): Promise<void> => {
  const query = ListDoctorsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db.select().from(doctorsTable).$dynamic();
  const conditions = [];
  if (query.data.tenantId) conditions.push(eq(doctorsTable.tenantId, query.data.tenantId));
  if (query.data.specialty) conditions.push(eq(doctorsTable.specialty, query.data.specialty));
  if (conditions.length > 0) dbQuery = dbQuery.where(and(...conditions));

  const doctors = await dbQuery.orderBy(doctorsTable.name);
  res.json(doctors);
});

router.post("/doctors", async (req, res): Promise<void> => {
  const parsed = CreateDoctorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doctor] = await db.insert(doctorsTable).values(parsed.data).returning();
  res.status(201).json(doctor);
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const params = GetDoctorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, params.data.id));
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(doctor);
});

router.patch("/doctors/:id", async (req, res): Promise<void> => {
  const params = UpdateDoctorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDoctorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doctor] = await db.update(doctorsTable).set(parsed.data).where(eq(doctorsTable.id, params.data.id)).returning();
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(doctor);
});

router.delete("/doctors/:id", async (req, res): Promise<void> => {
  const params = DeleteDoctorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doctor] = await db.delete(doctorsTable).where(eq(doctorsTable.id, params.data.id)).returning();
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/doctors/:id/slots/:date", async (req, res): Promise<void> => {
  const params = ListDoctorSlotsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, params.data.id));
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const date = params.data.date instanceof Date ? params.data.date.toISOString().split("T")[0] : String(params.data.date);
  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  const availableDays = doctor.availableDays.split(",").map(Number);

  if (!availableDays.includes(dayOfWeek)) {
    res.json([]);
    return;
  }

  const existingAppts = await db
    .select()
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.doctorId, params.data.id),
        eq(appointmentsTable.appointmentDate, date),
        eq(appointmentsTable.status, "scheduled")
      )
    );

  const bookedSlots = new Set(existingAppts.map((a) => a.startTime));

  const slots = [];
  const [startH, startM] = doctor.startTime.split(":").map(Number);
  const [endH, endM] = doctor.endTime.split(":").map(Number);
  const slotDuration = doctor.slotDurationMinutes;

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + slotDuration <= end) {
    const hh = String(Math.floor(current / 60)).padStart(2, "0");
    const mm = String(current % 60).padStart(2, "0");
    const startTime = `${hh}:${mm}`;
    const nextMin = current + slotDuration;
    const hh2 = String(Math.floor(nextMin / 60)).padStart(2, "0");
    const mm2 = String(nextMin % 60).padStart(2, "0");
    const endTime = `${hh2}:${mm2}`;

    slots.push({
      date,
      startTime,
      endTime,
      available: !bookedSlots.has(startTime),
    });
    current += slotDuration;
  }

  res.json(slots);
});

export default router;
