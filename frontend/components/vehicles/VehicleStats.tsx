"use client";

export interface VehicleStatsData {
  registered: number;
  visitors: number;
  withMembership: number;
}

export function VehicleStats({ stats }: { stats: VehicleStatsData }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
      {[
        { label: "Registrados",     value: stats.registered,     color: "var(--primary)" },
        { label: "Visitantes",      value: stats.visitors,       color: "var(--text-secondary)" },
        { label: "Con mensualidad", value: stats.withMembership, color: "var(--ok)" },
      ].map((s) => (
        <div key={s.label} className="min-w-0 rounded-2xl p-3 sm:p-5 bg-page-card backdrop-blur border border-border-default">
          <p className="text-[11px] sm:text-xs leading-tight font-medium mb-1 text-text-muted">{s.label}</p>
          <p className="text-lg sm:text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
