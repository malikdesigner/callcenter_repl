import { useState } from "react";
import { useListTenants, getListTenantsQueryKey, useCreateTenant } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Building, Plus, Phone, Mail, MapPin, Globe } from "lucide-react";

export default function TenantsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", address: "", phone: "", email: "" });

  const { data: tenants, isLoading } = useListTenants({
    query: { queryKey: getListTenantsQueryKey() }
  });

  const createMut = useCreateTenant();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ data: form }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        setShowForm(false);
        setForm({ name: "", slug: "", address: "", phone: "", email: "" });
      }
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hospitals & Clinics</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your healthcare organization tenants</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            data-testid="button-add-tenant"
          >
            <Plus className="h-4 w-4" />
            Add Organization
          </button>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">Add New Organization</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { label: "Organization Name", key: "name", required: true },
                { label: "URL Slug", key: "slug", required: true },
                { label: "Address", key: "address" },
                { label: "Phone", key: "phone" },
                { label: "Email", key: "email" },
              ].map(({ label, key, required }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium text-foreground">{label}</label>
                  <input
                    type="text"
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required={required}
                    data-testid={`input-tenant-${key}`}
                  />
                </div>
              ))}
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={createMut.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60" data-testid="button-save-tenant">
                  {createMut.isPending ? "Creating..." : "Create Organization"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : (tenants ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No organizations yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(tenants ?? []).map((tenant) => (
              <div key={tenant.id} className="bg-card border border-border rounded-xl p-5" data-testid={`tenant-card-${tenant.id}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Globe className="h-3 w-3" />
                      {tenant.slug}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {tenant.address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{tenant.address}</div>}
                  {tenant.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" />{tenant.phone}</div>}
                  {tenant.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" />{tenant.email}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
