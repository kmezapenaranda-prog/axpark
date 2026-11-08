"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  active: {
    label: "Activo",
    bg: "var(--ok-dim)",
    border: "color-mix(in srgb, var(--ok) 45%, transparent)",
    color: "var(--ok)",
    dot: "var(--ok)",
  },
  inactive: {
    label: "Inactivo",
    bg: "var(--bg-subtle)",
    border: "var(--border-medium)",
    color: "var(--text-secondary)",
    dot: "var(--text-dim)",
  },
} as const;

export function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <Badge
      className="gap-1.5 rounded-full px-2.5 py-1"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </Badge>
  );
}
