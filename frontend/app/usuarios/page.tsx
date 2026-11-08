"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppUser, CreateUserDto } from "@/lib/api";
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser } from "@/hooks/use-users";
import { invalidateAfter } from "@/lib/query-invalidation";
import { useAuth } from "@/components/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { NoticeBox } from "@/components/ui/notice-box";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { DetectorsSection } from "@/components/detectors/detectors-section";
import { describeSubmitError, errorNotice, isUnconfirmed, type SubmitNotice } from "@/lib/submit-error";
import { Plus, AlertCircle, Users, User, SquarePen, CircleMinus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

type CreateOperatorForm = Omit<CreateUserDto, "tenantId" | "role">;
type EditUserForm = { fullName: string; status: "active" | "inactive" };

const EMPTY_CREATE_FORM: CreateOperatorForm = { fullName: "", email: "", password: "" };

const roleLabel: Record<AppUser["role"], string> = {
  platform_admin: "Admin plataforma",
  business_admin: "Admin negocio",
  operator: "Operador",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  // Backend interceptor returns "DD/MM/YYYY HH:mm:ss"
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
        {[160, 140, 100, 90, 100, 120].map((w, i) => (
          <Skeleton key={i} className="h-3 rounded bg-page-input" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4" style={{ borderBottom: i < 3 ? "1px solid var(--border-row)" : "none" }}>
          <div className="flex items-center gap-3" style={{ minWidth: 160 }}>
            <Skeleton className="w-8 h-8 rounded-full bg-page-input" />
            <Skeleton className="h-3 w-28 rounded bg-page-input" />
          </div>
          <Skeleton className="h-3 w-32 rounded" style={{ backgroundColor: "var(--bg-input)" }} />
          <Skeleton className="h-6 w-24 rounded-full bg-page-input" />
          <Skeleton className="h-6 w-16 rounded-full bg-page-input" />
          <Skeleton className="h-3 w-20 rounded bg-page-input" />
        </div>
      ))}
    </div>
  );
}

