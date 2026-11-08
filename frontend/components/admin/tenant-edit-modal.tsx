"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Tenant, UpdateTenantDto } from "@/lib/api";
import { useUpdateTenant } from "@/hooks/use-tenants";
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
import { CustomSelect } from "@/components/ui/custom-select";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, type SubmitNotice } from "@/lib/submit-error";
import { SquarePen } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

interface TenantFormState {
  name: string;
  contactEmail: string;
  contactPhone: string;
  status: "active" | "inactive";
}

function toFormState(tenant: Tenant): TenantFormState {
  return {
    name: tenant.name,
    contactEmail: tenant.contactEmail ?? "",
    contactPhone: tenant.contactPhone ?? "",
    status: tenant.status,
  };
}

const EMPTY_FORM: TenantFormState = { name: "", contactEmail: "", contactPhone: "", status: "active" };

/**
 * Modal reutilizado por app/admin (listado de negocios) y
 * app/admin/negocios/[id] (detalle) para editar los datos de un Tenant.
 */
export function TenantEditModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Tenant | null;
  onClose: () => void;
  onSaved: (updated: Tenant) => void;
}) {
  const updateTenantMutation = useUpdateTenant();
  const [form, setForm] = useState<TenantFormState>(EMPTY_FORM);
  const saving = updateTenantMutation.isPending;
  const [error, setError] = useState<SubmitNotice | null>(null);

  useEffect(() => {
    if (tenant) {
      // Sincroniza el formulario con el tenant recibido al abrir el modal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(toFormState(tenant));
      setError(null);
    }
  }, [tenant]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    if (!form.name.trim()) {
      setError(errorNotice("El nombre del negocio es obligatorio."));
      return;
    }
    setError(null);
    try {
      const data: UpdateTenantDto = {
        name: form.name.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        status: form.status,
      };
      const updated = await updateTenantMutation.mutateAsync({ id: tenant.id, data });
      onSaved(updated);
    } catch (err) {
      // En conflicto o resultado no confirmado dejamos el modal abierto con el
      // aviso; el padre refrescará el listado al cerrarlo.
      setError(describeSubmitError(err));
    }
  }

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => { if (!saving && !v) onClose(); }}>
      <DialogContent
        className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium"
        style={{ backdropFilter: "blur(20px)" }}
      >
        <div className="h-1 w-full bg-primary" />
        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                <SquarePen className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold text-text-primary">
                Editar Negocio
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-text-muted">
              {tenant?.name} · modificando datos del negocio
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tenant-edit-name">Nombre del negocio *</Label>
              <Input
                id="tenant-edit-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Parqueadero Central"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant-edit-email">Email de contacto</Label>
                <Input
                  id="tenant-edit-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="contacto@negocio.com"
                />
              </div>
              <div>
                <Label htmlFor="tenant-edit-phone">Teléfono de contacto</Label>
                <Input
                  id="tenant-edit-phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  placeholder="300 123 4567"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tenant-edit-status">Estado</Label>
              <CustomSelect
                value={form.status}
                onChange={(v) => setForm((p) => ({ ...p, status: v as "active" | "inactive" }))}
                options={STATUS_OPTIONS}
              />
            </div>

            <NoticeBox notice={error} />

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1 justify-center" disabled={saving} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 justify-center" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
