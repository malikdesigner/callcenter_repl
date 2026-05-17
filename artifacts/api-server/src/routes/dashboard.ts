import { Router } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, appointmentsTable, doctorsTable, patientsTable } from "@workspace/db";
import { GetDashboardStatsQueryParams, GetDashboardActivityQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const query = GetDashboardStatsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const tenantId = query.data.tenantId;
  const today = new Date().toISOString().split("T")[0];

  const apptCondition = tenantId ? eq(appointmentsTable.tenantId, tenantId) : sql`1=1`;
  const doctorCondition = tenantId ? eq(doctorsTable.tenantId, tenantId) : sql`1=1`;
  const patientCondition = tenantId ? eq(patientsTable.tenantId, tenantId) : sql`1=1`;

  const allAppts = await db.select().from(appointmentsTable).where(apptCondition);
  const totalDoctors = await db.select({ count: count() }).from(doctorsTable).where(doctorCondition);
  const totalPatients = await db.select({ count: count() }).from(patientsTable).where(patientCondition);

  const totalAppointments = allAppts.length;
  const scheduledAppointments = allAppts.filter((a) => a.status === "scheduled").length;
  const completedAppointments = allAppts.filter((a) => a.status === "completed").length;
  const cancelledAppointments = allAppts.filter((a) => a.status === "cancelled").length;
  const todayAppointments = allAppts.filter((a) => a.appointmentDate === today).length;

  const specialtyMap: Record<string, number> = {};
  for (const appt of allAppts) {
    const [doctor] = await db.select({ specialty: doctorsTable.specialty })
      .from(doctorsTable).where(eq(doctorsTable.id, appt.doctorId));
    const specialty = doctor?.specialty ?? "Unknown";
    specialtyMap[specialty] = (specialtyMap[specialty] ?? 0) + 1;
  }

  const appointmentsBySpecialty = Object.entries(specialtyMap).map(([specialty, c]) => ({
    specialty,
    count: c,
  }));

  res.json({
    totalAppointments,
    scheduledAppointments,
    completedAppointments,
    cancelledAppointments,
    totalDoctors: totalDoctors[0]?.count ?? 0,
    totalPatients: totalPatients[0]?.count ?? 0,
    todayAppointments,
    appointmentsBySpecialty,
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const query = GetDashboardActivityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const tenantId = query.data.tenantId;
  const limit = query.data.limit ?? 10;

  let dbQuery = db.select().from(appointmentsTable).$dynamic();
  if (tenantId) dbQuery = dbQuery.where(eq(appointmentsTable.tenantId, tenantId));
  const appts = await dbQuery.orderBy(appointmentsTable.createdAt).limit(limit);

  const activities = await Promise.all(
    appts.map(async (appt, idx) => {
      const [doctor] = await db.select({ name: doctorsTable.name }).from(doctorsTable).where(eq(doctorsTable.id, appt.doctorId));
      const [patient] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, appt.patientId));

      let type: string;
      let message: string;
      if (appt.status === "cancelled") {
        type = "appointment_cancelled";
        message = `Appointment with Dr. ${doctor?.name ?? "Unknown"} was cancelled`;
      } else if (appt.status === "completed") {
        type = "appointment_completed";
        message = `Appointment with Dr. ${doctor?.name ?? "Unknown"} was completed`;
      } else {
        type = "appointment_booked";
        message = `${patient?.name ?? "Patient"} booked an appointment with Dr. ${doctor?.name ?? "Unknown"}`;
      }

      return {
        id: appt.id * 10 + idx,
        type,
        message,
        patientName: patient?.name ?? null,
        doctorName: doctor?.name ?? null,
        createdAt: appt.createdAt,
      };
    })
  );

  res.json(activities);
});

export default router;