export default function UsuariosPage() {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const queryClient = useQueryClient();
  const usersQuery = useUsers(tenantId);
  const createUserMutation = useCreateUser(tenantId);
  const updateUserMutation = useUpdateUser(tenantId);
  const deactivateUserMutation = useDeactivateUser(tenantId);

  // No mostrar al propio usuario logueado: no tiene sentido que se edite/desactive a sí mismo aquí.
  const users = (usersQuery.data ?? []).filter((u) => u.id !== session!.user.id);
  const loading = usersQuery.isLoading;
  const error = usersQuery.isError ? "No se pudo conectar con el servidor." : null;

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateOperatorForm>(EMPTY_CREATE_FORM);
  const creating = createUserMutation.isPending;
  const [createError, setCreateError] = useState<SubmitNotice | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({ fullName: "", status: "active" });
  const editSaving = updateUserMutation.isPending;
  const [editError, setEditError] = useState<SubmitNotice | null>(null);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);

  // Deactivate modal
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null);
  const deactivating = deactivateUserMutation.isPending;
  const [deactivateError, setDeactivateError] = useState<SubmitNotice | null>(null);

  function closeCreateModal() {
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.fullName || !createForm.email || !createForm.password) {
      setCreateError(errorNotice("Nombre, email y contraseña son obligatorios."));
      return;
    }
    setCreateError(null);
    try {
      await createUserMutation.mutateAsync({ ...createForm, tenantId, role: "operator" });
      closeCreateModal();
    } catch (err: unknown) {
      setCreateError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "createUser", tenantId);
    }
  }

  function openEdit(user: AppUser) {
    setEditTarget(user);
    setEditForm({ fullName: user.fullName, status: user.status });
    setEditError(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.fullName) {
      setEditError(errorNotice("El nombre completo es obligatorio."));
      return;
    }
    setEditError(null);
    try {
      await updateUserMutation.mutateAsync({ id: editTarget.id, data: editForm });
      setEditTarget(null);
    } catch (err: unknown) {
      setEditError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "updateUser", tenantId);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setDeactivateError(null);
    try {
      await deactivateUserMutation.mutateAsync(deactivateTarget.id);
      setDeactivateTarget(null);
    } catch (err: unknown) {
      setDeactivateError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "deactivateUser", tenantId);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Usuarios</h1>
          <p className="text-sm text-text-secondary">Gestiona los operadores de tu negocio</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreateForm(EMPTY_CREATE_FORM); setCreateError(null); }}>
          <Plus className="w-4 h-4" />
          Crear operador
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
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-primary-dim">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-white font-semibold mb-1">Sin usuarios</p>
            <p className="text-sm text-text-muted">Crea el primer operador con el botón superior</p>
          </div>
        ) : (
          <div>
            {/* Tabla (desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-soft">
                    {["Usuario", "Email", "Rol", "Estado", "Creado", ""].map((col) => (
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
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-white leading-tight">{u.fullName}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-text-secondary">{u.email}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="secondary">{roleLabel[u.role]}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={u.status === "active" ? "default" : "destructive"}>
                          {u.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-text-muted">{formatDate(u.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>Editar</Button>
                          <Button size="sm" variant="secondary" onClick={() => setResetTarget(u)}>Contraseña</Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={u.status === "inactive"}
                            onClick={() => { setDeactivateError(null); setDeactivateTarget(u); }}
                          >
                            Desactivar
                          </Button>
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
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white leading-tight truncate">{u.fullName}</p>
                        <p className="text-xs mt-0.5 truncate text-text-muted">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant={u.status === "active" ? "default" : "destructive"}>
                      {u.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-border-soft">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Rol</span>
                      <Badge variant="secondary">{roleLabel[u.role]}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Creado</span>
                      <span className="text-sm text-right text-text-muted">{formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>Editar</Button>
                          <Button size="sm" variant="secondary" onClick={() => setResetTarget(u)}>Contraseña</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={u.status === "inactive"}
                      onClick={() => { setDeactivateError(null); setDeactivateTarget(u); }}
                    >
                      Desactivar
                    </Button>
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

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!creating && !v) closeCreateModal(); }}>
        <DialogContent className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium"
          style={{ backdropFilter: "blur(20px)" }}>
          <div className="h-1 w-full bg-primary" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-lg font-bold text-white">Crear Operador</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-text-muted">
                El nuevo usuario podrá acceder con rol de operador (Parking, Clientes, Vehículos, Mensualidades).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="op-fullname">Nombre completo *</Label>
                <Input
                  id="op-fullname"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Ej. Carlos Gómez"
                />
              </div>
              <div>
                <Label htmlFor="op-email">Email *</Label>
                <Input
                  id="op-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="operador@negocio.com"
                />
              </div>
              <div>
                <Label htmlFor="op-password">Contraseña *</Label>
                <Input
                  id="op-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <NoticeBox notice={createError} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" className="flex-1 justify-center" disabled={creating} onClick={closeCreateModal}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={creating}>
                  {creating ? "Creando..." : "Crear Operador"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!editSaving && !v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium"
          style={{ backdropFilter: "blur(20px)" }}>
          <div className="h-1 w-full bg-primary" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                  <SquarePen className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-lg font-bold text-white">Editar Usuario</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-text-muted">
                {editTarget?.email} · el rol de operador no se puede cambiar aquí
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-fullname">Nombre completo *</Label>
                <Input
                  id="edit-fullname"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Ej. Carlos Gómez"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Estado</Label>
                <CustomSelect
                  value={editForm.status}
                  onChange={(v) => setEditForm((p) => ({ ...p, status: v as "active" | "inactive" }))}
                  options={STATUS_OPTIONS}
                />
              </div>
              <NoticeBox notice={editError} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" className="flex-1 justify-center" disabled={editSaving} onClick={() => setEditTarget(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={editSaving}>
                  {editSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <DetectorsSection tenantId={tenantId} />

      <ResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} />

      {/* Deactivate confirmation drawer */}
      <Sheet open={!!deactivateTarget} onClose={() => { if (!deactivating) setDeactivateTarget(null); }}>
        {deactivateTarget && (
          <>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-dim border border-destructive/30">
                <CircleMinus className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">¿Desactivar este usuario?</h2>
                <p className="text-xs mt-0.5 text-text-muted">Perderá acceso al sistema, pero sus datos se conservan</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-4 p-3 rounded-xl bg-danger-dim border border-destructive/15">
                <p className="text-sm text-white font-medium mb-1">{deactivateTarget.fullName}</p>
                <p className="text-xs text-text-secondary">{deactivateTarget.email}</p>
              </div>
              <NoticeBox notice={deactivateError} />
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
              <Button variant="secondary" className="flex-1 justify-center" disabled={deactivating} onClick={() => setDeactivateTarget(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 justify-center" disabled={deactivating} onClick={handleDeactivate}>
                {deactivating ? "Desactivando..." : "Sí, desactivar"}
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
