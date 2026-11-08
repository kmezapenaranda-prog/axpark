export function StatCard({ label, value, sub, accent, loading }: { label: string; value: string; sub?: string; accent: string; loading: boolean }) {
  return (
    <div className="rounded-2xl p-5 card-hover bg-page-card backdrop-blur border border-border-default">
      <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-text-dim">{label}</p>
      {loading ? (
        <div className="h-8 w-24 rounded-lg animate-pulse bg-page-input" />
      ) : (
        <>
          <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
          {sub && <p className="text-xs mt-1 text-text-dim">{sub}</p>}
        </>
      )}
    </div>
  );
}
