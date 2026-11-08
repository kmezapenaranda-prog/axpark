import { Download, type LucideIcon } from "lucide-react";

export function ExportBtn({ label, onClick, loading, icon: Icon = Download }: { label: string; onClick: () => void; loading: boolean; icon?: LucideIcon }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition duration-200"
      style={{ backgroundColor: "var(--ok-dim)", border: "1px solid color-mix(in srgb, var(--ok) 45%, transparent)", color: "var(--ok)" }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--ok) 28%, transparent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--ok-dim)"; }}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
