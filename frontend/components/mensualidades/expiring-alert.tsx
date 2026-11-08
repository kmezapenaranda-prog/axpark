"use client";

import { TriangleAlert } from "lucide-react";

interface ExpiringAlertProps {
  count: number;
  onViewAll: () => void;
}

export function ExpiringAlert({ count, onViewAll }: ExpiringAlertProps) {
  return (
    <div className="mb-6 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 bg-warn-dim border border-warn/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-warn/15">
          <TriangleAlert className="w-5 h-5 text-warn" />
        </div>
        <div>
          <p className="font-semibold text-sm text-warn">
            {count} mensualidad{count !== 1 ? "es" : ""} por vencer
          </p>
          <p className="text-xs mt-0.5 text-text-secondary">
            Vencen en los próximos 7 días. Renuévalas antes de que expiren.
          </p>
        </div>
      </div>
      <button
        onClick={onViewAll}
        className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition duration-200 cursor-pointer bg-warn/15 text-warn border border-warn/40 hover:bg-warn/25"
      >
        Ver todas
      </button>
    </div>
  );
}
