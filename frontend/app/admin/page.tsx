"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createUser, type Tenant } from "@/lib/api";
import { useTenants, useCreateTenant, useDeactivateTenant } from "@/hooks/use-tenants";
import { invalidateAfter } from "@/lib/query-invalidation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/status-badge";
import { TenantEditModal } from "@/components/admin/tenant-edit-modal";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, isUnconfirmed, type SubmitNotice } from "@/lib/submit-error";
import { Plus, AlertCircle, Building, Users, SquarePen, CircleMinus, Trash2, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

interface CreateFormState {
  name: string;
  contactEmail: string;
  contactPhone: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  adminFullName: "",
  adminEmail: "",
  adminPassword: "",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  // Backend interceptor returns "DD/MM/YYYY HH:mm:ss"
  const datePart = dateStr.split(" ")[0];
  if (datePart?.includes("/")) return datePart;
  // Fallback for raw ISO strings
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-0">
      <div className="flex items-center gap-4 px-1 pb-3 border-b border-border-soft">
        {[160, 140, 120, 90, 80].map((w, i) => (
          <Skeleton key={i} className="h-3 rounded bg-page-input" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4" style={{ borderBottom: i < 4 ? "1px solid var(--border-row)" : "none" }}>
          <div className="flex items-center gap-3" style={{ minWidth: 160 }}>
            <Skeleton className="w-8 h-8 rounded-full bg-page-input" />
            <Skeleton className="h-3 w-32 rounded bg-page-input" />
          </div>
          <Skeleton className="h-3 w-36 rounded bg-page-input" />
          <Skeleton className="h-3 w-24 rounded bg-page-input" />
          <Skeleton className="h-6 w-16 rounded-full bg-page-input" />
          <Skeleton className="h-3 w-20 rounded bg-page-input" />
        </div>
      ))}
    </div>
  );
}

