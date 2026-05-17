import { useState } from "react";
import { Link } from "wouter";
import { useListAppointments, getListAppointmentsQueryKey, useCancelAppointment, useCompleteAppointment, useCreateAppointment, useListDoctors, useListPatients } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Calendar, Plus, Search, Filter, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const TENANT_ID = 1;

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-200",
  completed: "bg-green-500/10 text-green-600 border-green-200",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newAppt, setNewAppt] = useState({ doctorId: "", patientId: "", appointmentDate: "", startTime: "09:00", endTime: "09:30", reason: "" });

  const params: Record<string, unknown> = { tenantId: TENANT_ID };
  if (status) params.status = status;
  if (date) params.date = date;

  const { data: appointments, isLoading } = useListAppointments(params as Parameters<typeof useListAppointments>[0], {
    query: { queryKey: getListAppointmentsQueryKey(params as Parameters<typeof getListAppointmentsQueryKey>[0]) },
  });
  const { data: doctors } = useListDoctors({ tenantId: TENANT_ID });
  const { data: patients } = useListPatients({ tenantId: TENANT_ID });

  const cancelMut = useCancelAppointment();
  const completeMut = useCompleteAppointment();
  const createMut = useCreateAppointment();

  const filteredAppts = (appointments ?? []).filter((a) =>
    !search || a.patientName?.toLowerCase().includes(search.toLowerCase()) || a.doctorName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      data: {
        tenantId: TENANT_ID,
        doctorId: Number(newAppt.doctorId),
        patientId: Number(newAppt.patientId),
        appointmentDate: newAppt.appointmentDate,
        startTime: newAppt.startTime,
        endTime: newAppt.endTime,
        reason: newAppt.reason,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ tenantId: TENANT_ID }) });
        setShowForm(false);
        setNewAppt({ doctorId: "", patientId: "", appointmentDate: "", startTime: "09:00", endTime: "09:30", reason: "" });
      }
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
            <p className="text-muted-foreground text-sm mt-1">{filteredAppts.length} appointments found</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            data-testid="button-new-appointment"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients or doctors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              data-testid="input-search"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="select-status"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="input-date-filter"
          />
        </div>

        {/* Book form */}
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Book New Appointment</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Doctor</label>
                <select
                  value={newAppt.doctorId}
                  onChange={(e) => setNewAppt({ ...newAppt, doctorId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                  data-testid="select-doctor"
                >
                  <option value="">Select doctor...</option>
                  {(doctors ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Patient</label>
                <select
                  value={newAppt.patientId}
                  onChange={(e) => setNewAppt({ ...newAppt, patientId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                  data-testid="select-patient"
                >
                  <option value="">Select patient...</option>
                  {(patients ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Date</label>
                <input
                  type="date"
                  value={newAppt.appointmentDate}
                  onChange={(e) => setNewAppt({ ...newAppt, appointmentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                  data-testid="input-appointment-date"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Reason</label>
                <input
                  type="text"
                  value={newAppt.reason}
                  onChange={(e) => setNewAppt({ ...newAppt, reason: e.target.value })}
                  placeholder="Chief complaint..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-reason"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Start Time</label>
                <input
                  type="time"
                  value={newAppt.startTime}
                  onChange={(e) => setNewAppt({ ...newAppt, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">End Time</label>
                <input
                  type="time"
                  value={newAppt.endTime}
                  onChange={(e) => setNewAppt({ ...newAppt, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div className="col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                  data-testid="button-confirm-book"
                >
                  {createMut.isPending ? "Booking..." : "Confirm Booking"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Appointment list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calendar className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">No appointments found</p>
              <p className="text-sm mt-1">Book a new appointment to get started</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Patient</span>
                <span>Doctor</span>
                <span>Date & Time</span>
                <span>Status</span>
                <span></span>
              </div>
              {filteredAppts.map((appt) => (
                <div
                  key={appt.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  data-testid={`appointment-row-${appt.id}`}
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">{appt.patientName ?? "Unknown Patient"}</p>
                    {appt.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate">{appt.reason}</p>}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{appt.doctorName ?? "Unknown Doctor"}</p>
                    <p className="text-xs text-muted-foreground">{appt.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">{appt.appointmentDate}</p>
                    <p className="text-xs text-muted-foreground">{appt.startTime} — {appt.endTime}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[appt.status] ?? "bg-muted text-foreground border-border"}`}>
                    {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                  </span>
                  <div className="flex items-center gap-1">
                    {appt.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => completeMut.mutate({ id: appt.id, data: {} }, {
                            onSuccess: () => qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ tenantId: TENANT_ID }) })
                          })}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark complete"
                          data-testid={`button-complete-${appt.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => cancelMut.mutate({ id: appt.id, data: {} }, {
                            onSuccess: () => qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ tenantId: TENANT_ID }) })
                          })}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Cancel"
                          data-testid={`button-cancel-${appt.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <Link href={`/appointments/${appt.id}`}>
                      <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors" data-testid={`button-view-${appt.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
