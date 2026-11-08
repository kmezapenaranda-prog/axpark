import type { Client } from "@/lib/api";

const statusConfig = {
  active:   { label: "Activo",    bg: "var(--ok-dim)",     border: "color-mix(in srgb, var(--ok) 45%, transparent)",     color: "var(--ok)", dot: "var(--ok)" },
  inactive: { label: "Inactivo",  bg: "var(--bg-subtle)",  border: "var(--border-medium)",  color: "var(--text-secondary)", dot: "var(--text-dim)" },
  blocked:  { label: "Bloqueado", bg: "var(--danger-dim)", border: "color-mix(in srgb, var(--destructive) 45%, transparent)", color: "var(--destructive)", dot: "var(--destructive)" },
};

export function StatusBadge({ status }: { status: Client["status"] }) {
  const st = statusConfig[status] ?? statusConfig.inactive;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: st.bg, border: `1px solid ${st.border}`, color: st.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
      {st.label}
    </span>
  );
}
