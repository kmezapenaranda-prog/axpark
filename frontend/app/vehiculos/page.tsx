"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Vehicle } from "@/lib/api";
import { AlertCircle, Users, User, Trash2, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { NoticeBox } from "@/components/ui/notice-box";
import { Dialog } from "@/components/ui/dialog";
import { describeSubmitError, isUnconfirmed, type SubmitNotice } from "@/lib/submit-error";
import { vehicleTypeLabel } from "@/components/vehicles/config";
import { VehicleTable, TableSkeleton } from "@/components/vehicles/VehicleTable";
import { VehicleFilters } from "@/components/vehicles/VehicleFilters";
import { VehicleStats } from "@/components/vehicles/VehicleStats";
import { VehicleWizardModal } from "@/components/vehicles/VehicleWizardModal";
import { AddVehicleModal } from "@/components/vehicles/AddVehicleModal";
import { useVehicles, useDeleteVehicle } from "@/hooks/use-vehicles";
import { useClients } from "@/hooks/use-clients";
import { invalidateAfter } from "@/lib/query-invalidation";
import { Sheet } from "@/components/ui/sheet";

export default function VehiculosPage() {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const queryClient = useQueryClient();

  const vehiclesQuery = useVehicles(tenantId);
  const clientsQuery = useClients(tenantId);
  const deleteVehicleMutation = useDeleteVehicle(tenantId);

  const vehicles = vehiclesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const loading = vehiclesQuery.isLoading || clientsQuery.isLoading;
  const error =
    vehiclesQuery.isError || clientsQuery.isError
      ? "No se pudo conectar con el servidor."
      : null;

  const [search, setSearch]           = useState("");
  const [assignTarget, setAssignTarget] = useState<Vehicle | null>(null);
  const [addOpen, setAddOpen]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleteError, setDeleteError] = useState<SubmitNotice | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteVehicleMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(describeSubmitError(err));
      if (isUnconfirmed(err)) {
        invalidateAfter(queryClient, "deleteVehicle", tenantId);
      }
    }
  }

  const matchesSearch = (v: Vehicle) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.plate.toLowerCase().includes(q) ||
      (v.client?.fullName ?? "").toLowerCase().includes(q) ||
      (v.brand ?? "").toLowerCase().includes(q)
    );
  };

  const registered = vehicles.filter((v) => v.client != null);
  const visitors   = vehicles.filter((v) => v.client == null);
  const filteredRegistered = registered.filter(matchesSearch);
  const filteredVisitors   = visitors.filter(matchesSearch);

  const stats = {
    registered:     registered.length,
    visitors:       visitors.length,
    withMembership: vehicles.filter((v) => v.membership?.status === "active").length,
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Vehículos</h1>
          <p className="text-sm text-text-secondary">Consulta y gestiona los vehículos registrados</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 cursor-pointer bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4" />
          Nuevo Vehículo
        </button>
      </div>

      {/* Stats */}
      {!loading && vehicles.length > 0 && (
        <VehicleStats stats={stats} />
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 bg-danger-dim border border-destructive/30 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <VehicleFilters search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="space-y-6"><TableSkeleton /><TableSkeleton /></div>
      ) : (
        <div className="space-y-8">

          {/* Registrados */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-dim border border-primary/25">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-white leading-tight">Vehículos Registrados</h2>
                <p className="text-xs text-text-muted">Tienen cliente asignado</p>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-dim border border-primary/25 text-primary">
                {search ? `${filteredRegistered.length} / ${registered.length}` : registered.length}
              </span>
            </div>
            <div className="rounded-2xl overflow-hidden bg-page-card backdrop-blur border border-border-default">
              <VehicleTable
                vehicles={filteredRegistered}
                emptyText={search ? `No hay vehículos registrados que coincidan con "${search}"` : "No hay vehículos con cliente asignado"}
                onAssign={(v) => setAssignTarget(v)}
                onDelete={(v) => { setDeleteError(null); setDeleteTarget(v); }}
              />
            </div>
          </section>

          {/* Visitantes */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-page-subtle border border-border-medium">
                <User className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-white leading-tight">Vehículos Visitantes / Ocasionales</h2>
                <p className="text-xs text-text-muted">Sin cliente asignado · Usa Asignar para iniciar el registro</p>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-page-subtle border border-border-medium text-text-secondary">
                {search ? `${filteredVisitors.length} / ${visitors.length}` : visitors.length}
              </span>
            </div>
            <div className="rounded-2xl overflow-hidden bg-page-card backdrop-blur border border-border-default">
              <VehicleTable
                vehicles={filteredVisitors}
                emptyText={search ? `No hay visitantes que coincidan con "${search}"` : "No hay vehículos sin cliente asignado"}
                onAssign={(v) => setAssignTarget(v)}
                onDelete={(v) => { setDeleteError(null); setDeleteTarget(v); }}
              />
            </div>
          </section>
        </div>
      )}

      {/* ── Nuevo Vehículo ── */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) setAddOpen(false); }}>
        {addOpen && (
          <AddVehicleModal
            clients={clients}
            tenantId={tenantId}
            onCancel={() => setAddOpen(false)}
            onDone={() => setAddOpen(false)}
          />
        )}
      </Dialog>

      {/* ── VehicleWizardModal ── */}
      {assignTarget && (
        <VehicleWizardModal
          vehicle={assignTarget}
          clients={clients}
          tenantId={tenantId}
          onClose={() => setAssignTarget(null)}
          onDone={() => setAssignTarget(null)}
        />
      )}

      {/* ── Delete confirm drawer ── */}
      <Sheet open={!!deleteTarget} onClose={() => { if (!deleteVehicleMutation.isPending) setDeleteTarget(null); }}>
        {deleteTarget && (
          <>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-dim border border-destructive/30">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">¿Desactivar este vehículo?</h2>
                <p className="text-xs mt-0.5 text-text-muted">Sus datos se conservan, no se borra nada</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-4 p-3 rounded-xl bg-danger-dim border border-destructive/15">
                <p className="text-sm font-bold tracking-wider font-mono text-text-primary">{deleteTarget.plate}</p>
                <p className="text-xs mt-0.5 text-text-secondary">
                  {vehicleTypeLabel[deleteTarget.type] ?? deleteTarget.type}{deleteTarget.brand ? ` · ${deleteTarget.brand}` : ""}
                </p>
                <p className="text-xs mt-2 text-destructive">También se desactivarán sus mensualidades. Dejará de aparecer en los listados, pero la información queda guardada.</p>
              </div>
              <NoticeBox notice={deleteError} />
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteVehicleMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleteVehicleMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 text-white bg-destructive">
                {deleteVehicleMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Desactivando...</>
                ) : "Sí, desactivar"}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
