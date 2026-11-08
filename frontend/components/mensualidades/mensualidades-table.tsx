"use client";

import { type Membership } from "@/lib/api";
import { TriangleAlert, RefreshCw, CircleMinus, Calendar } from "lucide-react";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatCOP(value: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(num);
}

const vehicleTypeLabel: Record<string, string> = {
  car: "Carro",
  moto: "Moto",
  truck: "Camión",
};

const statusConfig = {
  active: {
    label: "Activa",
    bg: "var(--ok-dim)",
    border: "color-mix(in srgb, var(--ok) 45%, transparent)",
    color: "var(--ok)",
    dot: "var(--ok)",
  },
  expired: {
    label: "Vencida",
    bg: "var(--danger-dim)",
    border: "color-mix(in srgb, var(--destructive) 45%, transparent)",
    color: "var(--destructive)",
    dot: "var(--destructive)",
  },
  cancelled: {
    label: "Cancelada",
    bg: "var(--bg-subtle)",
    border: "var(--border-medium)",
    color: "var(--text-secondary)",
    dot: "var(--text-dim)",
  },
};

// --- Piezas reutilizadas por la tabla (desktop) y las tarjetas (móvil) ---

function PlateBadge({ m }: { m: Membership }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider font-mono bg-primary-dim border border-primary/30 text-primary">
      {m.vehicle?.plate ?? `#${m.vehicleId}`}
    </span>
  );
}

function CompanyBadge({ company }: { company?: string | null }) {
  if (!company) return <span className="text-sm text-text-dim">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-page-subtle border border-border-medium text-text-secondary">
      {company}
    </span>
  );
}

function StatusBadge({ status }: { status: (typeof statusConfig)[keyof typeof statusConfig] }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: status.bg, border: `1px solid ${status.border}`, color: status.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
      {status.label}
    </span>
  );
}

function ClientCell({ m }: { m: Membership }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
        {m.client?.fullName?.charAt(0).toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white leading-tight truncate">
          {m.client?.fullName ?? `Cliente #${m.clientId}`}
        </p>
        {m.client?.phone && (
          <p className="text-xs mt-0.5 text-text-muted">
            {m.client.phone}
          </p>
        )}
      </div>
    </div>
  );
}

function DueDate({ m, isExpiring }: { m: Membership; isExpiring: boolean }) {
  const isOverdue = m.status === "expired" && m.daysOverdue > 0;
  return (
    <div className="flex items-center gap-2">
      {(isExpiring || isOverdue) && (
        <TriangleAlert className={`w-3.5 h-3.5 flex-shrink-0 ${isOverdue ? "text-destructive" : "text-warn"}`} />
      )}
      <div>
        <span className={`text-sm font-medium ${isOverdue ? "text-destructive" : isExpiring ? "text-warn" : "text-text-secondary"}`}>
          {formatDate(m.endDate)}
        </span>
        {isOverdue && (
          <p className="text-xs text-destructive/80">
            Vencida hace {m.daysOverdue} día{m.daysOverdue !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionButtons({ m, onRenew, onDelete }: { m: Membership; onRenew: (m: Membership) => void; onDelete: (m: Membership) => void }) {
  return (
    <>
      {m.status !== "cancelled" && (
        <button
          onClick={() => onRenew(m)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer bg-primary-dim border border-primary/30 text-primary hover:bg-primary/25"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Renovar
        </button>
      )}
      <button
        onClick={() => onDelete(m)}
        title="Desactivar mensualidad"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 cursor-pointer bg-danger-dim border border-destructive/20 text-destructive hover:bg-destructive/20 hover:border-destructive/40"
      >
        <CircleMinus className="w-3.5 h-3.5" />
      </button>
    </>
  );
}

// Fila etiqueta/valor usada dentro de las tarjetas móviles.
function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

interface MensualidadesTableProps {
  memberships: Membership[];
  expiringIds: number[];
  onRenew: (m: Membership) => void;
  onDelete: (m: Membership) => void;
}

export function MensualidadesTable({ memberships, expiringIds, onRenew, onDelete }: MensualidadesTableProps) {
  if (memberships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-primary-dim">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <p className="text-white font-semibold mb-1">Sin mensualidades</p>
        <p className="text-sm text-text-muted">
          No hay mensualidades en esta categoría
        </p>
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
              {["Cliente", "Placa", "Tipo", "Empresa", "Inicio", "Vencimiento", "Estado", "Precio", "Acciones"].map((col) => (
                <th
                  key={col}
                  className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {memberships.map((m, i) => {
              const isExpiring = expiringIds.includes(m.id);
              const status = statusConfig[m.status] ?? statusConfig.cancelled;
              const isLast = i === memberships.length - 1;

              return (
                <tr
                  key={m.id}
                  className={`transition-colors duration-150 ${isLast ? "" : "border-b border-border-row"} ${isExpiring ? "bg-warn/[0.04] hover:bg-warn/[0.08]" : "hover:bg-page-row-hover"}`}
                >
                  <td className="px-5 py-4"><ClientCell m={m} /></td>
                  <td className="px-5 py-4"><PlateBadge m={m} /></td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-text-secondary">
                      {vehicleTypeLabel[m.vehicle?.type ?? ""] ?? m.vehicle?.type ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4"><CompanyBadge company={m.company} /></td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-text-secondary">{formatDate(m.startDate)}</span>
                  </td>
                  <td className="px-5 py-4"><DueDate m={m} isExpiring={isExpiring} /></td>
                  <td className="px-5 py-4"><StatusBadge status={status} /></td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-text-primary">{formatCOP(m.price)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <ActionButtons m={m} onRenew={onRenew} onDelete={onDelete} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="md:hidden p-4 space-y-3">
        {memberships.map((m) => {
          const isExpiring = expiringIds.includes(m.id);
          const status = statusConfig[m.status] ?? statusConfig.cancelled;
          return (
            <div
              key={m.id}
              className={`rounded-xl p-4 space-y-3 ${isExpiring ? "bg-warn/[0.06] border border-warn/35" : "bg-page-card border border-border-default"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <ClientCell m={m} />
                <PlateBadge m={m} />
              </div>
              <div className="space-y-2 pt-1 border-t border-border-soft">
                <CardRow label="Tipo">
                  <span className="text-sm text-text-secondary">
                    {vehicleTypeLabel[m.vehicle?.type ?? ""] ?? m.vehicle?.type ?? "—"}
                  </span>
                </CardRow>
                <CardRow label="Empresa"><CompanyBadge company={m.company} /></CardRow>
                <CardRow label="Inicio">
                  <span className="text-sm text-text-secondary">{formatDate(m.startDate)}</span>
                </CardRow>
                <CardRow label="Vencimiento"><DueDate m={m} isExpiring={isExpiring} /></CardRow>
                <CardRow label="Estado"><StatusBadge status={status} /></CardRow>
                <CardRow label="Precio">
                  <span className="text-sm font-semibold text-text-primary">{formatCOP(m.price)}</span>
                </CardRow>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <ActionButtons m={m} onRenew={onRenew} onDelete={onDelete} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer count */}
      <div
        className="px-5 py-3 flex items-center justify-between border-t border-border-soft"
      >
        <p className="text-xs text-text-dim">
          {memberships.length} registro{memberships.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
