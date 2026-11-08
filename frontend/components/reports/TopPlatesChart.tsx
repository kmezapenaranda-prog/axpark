interface TopPlate {
  plate: string;
  count: number;
}

interface TopPlatesChartProps {
  data: TopPlate[];
  loading: boolean;
}

export function TopPlatesChart({ data, loading }: TopPlatesChartProps) {
  if (loading || data.length === 0) return null;

  const maxCount = data[0]?.count ?? 1;

  return (
    <div className="rounded-2xl p-6 card-hover bg-page-card backdrop-blur border border-border-default">
      <h3 className="text-sm font-semibold text-white mb-4">Vehículos más frecuentes</h3>
      <div className="space-y-3">
        {data.map(({ plate, count }, i) => (
          <div key={plate} className="flex items-center gap-3">
            <span className={`text-xs font-bold w-5 ${i === 0 ? "text-primary" : "text-text-dim"}`}>#{i + 1}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded font-mono bg-primary-dim text-primary border border-primary/25">
              {plate}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-page-input">
              <div className={`h-full rounded-full ${i === 0 ? "bg-primary" : "bg-text-dim"}`} style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-xs text-text-muted">{count}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}
