import type { CSSProperties } from "react";
import type { SubmitNotice } from "@/lib/submit-error";

const toneStyle: Record<SubmitNotice["tone"], CSSProperties> = {
  error: {
    backgroundColor: "var(--danger-dim)",
    color: "var(--destructive)",
    border: "1px solid color-mix(in srgb, var(--destructive) 35%, transparent)",
  },
  warning: {
    backgroundColor: "var(--warn-dim)",
    color: "var(--warn)",
    border: "1px solid color-mix(in srgb, var(--warn) 40%, transparent)",
  },
};

/**
 * Caja de aviso tras una operación. El color depende del tono:
 * rojo para fallos reales, ámbar para avisos (conflicto 409 o resultado
 * no confirmado por red/timeout).
 */
export function NoticeBox({
  notice,
  className = "",
}: {
  notice: SubmitNotice | null;
  className?: string;
}) {
  if (!notice) return null;
  return (
    <p
      className={`text-xs px-3 py-2 rounded-lg ${className}`}
      style={toneStyle[notice.tone]}
    >
      {notice.message}
    </p>
  );
}
