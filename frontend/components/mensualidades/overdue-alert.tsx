"use client";

import { TriangleAlert } from "lucide-react";

interface OverdueAlertProps {
  count: number;
  onViewAll: () => void;
}

export function OverdueAlert({ count, onViewAll }: OverdueAlertProps) {
  return (
    <div className="mb-6 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 bg-danger-dim border border-destructive/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-destructive/15">
          <TriangleAlert className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-sm text-destructive">
            {count} mensualidad{count !== 1 ? "es" : ""} vencida{count !== 1 ? "s" : ""} hace más de 24 horas
          </p>
          <p className="text-xs mt-0.5 text-text-secondary">
            Siguen sin renovarse. Revisa si el vehículo sigue entrando sin pagar.
          </p>
        </div>
      </div>
      <button
        onClick={onViewAll}
        className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition duration-200 cursor-pointer bg-destructive/15 text-destructive border border-destructive/40 hover:bg-destructive/25"
      >
        Ver todas
      </button>
    </div>
  );
}
