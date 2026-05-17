import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, doctorsTable, appointmentsTable, patientsTable } from "@workspace/db";
import { AiChatBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, tenantId, conversationHistory = [] } = parsed.data;
  const lowerMsg = message.toLowerCase();

  try {
    // Context-aware AI responses using real database data
    let responseMessage = "";
    let suggestions: string[] = [];
    let action: string | null = null;
    let actionData: Record<string, unknown> | null = null;

    if (lowerMsg.includes("doctor") || lowerMsg.includes("specialist") || lowerMsg.includes("available")) {
      const doctors = await db.select().from(doctorsTable).where(eq(doctorsTable.tenantId, tenantId));
      const specialties = [...new Set(doctors.map((d) => d.specialty))];

      if (doctors.length === 0) {
        responseMessage = "There are no doctors currently registered in the system. Please contact your administrator to add doctors.";
        suggestions = ["Add a doctor", "Contact admin", "Check another clinic"];
      } else {
        responseMessage = `We have ${doctors.length} doctor${doctors.length > 1 ? "s" : ""} available across ${specialties.length} specialt${specialties.length > 1 ? "ies" : "y"}: ${specialties.join(", ")}. Which specialty are you looking for?`;
        suggestions = specialties.slice(0, 4).map((s) => `See ${s} doctors`);
        suggestions.push("Book an appointment");
        action = "list_doctors";
        actionData = { doctors: doctors.map((d) => ({ id: d.id, name: d.name, specialty: d.specialty })) };
      }
    } else if (lowerMsg.includes("book") || lowerMsg.includes("appointment") || lowerMsg.includes("schedule")) {
      const doctors = await db.select().from(doctorsTable).where(eq(doctorsTable.tenantId, tenantId));
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      if (doctors.length === 0) {
        responseMessage = "I cannot book an appointment yet — no doctors are registered. Please add doctors first.";
        suggestions = ["Add a doctor", "View doctors page"];
      } else {
        const specialties = [...new Set(doctors.map((d) => d.specialty))];
        responseMessage = `I can help you book an appointment. We have doctors in: ${specialties.join(", ")}. What specialty do you need, and do you prefer today (${today}) or tomorrow (${tomorrow})?`;
        suggestions = [`Book for today (${today})`, `Book for tomorrow (${tomorrow})`, ...specialties.slice(0, 2).map((s) => `Book ${s} appointment`)];
        action = "book_appointment";
        actionData = { suggestedDates: [today, tomorrow], availableSpecialties: specialties };
      }
    } else if (lowerMsg.includes("cancel") || lowerMsg.includes("cancellation")) {
      const scheduled = await db.select().from(appointmentsTable)
        .where(and(eq(appointmentsTable.tenantId, tenantId), eq(appointmentsTable.status, "scheduled")));
      responseMessage = `There are currently ${scheduled.length} scheduled appointment${scheduled.length !== 1 ? "s" : ""}. To cancel, please go to the Appointments page and select the appointment you wish to cancel.`;
      suggestions = ["View appointments", "Go to appointments page", "Book new appointment"];
      action = "navigate";
      actionData = { page: "/appointments" };
    } else if (lowerMsg.includes("patient") || lowerMsg.includes("record")) {
      const patients = await db.select().from(patientsTable).where(eq(patientsTable.tenantId, tenantId));
      responseMessage = `The system has ${patients.length} registered patient${patients.length !== 1 ? "s" : ""}. You can search for a specific patient by name on the Patients page, or register a new patient.`;
      suggestions = ["Search for a patient", "Register new patient", "View all patients", "Book appointment for patient"];
      action = "navigate";
      actionData = { page: "/patients" };
    } else if (lowerMsg.includes("today") || lowerMsg.includes("schedule") || lowerMsg.includes("what")) {
      const today = new Date().toISOString().split("T")[0];
      const todayAppts = await db.select().from(appointmentsTable)
        .where(and(eq(appointmentsTable.tenantId, tenantId), eq(appointmentsTable.appointmentDate, today)));
      const scheduled = todayAppts.filter((a) => a.status === "scheduled");
      responseMessage = `Today is ${today}. You have ${scheduled.length} scheduled appointment${scheduled.length !== 1 ? "s" : ""} today${scheduled.length > 0 ? ", and " + todayAppts.filter((a) => a.status === "completed").length + " completed" : ""}. Would you like to see the full schedule?`;
      suggestions = ["View today's appointments", "Book appointment", "View all appointments", "Check doctor availability"];
    } else if (lowerMsg.includes("help") || lowerMsg.includes("what can you")) {
      responseMessage = "I can assist you with: checking doctor availability, booking appointments, viewing patient records, cancelling appointments, and providing schedule overviews. What would you like help with?";
      suggestions = ["Check doctor availability", "Book an appointment", "View today's schedule", "Find a patient", "Cancel appointment"];
    } else {
      const today = new Date().toISOString().split("T")[0];
      const todayAppts = await db.select().from(appointmentsTable)
        .where(and(eq(appointmentsTable.tenantId, tenantId), eq(appointmentsTable.appointmentDate, today)));
      responseMessage = `I understand you're asking about "${message}". I'm here to help with healthcare appointment management. Today there are ${todayAppts.filter((a) => a.status === "scheduled").length} scheduled appointments. How can I assist you specifically?`;
      suggestions = ["Book an appointment", "Check available doctors", "View today's schedule", "Find a patient"];
    }

    res.json({
      message: responseMessage,
      suggestions,
      action,
      actionData,
    });
  } catch (err) {
    logger.error({ err }, "AI chat error");
    res.status(500).json({ error: "AI service temporarily unavailable" });
  }
});

export default router;
