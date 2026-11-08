"use client";

import type { Client } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { cn } from "@/lib/utils";
import { Users, CircleMinus } from "lucide-react";

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
        {[140, 100, 120, 150, 80, 70].map((w, i) => (
          <Skeleton key={i} className={cn("h-3 rounded bg-page-input")} style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn("flex items-center gap-4 py-4", i < 4 && "border-b border-border-row")}>
          <div className="flex items-center gap-3" style={{ minWidth: 140 }}>
            <Skeleton className="w-8 h-8 rounded-full bg-page-input" />
            <Skeleton className="h-3 w-28 rounded bg-page-input" />
          </div>
          <Skeleton className="h-3 w-24 rounded bg-page-input" />
          <Skeleton className="h-3 w-28 rounded bg-page-input" />
          <Skeleton className="h-3 w-36 rounded bg-page-input" />
          <Skeleton className="h-6 w-16 rounded-full bg-page-input" />
          <Skeleton className="h-3 w-20 rounded bg-page-input" />
        </div>
      ))}
    </div>
  );
}

interface ClientTableProps {
  clients: Client[];
  loading: boolean;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function ClientTable({ clients, loading, onEdit, onDelete }: ClientTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden bg-card backdrop-blur-md border border-border-default">
        <TableSkeleton />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden bg-card backdrop-blur-md border border-border-default">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-primary-dim">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <p className="text-white font-semibold mb-1">Sin clientes</p>
          <p className="text-sm text-text-muted">Crea el primer cliente con el botón superior</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-card backdrop-blur-md border border-border-default">
      <div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-soft">
                {["Cliente", "Documento", "Teléfono", "Email", "Estado", "Registrado", ""].map((col) => (
                  <th key={col} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr
                  key={c.id}
                  className={cn("transition-colors duration-150 cursor-pointer", i < clients.length - 1 && "border-b border-border-row")}
                  onClick={() => onEdit(c)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-row-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
                        {c.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white leading-tight">{c.fullName}</p>
                        {c.address && <p className="text-xs mt-0.5 truncate max-w-[160px] text-text-muted">{c.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-mono text-text-secondary">{c.document}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-text-secondary">{c.phone}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-text-secondary">{c.email || "—"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-text-muted">{formatDate(c.createdAt)}</span>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDelete(c)}
                      title="Desactivar cliente"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-danger-dim border border-destructive/20 text-destructive hover:bg-destructive/20 hover:border-destructive/40"
                    >
                      <CircleMinus className="w-3.5 h-3.5" />
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-4 space-y-3">
          {clients.map((c) => (
            <div key={c.id} onClick={() => onEdit(c)}
              className="rounded-xl p-4 space-y-3 cursor-pointer bg-card border border-border-default">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
                    {c.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white leading-tight truncate">{c.fullName}</p>
                    <p className="text-xs mt-0.5 font-mono text-text-muted">{c.document}</p>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="space-y-2 pt-1 border-t border-border-soft">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Teléfono</span>
                  <span className="text-sm text-right text-text-secondary">{c.phone}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Email</span>
                  <span className="text-sm text-right truncate max-w-[60%] text-text-secondary">{c.email || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Registrado</span>
                  <span className="text-sm text-right text-text-muted">{formatDate(c.createdAt)}</span>
                </div>
              </div>
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onDelete(c)}
                  title="Desactivar cliente"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 bg-danger-dim border border-destructive/20 text-destructive"
                >
                  <CircleMinus className="w-3.5 h-3.5" />
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border-soft">
          <p className="text-xs text-text-dim">{clients.length} cliente{clients.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  );
}