export default function AdminNegociosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const tenantsQuery = useTenants();
  const createTenantMutation = useCreateTenant();
  const deactivateTenantMutation = useDeactivateTenant();
  const tenants = tenantsQuery.data ?? [];
  const loading = tenantsQuery.isLoading;
  const error = tenantsQuery.isError ? "No se pudo conectar con el servidor." : null;

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [createStep, setCreateStep] = useState<"form" | "success">("form");
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<SubmitNotice | null>(null);

  // Edit modal (shared component)
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<Tenant | null>(null);
  const deactivating = deactivateTenantMutation.isPending;
  const [deactivateError, setDeactivateError] = useState<SubmitNotice | null>(null);

  function openCreateModal() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateStep("form");
    setCreatedTenant(null);
    setCreateError(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateStep("form");
    setCreatedTenant(null);
    setCreateError(null);
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError(errorNotice("El nombre del negocio es obligatorio."));
      return;
    }
    if (!createdTenant) {
      if (!createForm.adminFullName.trim() || !createForm.adminEmail.trim() || !createForm.adminPassword) {
        setCreateError(errorNotice("Nombre, email y contraseña del administrador son obligatorios."));
        return;
      }
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      // Si un intento previo ya creó el negocio pero falló al crear el usuario,
      // no lo volvemos a crear — solo reintentamos el usuario administrador.
      let tenant = createdTenant;
      if (!tenant) {
        tenant = await createTenantMutation.mutateAsync({
          name: createForm.name.trim(),
          contactEmail: createForm.contactEmail.trim() || undefined,
          contactPhone: createForm.contactPhone.trim() || undefined,
        });
        setCreatedTenant(tenant);
      }
      await createUser({
        tenantId: tenant.id,
        role: "business_admin",
        fullName: createForm.adminFullName.trim(),
        email: createForm.adminEmail.trim(),
        password: createForm.adminPassword,
      });
      setCreateStep("success");
    } catch (err) {
      setCreateError(describeSubmitError(err));
      // Error de red/timeout: la operación pudo completarse; refrescamos la
      // lista para que el usuario verifique antes de reintentar (evita duplicar).
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "createTenant", 0);
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setDeactivateError(null);
    try {
      await deactivateTenantMutation.mutateAsync(deactivateTarget.id);
      setDeactivateTarget(null);
    } catch (err) {
      setDeactivateError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "deactivateTenant", deactivateTarget.id);
    }
  }

  return (
    <div className="px-4 py-5 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Negocios</h1>
          <p className="text-sm text-text-secondary">
            Administra los negocios que usan AxPark y sus cuentas de acceso
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Crear negocio
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 bg-danger-dim border border-destructive/30 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="rounded-2xl overflow-hidden bg-page-card border border-border-default" style={{ backdropFilter: "blur(12px)" }}>
        {loading ? (
          <TableSkeleton />
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-primary-dim">
              <Building className="w-8 h-8 text-primary" />
            </div>
            <p className="font-semibold mb-1 text-text-primary">Sin negocios registrados</p>
            <p className="text-sm text-text-muted">Crea el primer negocio con el botón superior</p>
          </div>
        ) : (
          <div>
            {/* Tabla (desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-soft">
                    {["Negocio", "Contacto", "Estado", "Creado", ""].map((col) => (
                      <th key={col} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t, i) => (
                    <tr
                      key={t.id}
                      className="transition-colors duration-150 cursor-pointer"
                      style={{ borderBottom: i < tenants.length - 1 ? "1px solid var(--border-row)" : "none" }}
                      onClick={() => router.push(`/admin/negocios/${t.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-row-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium leading-tight text-text-primary">{t.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-text-secondary">{t.contactEmail || "—"}</p>
                        {t.contactPhone && <p className="text-xs mt-0.5 text-text-muted">{t.contactPhone}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-text-muted">{formatDate(t.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/negocios/${t.id}`)}
                            title="Ver usuarios"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition duration-200 bg-page-subtle border border-border-medium text-text-muted"
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-input)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >
                            <Users className="w-3.5 h-3.5" />
                            Usuarios
                          </button>
                          <button
                            onClick={() => setEditTarget(t)}
                            title="Editar negocio"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-primary-dim border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40"
                          >
                            <SquarePen className="w-3.5 h-3.5" />
                          </button>
                          {t.status === "active" && (
                            <button
                              onClick={() => { setDeactivateError(null); setDeactivateTarget(t); }}
                              title="Desactivar negocio"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-danger-dim border border-destructive/20 text-destructive hover:bg-destructive/20 hover:border-destructive/40"
                            >
                              <CircleMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (móvil) */}
            <div className="md:hidden p-4 space-y-3">
              {tenants.map((t) => (
                <div key={t.id} onClick={() => router.push(`/admin/negocios/${t.id}`)}
                  className="rounded-xl p-4 space-y-3 cursor-pointer bg-page-card border border-border-default">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate text-text-primary">{t.name}</p>
                        <p className="text-xs mt-0.5 truncate text-text-muted">{t.contactEmail || "—"}</p>
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="space-y-2 pt-1 border-t border-border-soft">
                    {t.contactPhone && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Teléfono</span>
                        <span className="text-sm text-right text-text-secondary">{t.contactPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Creado</span>
                      <span className="text-sm text-right text-text-muted">{formatDate(t.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/admin/negocios/${t.id}`)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition duration-200 bg-page-subtle border border-border-medium text-text-muted"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Usuarios
                    </button>
                    <button
                      onClick={() => setEditTarget(t)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-primary-dim border border-primary/20 text-primary"
                    >
                      <SquarePen className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    {t.status === "active" && (
                      <button
                        onClick={() => { setDeactivateError(null); setDeactivateTarget(t); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-danger-dim border border-destructive/20 text-destructive"
                      >
                        <CircleMinus className="w-3.5 h-3.5" />
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-border-soft">
              <p className="text-xs text-text-dim">{tenants.length} negocio{tenants.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal (shared) */}
      <TenantEditModal
        tenant={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => setEditTarget(null)}
      />

      {/* Deactivate confirmation drawer */}
      <Sheet open={!!deactivateTarget} onClose={() => { if (!deactivating) setDeactivateTarget(null); }}>
        {deactivateTarget && (
          <>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-dim border border-destructive/30">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">¿Desactivar este negocio?</h2>
                <p className="text-xs mt-0.5 text-text-muted">Sus datos se conservan, no se borra nada</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-4 p-3 rounded-xl bg-danger-dim border border-destructive/15">
                <p className="text-sm font-medium mb-1 text-text-primary">{deactivateTarget.name}</p>
                <p className="text-xs text-destructive">
                  Sus usuarios seguirán existiendo pero el negocio quedará marcado como inactivo. Puedes reactivarlo luego editando su estado.
                </p>
              </div>
              <NoticeBox notice={deactivateError} />
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
              <Button type="button" variant="outline" className="flex-1 justify-center" disabled={deactivating} onClick={() => setDeactivateTarget(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" className="flex-1 justify-center" disabled={deactivating} onClick={handleDeactivate}>
                {deactivating ? "Desactivando..." : "Sí, desactivar"}
              </Button>
            </div>
          </>
        )}
      </Sheet>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!createSaving && !v) closeCreateModal(); }}>
        <DialogContent
          className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium"
          style={{ backdropFilter: "blur(20px)" }}
        >
          <div className="h-1 w-full bg-primary" />
          <div className="p-6">
            {createStep === "success" ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-ok-dim border border-ok/30">
                  <Check className="w-7 h-7 text-ok" />
                </div>
                <h2 className="text-lg font-bold mb-1 text-text-primary">Negocio creado</h2>
                <p className="text-sm mb-6 text-text-secondary">
                  Credenciales enviadas a <strong className="text-text-primary">{createForm.adminEmail}</strong>.
                  El administrador ya puede iniciar sesión con ese correo y la contraseña asignada.
                </p>
                <Button className="w-full justify-center" onClick={closeCreateModal}>Listo</Button>
              </div>
            ) : (
              <>
                <DialogHeader className="mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <DialogTitle className="text-lg font-bold text-text-primary">Nuevo Negocio</DialogTitle>
                  </div>
                  <DialogDescription className="text-sm text-text-muted">
                    Registra el negocio y su primera cuenta de administrador.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateSubmit} className="space-y-5">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">Datos del negocio</p>
                    <div>
                      <Label htmlFor="create-name">Nombre del negocio *</Label>
                      <Input
                        id="create-name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Ej. Parqueadero Central"
                        disabled={!!createdTenant}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="create-email">Email de contacto</Label>
                        <Input
                          id="create-email"
                          type="email"
                          value={createForm.contactEmail}
                          onChange={(e) => setCreateForm((p) => ({ ...p, contactEmail: e.target.value }))}
                          placeholder="contacto@negocio.com"
                          disabled={!!createdTenant}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-phone">Teléfono de contacto</Label>
                        <Input
                          id="create-phone"
                          type="tel"
                          value={createForm.contactPhone}
                          onChange={(e) => setCreateForm((p) => ({ ...p, contactPhone: e.target.value }))}
                          placeholder="300 123 4567"
                          disabled={!!createdTenant}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-1 border-t border-border-soft">
                    <p className="text-xs font-semibold uppercase tracking-wider pt-4 text-text-dim">Administrador inicial</p>
                    <div>
                      <Label htmlFor="create-admin-name">Nombre completo *</Label>
                      <Input
                        id="create-admin-name"
                        value={createForm.adminFullName}
                        onChange={(e) => setCreateForm((p) => ({ ...p, adminFullName: e.target.value }))}
                        placeholder="Ej. María Gómez"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-admin-email">Email *</Label>
                      <Input
                        id="create-admin-email"
                        type="email"
                        value={createForm.adminEmail}
                        onChange={(e) => setCreateForm((p) => ({ ...p, adminEmail: e.target.value }))}
                        placeholder="admin@negocio.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-admin-password">Contraseña *</Label>
                      <Input
                        id="create-admin-password"
                        type="password"
                        autoComplete="new-password"
                        value={createForm.adminPassword}
                        onChange={(e) => setCreateForm((p) => ({ ...p, adminPassword: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <NoticeBox notice={createError} />

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1 justify-center" disabled={createSaving} onClick={closeCreateModal}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 justify-center" disabled={createSaving}>
                      {createSaving ? "Creando..." : "Crear negocio"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
