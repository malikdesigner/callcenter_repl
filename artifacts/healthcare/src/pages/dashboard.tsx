import { useGetDashboardStats, useGetDashboardActivity, getGetDashboardStatsQueryKey, getGetDashboardActivityQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Activity, Calendar, Users, UserCheck, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const TENANT_ID = 1;

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ActivityBadge({ type }: { type: string }) {
  const badges: Record<string, { label: string; className: string }> = {
    appointment_booked: { label: "Booked", className: "bg-primary/10 text-primary" },
    appointment_cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
    appointment_completed: { label: "Completed", className: "bg-green-500/10 text-green-600" },
    patient_registered: { label: "New Patient", className: "bg-purple-500/10 text-purple-600" },
    doctor_added: { label: "New Doctor", className: "bg-amber-500/10 text-amber-600" },
  };
  const badge = badges[type] ?? { label: type, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(
    { tenantId: TENANT_ID },
    { query: { queryKey: getGetDashboardStatsQueryKey({ tenantId: TENANT_ID }) } }
  );
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity(
    { tenantId: TENANT_ID, limit: 8 },
    { query: { queryKey: getGetDashboardActivityQueryKey({ tenantId: TENANT_ID, limit: 8 }) } }
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
            ))
          ) : (
            <>
              <StatCard label="Total Appointments" value={stats?.totalAppointments ?? 0} icon={Calendar} color="bg-primary" />
              <StatCard label="Scheduled" value={stats?.scheduledAppointments ?? 0} icon={Clock} color="bg-blue-500" />
              <StatCard label="Completed" value={stats?.completedAppointments ?? 0} icon={CheckCircle} color="bg-green-500" />
              <StatCard label="Cancelled" value={stats?.cancelledAppointments ?? 0} icon={XCircle} color="bg-destructive" />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
            ))
          ) : (
            <>
              <StatCard label="Total Doctors" value={stats?.totalDoctors ?? 0} icon={UserCheck} color="bg-indigo-500" />
              <StatCard label="Total Patients" value={stats?.totalPatients ?? 0} icon={Users} color="bg-purple-500" />
              <StatCard label="Today's Appointments" value={stats?.todayAppointments ?? 0} icon={Activity} color="bg-amber-500" />
              <StatCard label="Specialties" value={stats?.appointmentsBySpecialty?.length ?? 0} icon={TrendingUp} color="bg-teal-500" />
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Specialty breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Appointments by Specialty</h2>
            {statsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : stats?.appointmentsBySpecialty?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No appointments yet</p>
            ) : (
              <div className="space-y-3">
                {(stats?.appointmentsBySpecialty ?? []).map((s) => {
                  const total = stats?.totalAppointments ?? 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.specialty} data-testid={`specialty-${s.specialty}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{s.specialty}</span>
                        <span className="text-muted-foreground">{s.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (activity ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(activity ?? []).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0" data-testid={`activity-item-${item.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(item.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <ActivityBadge type={item.type} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
