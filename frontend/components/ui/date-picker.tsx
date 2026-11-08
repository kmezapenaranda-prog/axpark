"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string; // ISO yyyy-mm-dd
  onChange: (value: string) => void;
  disabled?: boolean;
}

const WEEKDAYS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = value ? parseISO(value) : null;
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());

  useEffect(() => {
    // Sincroniza el mes visible cuando `value` cambia desde afuera (p.ej. al limpiar el filtro).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value) setViewDate(parseISO(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    nextDay++;
  }

  const today = new Date();
  const todayISO = toISO(today);

  const displayLabel = selected
    ? `${String(selected.getDate()).padStart(2, "0")}/${String(selected.getMonth() + 1).padStart(2, "0")}/${selected.getFullYear()}`
    : "Seleccionar fecha";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "var(--bg-input)",
          border: `1px solid ${open ? "var(--primary)" : "var(--border-default)"}`,
          color: "var(--text-primary)",
        }}
      >
        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        {displayLabel}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1.5 rounded-2xl p-4 z-50 animate-in"
          style={{
            background: "var(--bg-modal)",
            border: "1px solid var(--border-medium)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)",
            width: "272px",
          }}
        >
          {/* Month header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-150"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-subtle)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-150"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-subtle)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-center text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>{w}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(({ date, inMonth }, i) => {
              const iso = toISO(date);
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isToday = iso === todayISO;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className="h-8 w-8 rounded-lg text-xs font-medium cursor-pointer transition duration-100 flex items-center justify-center"
                  style={{
                    color: isSelected ? "var(--primary-foreground)" : "var(--text-primary)",
                    backgroundColor: isSelected ? "var(--primary)" : "transparent",
                    border: isToday && !isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                    opacity: inMonth ? 1 : 0.4,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "var(--bg-subtle)"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs font-medium cursor-pointer transition-colors duration-150"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => { const t = new Date(); onChange(toISO(t)); setViewDate(t); setOpen(false); }}
              className="text-xs font-semibold cursor-pointer transition-colors duration-150"
              style={{ color: "var(--primary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--primary)"; }}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
