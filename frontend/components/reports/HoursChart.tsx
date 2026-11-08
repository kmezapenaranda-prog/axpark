"use client";

interface HourCount {
  hour: string;
  count: number;
}

interface HoursChartProps {
  data: HourCount[];
  loading: boolean;
}

export function HoursChart({ data, loading }: HoursChartProps) {
  if (loading || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="rounded-2xl p-6 card-hover bg-page-card backdrop-blur border border-border-default">
      <h3 className="text-sm font-semibold text-white mb-4">Horas pico de ingreso</h3>
      <div className="space-y-2">
        {sorted.map(({ hour, count }) => (
          <div key={hour} className="flex items-center gap-3">
            <span className="text-xs w-12 text-right font-mono text-text-muted">{hour}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-page-input">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-xs w-8 text-text-muted">{count}</span>
          </div>
        ))}
      </div>
      <p className="text-xs mt-3 text-text-dim">
        Hora más activa: <span className="text-primary">{sorted[0]?.hour}</span> ({sorted[0]?.count} ingresos)
      </p>
    </div>
  );
}
