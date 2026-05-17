import { useState } from "react";
import { Link } from "wouter";
import { useListDoctors, getListDoctorsQueryKey, useCreateDoctor, useDeleteDoctor } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Users, Plus, Search, Stethoscope, Phone, Mail, Clock, ChevronRight, Trash2 } from "lucide-react";

const TENANT_ID = 1;

const SPECIALTIES = ["Cardiology", "Neurology", "Pediatrics", "Orthopedics", "Internal Medicine", "Dermatology", "Psychiatry", "Oncology", "General Surgery", "Emergency Medicine"];

export default function DoctorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", specialty: "", bio: "", licenseNumber: "", phone: "", email: "",
    availableDays: "1,2,3,4,5", startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30
  });

  const { data: doctors, isLoading } = useListDoctors(
    { tenantId: TENANT_ID, ...(specialty ? { specialty } : {}) },
    { query: { queryKey: getListDoctorsQueryKey({ tenantId: TENANT_ID, ...(specialty ? { specialty } : {}) }) } }
  );

  const createMut = useCreateDoctor();
  const deleteMut = useDeleteDoctor();

  const filtered = (doctors ?? []).filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ data: { ...form, tenantId: TENANT_ID } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDoctorsQueryKey({ tenantId: TENANT_ID }) });
        setShowForm(false);
        setForm({ name: "", specialty: "", bio: "", licenseNumber: "", phone: "", email: "", availableDays: "1,2,3,4,5", startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 });
      }
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Doctors</h1>
            <p className="text-muted-foreground text-sm mt-1">{filtered.length} doctors registered</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            data-testid="button-add-doctor"
          >
            <Plus className="h-4 w-4" />
            Add Doctor
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search doctors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              data-testid="input-search-doctor"
            />
          </div>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="select-specialty-filter"
          >
            <option value="">All Specialties</option>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Add New Doctor</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { label: "Full Name", key: "name", type: "text", required: true },
                { label: "License Number", key: "licenseNumber", type: "text" },
                { label: "Phone", key: "phone", type: "tel" },
                { label: "Email", key: "email", type: "email" },
                { label: "Start Time", key: "startTime", type: "time" },
                { label: "End Time", key: "endTime", type: "time" },
              ].map(({ label, key, type, required }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium text-foreground">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string | number>)[key] as string}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required={required}
                    data-testid={`input-doctor-${key}`}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Specialty</label>
                <select
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                  data-testid="select-doctor-specialty"
                >
                  <option value="">Select specialty...</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Slot Duration (min)</label>
                <select
                  value={form.slotDurationMinutes}
                  onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="select-slot-duration"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-foreground">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  data-testid="input-doctor-bio"
                />
              </div>
              <div className="col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                  data-testid="button-save-doctor"
                >
                  {createMut.isPending ? "Saving..." : "Add Doctor"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Stethoscope className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No doctors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doctor) => (
              <div key={doctor.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group" data-testid={`doctor-card-${doctor.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => deleteMut.mutate({ id: doctor.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListDoctorsQueryKey({ tenantId: TENANT_ID }) }) })}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                      data-testid={`button-delete-doctor-${doctor.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <Link href={`/doctors/${doctor.id}`}>
                      <button className="p-1.5 text-muted-foreground hover:text-primary rounded-lg transition-colors" data-testid={`button-view-doctor-${doctor.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">{doctor.name}</h3>
                <p className="text-sm text-primary font-medium mt-0.5">{doctor.specialty}</p>
                {doctor.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doctor.bio}</p>}
                <div className="mt-3 space-y-1">
                  {doctor.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {doctor.phone}
                    </div>
                  )}
                  {doctor.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {doctor.email}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {doctor.startTime} — {doctor.endTime} ({doctor.slotDurationMinutes}min slots)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
