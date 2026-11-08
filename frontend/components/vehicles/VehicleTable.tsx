"use client";

import type { Vehicle } from "@/lib/api";
import { UserPlus, CircleMinus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { vehicleTypeLabel, vehicleStatusConfig, membershipStatusConfig, formatDate } from "./config";

function VehiclePlate({ v }: { v: Vehicle }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider bg-primary-dim border border-primary/30 text-primary font-mono">
      {v.plate}
    </span>
  );
}

function VehicleOwner({ v }: { v: Vehicle }) {
  if (!v.client) return <span className="text-sm text-text-dim">Sin asignar</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
        {v.client.fullName.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-white">{v.client.fullName}</span>
    </div>
  );
}

function VehicleStatusBadge({ v }: { v: Vehicle }) {
  const vSt = vehicleStatusConfig[v.status] ?? vehicleStatusConfig.inactive;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: vSt.bg, border: `1px solid ${vSt.border}`, color: vSt.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: vSt.dot }} />
      {vSt.label}
    </span>
  );
}

function VehicleMembershipBadge({ v }: { v: Vehicle }) {
  const mKey = (v.membership?.status ?? "none") as keyof typeof membershipStatusConfig;
  const mSt = membershipStatusConfig[mKey] ?? membershipStatusConfig.none;
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: mSt.bg, border: `1px solid ${mSt.border}`, color: mSt.color }}>
      {mSt.label}
    </span>
  );
}

function VehicleActions({ v, onAssign, onDelete }: { v: Vehicle; onAssign: (v: Vehicle) => void; onDelete: (v: Vehicle) => void }) {
  return (
    <>
      <button onClick={() => onAssign(v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition duration-200 bg-page-subtle border border-border-medium text-text-muted"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-input)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
        <UserPlus className="w-4 h-4" />
        Asignar
      </button>
      <button onClick={() => onDelete(v)} title="Desactivar vehículo"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-danger-dim border border-destructive/20 text-destructive hover:bg-destructive/20 hover:border-destructive/40">
        <CircleMinus className="w-4 h-4" />
      </button>
    </>
  );
}

function VehicleCardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="p-4 space-y-0">
      <div className="flex items-center gap-4 px-1 pb-3 border-b border-border-soft">
        {[80, 80, 110, 110, 80, 90, 100, 80].map((w, i) => (
          <Skeleton key={i} className="h-3 rounded bg-page-input" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4" style={{ borderBottom: i < 3 ? "1px solid var(--border-row)" : "none" }}>
          <Skeleton className="h-6 w-16 rounded-lg bg-primary-dim" />
          <Skeleton className="h-3 w-14 rounded bg-page-input" />
          <Skeleton className="h-3 w-24 rounded bg-page-input" />
          <Skeleton className="h-3 w-24 rounded bg-page-input" />
          <Skeleton className="h-6 w-16 rounded-full bg-page-input" />
          <Skeleton className="h-6 w-20 rounded-full bg-page-input" />
          <Skeleton className="h-3 w-20 rounded bg-page-input" />
          <Skeleton className="h-6 w-24 rounded bg-page-input" />
        </div>
      ))}
    </div>
  );
}

export function VehicleTable({
  vehicles, emptyText, onAssign, onDelete,
}: {
  vehicles: Vehicle[];
  emptyText: string;
  onAssign: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
}) {
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm font-medium text-white mb-1">Sin vehículos</p>
        <p className="text-xs text-text-muted">{emptyText}</p>
      </div>
    );
  }
  return (
    <div>
      {/* Tabla (desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-soft">
              {["Placa", "Tipo", "Marca / Color", "Propietario", "Estado", "Mensualidad", "Vencimiento", ""].map((col, i) => (
                <th key={i} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, i) => (
              <tr key={v.id} className="transition-colors duration-150"
                style={{ borderBottom: i < vehicles.length - 1 ? "1px solid var(--border-row)" : "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-row-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                <td className="px-5 py-4"><VehiclePlate v={v} /></td>
                <td className="px-5 py-4">
                  <span className="text-sm text-text-secondary">{vehicleTypeLabel[v.type] ?? v.type}</span>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-white font-medium leading-tight">{v.brand || "—"}</p>
                  {v.color && <p className="text-xs mt-0.5 text-text-muted">{v.color}</p>}
                </td>
                <td className="px-5 py-4"><VehicleOwner v={v} /></td>
                <td className="px-5 py-4"><VehicleStatusBadge v={v} /></td>
                <td className="px-5 py-4"><VehicleMembershipBadge v={v} /></td>
                <td className="px-5 py-4">
                  <span className={`text-sm ${v.membership?.status === "expired" ? "text-destructive" : "text-text-muted"}`}>
                    {v.membership?.endDate ? formatDate(v.membership.endDate) : "—"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <VehicleActions v={v} onAssign={onAssign} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="md:hidden p-4 space-y-3">
        {vehicles.map((v) => (
          <div key={v.id} className="rounded-xl p-4 space-y-3 bg-page-card border border-border-default">
            <div className="flex items-start justify-between gap-3">
              <div>
                <VehiclePlate v={v} />
                <p className="text-sm text-white font-medium mt-2 leading-tight">{v.brand || "—"}</p>
                <p className="text-xs mt-0.5 text-text-muted">
                  {vehicleTypeLabel[v.type] ?? v.type}{v.color ? ` · ${v.color}` : ""}
                </p>
              </div>
              <VehicleStatusBadge v={v} />
            </div>
            <div className="space-y-2 pt-1 border-t border-border-soft">
              <VehicleCardRow label="Propietario"><VehicleOwner v={v} /></VehicleCardRow>
              <VehicleCardRow label="Mensualidad"><VehicleMembershipBadge v={v} /></VehicleCardRow>
              <VehicleCardRow label="Vencimiento">
                <span className={`text-sm ${v.membership?.status === "expired" ? "text-destructive" : "text-text-muted"}`}>
                  {v.membership?.endDate ? formatDate(v.membership.endDate) : "—"}
                </span>
              </VehicleCardRow>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <VehicleActions v={v} onAssign={onAssign} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-border-soft">
        <p className="text-xs text-text-dim">
          {vehicles.length} vehículo{vehicles.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
