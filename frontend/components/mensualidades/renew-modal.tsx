"use client";

import { type Membership } from "@/lib/api";
import { RefreshCw, ArrowRight, Loader2, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function addOneMonth(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr + "T00:00:00");
  date.setMonth(date.getMonth() + 1);
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

interface RenewModalProps {
  membership: Membership | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function RenewModal({ membership, open, onClose, onConfirm, loading }: RenewModalProps) {
  const newEndDate = membership ? addOneMonth(membership.endDate) : "";

  return (
    <Sheet open={open && !!membership} onClose={() => { if (!loading) onClose(); }}>
      {membership && (
        <>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Renovar Mensualidad</h2>
              <p className="text-xs text-text-secondary">Confirma la renovación por un mes adicional</p>
            </div>
          </div>
          <button
            onClick={() => { if (!loading) onClose(); }}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary cursor-pointer flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-xl p-4 space-y-3 bg-page-row-hover border border-border-default">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-text-muted">Cliente</span>
              <span className="text-sm font-semibold text-white">
                {membership.client?.fullName ?? `#${membership.clientId}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-text-muted">Placa</span>
              <span className="text-xs font-bold tracking-wider px-2 py-0.5 rounded font-mono bg-primary-dim text-primary">
                {membership.vehicle?.plate ?? `#${membership.vehicleId}`}
              </span>
            </div>
            <div className="border-t border-border-soft pt-3 flex justify-between items-center">
              <div>
                <p className="text-xs text-text-muted">Vencimiento actual</p>
                <p className="text-sm font-medium mt-0.5 text-destructive">
                  {formatDate(membership.endDate)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-dim" />
              <div className="text-right">
                <p className="text-xs text-text-muted">Nuevo vencimiento</p>
                <p className="text-sm font-semibold mt-0.5 text-ok">
                  {newEndDate}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-5 border-t border-border-soft">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 bg-primary text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Renovando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Confirmar Renovación
              </>
            )}
          </button>
        </div>
        </>
      )}
    </Sheet>
  );
}
