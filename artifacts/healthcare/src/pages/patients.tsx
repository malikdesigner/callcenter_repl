import { useState } from "react";
import { Link } from "wouter";
import { useListPatients, getListPatientsQueryKey, useCreatePatient, useDeletePatient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Users, Plus, Search, Phone, Mail, Droplets, ChevronRight, Trash2, User } from "lucide-react";

const TENANT_ID = 1;
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PatientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", dateOfBirth: "", bloodType: "", address: "", notes: "" });

  const params = { tenantId: TENANT_ID, ...(search ? { search } : {}) };
  const { data: patients, isLoading } = useListPatients(params, {
    query: { queryKey: getListPatientsQueryKey(params) }
  });

  const createMut = useCreatePatient();
  const deleteMut = useDeletePatient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ data: { ...form, tenantId: TENANT_ID } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPatientsQueryKey({ tenantId: TENANT_ID }) });
        setShowForm(false);
        setForm({ name: "", email: "", phone: "", dateOfBirth: "", bloodType: "", address: "", notes: "" });
      }
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patients</h1>
            <p className="text-muted-foreground text-sm mt-1">{(patients ?? []).length} patients registered</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            data-testid="button-add-patient"
          >
            <Plus className="h-4 w-4" />
            Register Patient
          </button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="input-search-patient"
          />
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Register New Patient</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { label: "Full Name", key: "name", type: "text", required: true },
                { label: "Email", key: "email", type: "email" },
                { label: "Phone", key: "phone", type: "tel" },
                { label: "Date of Birth", key: "dateOfBirth", type: "date" },
              ].map(({ label, key, type, required }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium text-foreground">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required={required}
                    data-testid={`input-patient-${key}`}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Blood Type</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="select-blood-type"
                >
                  <option value="">Unknown</option>
                  {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-patient-address"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-foreground">Medical Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  data-testid="input-patient-notes"
                />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={createMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60" data-testid="button-save-patient">
                  {createMut.isPending ? "Registering..." : "Register Patient"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-36 animate-pulse" />
            ))}
          </div>
        ) : (patients ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No patients found</p>
            <p className="text-sm mt-1">Register your first patient to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(patients ?? []).map((patient) => (
              <div key={patient.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group" data-testid={`patient-card-${patient.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => deleteMut.mutate({ id: patient.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListPatientsQueryKey({ tenantId: TENANT_ID }) }) })}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                      data-testid={`button-delete-patient-${patient.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <Link href={`/patients/${patient.id}`}>
                      <button className="p-1.5 text-muted-foreground hover:text-primary rounded-lg transition-colors" data-testid={`button-view-patient-${patient.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">{patient.name}</h3>
                {patient.dateOfBirth && <p className="text-xs text-muted-foreground mt-0.5">DOB: {patient.dateOfBirth}</p>}
                <div className="mt-3 space-y-1">
                  {patient.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{patient.phone}</div>}
                  {patient.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{patient.email}</div>}
                  {patient.bloodType && <div className="flex items-center gap-1.5 text-xs font-medium text-red-600"><Droplets className="h-3 w-3" />{patient.bloodType}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
