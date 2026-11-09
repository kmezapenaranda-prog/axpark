"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { AppUser } from "@/lib/api";
import { useTenant } from "@/hooks/use-tenants";
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser } from "@/hooks/use-users";
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
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusBadge } from "@/components/admin/status-badge";
import { TenantEditModal } from "@/components/admin/tenant-edit-modal";
import { NoticeBox } from "@/components/ui/notice-box";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { DetectorsSection } from "@/components/detectors/detectors-section";
import { describeSubmitError, errorNotice, isUnconfirmed, type SubmitNotice } from "@/lib/submit-error";
import { ChevronLeft, AlertCircle, SquarePen, Plus, CircleMinus, UserPlus, Trash2, KeyRound } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

type BusinessRole = "business_admin" | "operator";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Admin de plataforma",
  business_admin: "Admin del negocio",
  operator: "Operador",
};

const ROLE_OPTIONS = [
  { value: "business_admin", label: "Admin del negocio" },
  { value: "operator", label: "Operador" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

interface CreateUserFormState {
  fullName: string;
  email: string;
  password: string;
  role: BusinessRole;
}

const EMPTY_CREATE_USER: CreateUserFormState = { fullName: "", email: "", password: "", role: "operator" };

interface EditUserFormState {
  fullName: string;
  role: BusinessRole;
  status: "active" | "inactive";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const datePart = dateStr.split(" ")[0];
  if (datePart?.includes("/")) return datePart;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-0">
      <div className="flex items-center gap-4 px-1 pb-3 border-b border-border-soft">
        {[160, 140, 110, 80, 90].map((w, i) => (
          <Skeleton key={i} className="h-3 rounded bg-page-input" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4" style={{ borderBottom: i < 2 ? "1px solid var(--border-row)" : "none" }}>
          <Skeleton className="h-3 w-40 rounded bg-page-input" />
          <Skeleton className="h-3 w-32 rounded bg-page-input" />
          <Skeleton className="h-6 w-24 rounded-full bg-page-input" />
          <Skeleton className="h-6 w-16 rounded-full bg-page-input" />
          <Skeleton className="h-3 w-20 rounded bg-page-input" />
        </div>
      ))}
    </div>
  );
}

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = Number(params?.id);
  const queryClient = useQueryClient();

  const tenantQuery = useTenant(Number.isFinite(tenantId) ? tenantId : undefined);
  const usersQuery = useUsers(Number.isFinite(tenantId) ? tenantId : undefined);
  const createUserMutation = useCreateUser(tenantId);
  const updateUserMutation = useUpdateUser(tenantId);
  const deactivateUserMutation = useDeactivateUser(tenantId);

  const tenant = tenantQuery.data ?? null;
  const users = usersQuery.data ?? [];
  const loading = tenantQuery.isLoading || usersQuery.isLoading;
  const error = !Number.isFinite(tenantId)
    ? "Negocio inválido."
    : tenantQuery.isError || usersQuery.isError
      ? "No se pudo conectar con el servidor."
      : null;

  const [editTenantOpen, setEditTenantOpen] = useState(false);

  // Create user modal
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>(EMPTY_CREATE_USER);
  const createUserSaving = createUserMutation.isPending;
  const [createUserError, setCreateUserError] = useState<SubmitNotice | null>(null);

  // Edit user modal
  const [editUserTarget, setEditUserTarget] = useState<AppUser | null>(null);
  const [editUserForm, setEditUserForm] = useState<EditUserFormState>({ fullName: "", role: "operator", status: "active" });
  const editUserSaving = updateUserMutation.isPending;
  const [editUserError, setEditUserError] = useState<SubmitNotice | null>(null);

  // Deactivate user confirm
  const [resetUserTarget, setResetUserTarget] = useState<AppUser | null>(null);
  const [deactivateUserTarget, setDeactivateUserTarget] = useState<AppUser | null>(null);
  const deactivatingUser = deactivateUserMutation.isPending;
  const [deactivateUserError, setDeactivateUserError] = useState<SubmitNotice | null>(null);

  function openCreateUserModal() {
    setCreateUserForm(EMPTY_CREATE_USER);
    setCreateUserError(null);
    setCreateUserOpen(true);
  }

  function closeCreateUserModal() {
    setCreateUserOpen(false);
    setCreateUserForm(EMPTY_CREATE_USER);
    setCreateUserError(null);
  }

  async function handleCreateUserSubmit(e: FormEvent) {
    e.preventDefault();
    if (!createUserForm.fullName.trim() || !createUserForm.email.trim() || !createUserForm.password) {
      setCreateUserError(errorNotice("Nombre, email y contraseña son obligatorios."));
      return;
    }
    setCreateUserError(null);
    try {
      await createUserMutation.mutateAsync({
        tenantId,
        role: createUserForm.role,
        fullName: createUserForm.fullName.trim(),
        email: createUserForm.email.trim(),
        password: createUserForm.password,
      });
      closeCreateUserModal();
    } catch (err) {
      setCreateUserError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "createUser", tenantId);
    }
  }

  function openEditUser(u: AppUser) {
    setEditUserTarget(u);
    setEditUserForm({
      fullName: u.fullName,
      role: (u.role === "platform_admin" ? "business_admin" : u.role) as BusinessRole,
      status: u.status,
    });
    setEditUserError(null);
  }

  async function handleEditUserSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editUserTarget) return;
    if (!editUserForm.fullName.trim()) {
      setEditUserError(errorNotice("El nombre completo es obligatorio."));
      return;
    }
    setEditUserError(null);
    try {
      await updateUserMutation.mutateAsync({
        id: editUserTarget.id,
        data: { fullName: editUserForm.fullName.trim(), role: editUserForm.role, status: editUserForm.status },
      });
      setEditUserTarget(null);
    } catch (err) {
      setEditUserError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "updateUser", tenantId);
    }
  }

  async function handleDeactivateUser() {
    if (!deactivateUserTarget) return;
    setDeactivateUserError(null);
    try {
      await deactivateUserMutation.mutateAsync(deactivateUserTarget.id);
      setDeactivateUserTarget(null);
    } catch (err) {
      setDeactivateUserError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "deactivateUser", tenantId);
    }
  }

  return (
    <div className="px-4 py-5 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 cursor-pointer transition-colors text-text-muted"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Volver a negocios
      </Link>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 bg-danger-dim border border-destructive/30 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 bg-page-card border border-border-default">
            <Skeleton className="h-5 w-48 rounded mb-3 bg-page-input" />
            <Skeleton className="h-3 w-64 rounded bg-page-input" />
          </div>
          <div className="rounded-2xl overflow-hidden bg-page-card border border-border-default">
            <TableSkeleton />
          </div>
        </div>
      ) : !tenant ? null : (
        <>
          {/* Tenant info card */}
          <div
            className="rounded-2xl p-6 mb-8 flex flex-wrap items-start justify-between gap-4 bg-page-card border border-border-default"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 bg-primary text-primary-foreground">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-text-primary">{tenant.name}</h1>
                  <StatusBadge status={tenant.status} />
                </div>
                <p className="text-sm mt-1 text-text-secondary">
                  {tenant.contactEmail || "Sin email de contacto"}
                  {tenant.contactPhone ? ` · ${tenant.contactPhone}` : ""}
                </p>
                <p className="text-xs mt-1 text-text-muted">Creado el {formatDate(tenant.createdAt)}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setEditTenantOpen(true)} className="flex-shrink-0">
              <SquarePen className="w-4 h-4" />
              Editar
            </Button>
          </div>

          {/* Users section */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Usuarios</h2>
              <p className="text-sm text-text-secondary">Cuentas de acceso de este negocio</p>
            </div>
            <Button onClick={openCreateUserModal}>
              <Plus className="w-4 h-4" />
              Crear usuario
            </Button>
          </div>

          <div className="rounded-2xl overflow-hidden bg-page-card border border-border-default" style={{ backdropFilter: "blur(12px)" }}>
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="font-semibold mb-1 text-text-primary">Sin usuarios</p>
                <p className="text-sm text-text-muted">Crea el primer usuario con el botón superior</p>
              </div>
            ) : (
              <div>
                {/* Tabla (desktop) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-soft">
                        {["Email", "Nombre", "Rol", "Estado", "Creado", ""].map((col) => (
                          <th key={col} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr
                          key={u.id}
                          style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border-row)" : "none" }}
                          className="transition-colors duration-150"
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-row-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <td className="px-5 py-4">
                            <span className="text-sm text-text-primary">{u.email}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm text-text-secondary">{u.fullName}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm text-text-secondary">{ROLE_LABELS[u.role] ?? u.role}</span>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={u.status} />
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm text-text-muted">{formatDate(u.createdAt)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditUser(u)}
                                title="Editar usuario"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-primary-dim border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40"
                              >
                                <SquarePen className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setResetUserTarget(u)}
                                title="Restablecer contraseña"
                                aria-label="Restablecer contraseña"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-primary-dim border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              {u.status === "active" && (
                                <button
                                  onClick={() => { setDeactivateUserError(null); setDeactivateUserTarget(u); }}
                                  title="Desactivar usuario"
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
                  {users.map((u) => (
                    <div key={u.id} className="rounded-xl p-4 space-y-3 bg-page-card border border-border-default">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate text-text-primary">{u.fullName}</p>
                          <p className="text-xs mt-0.5 truncate text-text-muted">{u.email}</p>
                        </div>
                        <StatusBadge status={u.status} />
                      </div>
                        <div className="space-y-2 pt-1 border-t border-border-soft">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Rol</span>
                            <span className="text-sm text-right text-text-secondary">{ROLE_LABELS[u.role] ?? u.role}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Creado</span>
                            <span className="text-sm text-right text-text-muted">{formatDate(u.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => openEditUser(u)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-primary-dim border border-primary/20 text-primary"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => setResetUserTarget(u)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-primary-dim border border-primary/20 text-primary"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Contraseña
                        </button>
                        {u.status === "active" && (
                          <button
                            onClick={() => { setDeactivateUserError(null); setDeactivateUserTarget(u); }}
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
                  <p className="text-xs text-text-dim">{users.length} usuario{users.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
          </div>

          <DetectorsSection tenantId={tenantId} />
        </>
      )}

      {/* Edit tenant modal (shared) */}
      <TenantEditModal
        tenant={editTenantOpen ? tenant : null}
        onClose={() => setEditTenantOpen(false)}
        onSaved={() => setEditTenantOpen(false)}
      />

      {/* Create user modal */}
      <Dialog open={createUserOpen} onOpenChange={(v) => { if (!createUserSaving && !v) closeCreateUserModal(); }}>
        <DialogContent
          className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium"
          style={{ backdropFilter: "blur(20px)" }}
        >
          <div className="h-1 w-full bg-primary" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-lg font-bold text-text-primary">Nuevo Usuario</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-text-muted">
                {tenant?.name} · nueva cuenta de acceso
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <Label htmlFor="cu-name">Nombre completo *</Label>
                <Input
                  id="cu-name"
                  value={createUserForm.fullName}
                  onChange={(e) => setCreateUserForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Ej. Carlos Ruiz"
                />
              </div>
              <div>
                <Label htmlFor="cu-email">Email *</Label>
                <Input
                  id="cu-email"
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="usuario@negocio.com"
                />
              </div>
              <div>
                <Label htmlFor="cu-password">Contraseña *</Label>
                <Input
                  id="cu-password"
                  type="password"
                  autoComplete="new-password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="cu-role">Rol *</Label>
                <CustomSelect
                  value={createUserForm.role}
                  onChange={(v) => setCreateUserForm((p) => ({ ...p, role: v as BusinessRole }))}
                  options={ROLE_OPTIONS}
                  placeholder="Seleccionar rol..."
                />
              </div>

              <NoticeBox notice={createUserError} />

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1 justify-center" disabled={createUserSaving} onClick={closeCreateUserModal}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={createUserSaving}>
                  {createUserSaving ? "Creando..." : "Crear usuario"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit user modal */}
      <Dialog open={!!editUserTarget} onOpenChange={(v) => { if (!editUserSaving && !v) setEditUserTarget(null); }}>
        <DialogContent
          className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium"
          style={{ backdropFilter: "blur(20px)" }}
        >
          <div className="h-1 w-full bg-primary" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-lg font-bold text-text-primary">Editar Usuario</DialogTitle>
              <DialogDescription className="text-sm text-text-muted">
                {editUserTarget?.email}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div>
                <Label htmlFor="eu-name">Nombre completo *</Label>
                <Input
                  id="eu-name"
                  value={editUserForm.fullName}
                  onChange={(e) => setEditUserForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label htmlFor="eu-role">Rol</Label>
                <CustomSelect
                  value={editUserForm.role}
                  onChange={(v) => setEditUserForm((p) => ({ ...p, role: v as BusinessRole }))}
                  options={ROLE_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="eu-status">Estado</Label>
                <CustomSelect
                  value={editUserForm.status}
                  onChange={(v) => setEditUserForm((p) => ({ ...p, status: v as "active" | "inactive" }))}
                  options={STATUS_OPTIONS}
                />
              </div>

              <NoticeBox notice={editUserError} />

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1 justify-center" disabled={editUserSaving} onClick={() => setEditUserTarget(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={editUserSaving}>
                  {editUserSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate user confirm drawer */}
      <Sheet open={!!deactivateUserTarget} onClose={() => { if (!deactivatingUser) setDeactivateUserTarget(null); }}>
        {deactivateUserTarget && (
          <>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-dim border border-destructive/30">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">¿Desactivar este usuario?</h2>
                <p className="text-xs mt-0.5 text-text-muted">Perderá acceso al sistema, pero sus datos se conservan</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-4 p-3 rounded-xl bg-danger-dim border border-destructive/15">
                <p className="text-sm font-medium text-text-primary">{deactivateUserTarget.fullName}</p>
                <p className="text-xs text-text-secondary">{deactivateUserTarget.email}</p>
              </div>
              <NoticeBox notice={deactivateUserError} />
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
              <Button type="button" variant="outline" className="flex-1 justify-center" disabled={deactivatingUser} onClick={() => setDeactivateUserTarget(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" className="flex-1 justify-center" disabled={deactivatingUser} onClick={handleDeactivateUser}>
                {deactivatingUser ? "Desactivando..." : "Sí, desactivar"}
              </Button>
            </div>
          </>
        )}
      </Sheet>
      <ResetPasswordDialog target={resetUserTarget} onClose={() => setResetUserTarget(null)} />
    </div>
  );
}
