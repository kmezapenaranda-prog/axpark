"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: number | string;
  label: string;
}

interface CustomSelectProps {
  value: number | string;
  onChange: (value: number | string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="w-full px-3 py-2.5 rounded-xl text-sm flex items-center justify-between gap-2 cursor-pointer outline-none transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "var(--bg-input)",
          border: `1px solid ${open ? "var(--primary)" : "var(--border-medium)"}`,
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        <span className="truncate text-left">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform duration-150"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 mt-1.5 rounded-xl overflow-hidden animate-in"
          style={{
            background: "var(--bg-modal)",
            border: "1px solid var(--border-medium)",
            zIndex: 9999,
            maxHeight: "220px",
            overflowY: "auto",
            boxShadow: "0 16px 48px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isEmpty = opt.value === "";
            return (
              <div
                key={String(opt.value)}
                className="px-3 py-2.5 text-sm cursor-pointer transition-colors duration-100"
                style={{
                  color: isSelected ? "var(--primary)" : isEmpty ? "var(--text-muted)" : "var(--text-primary)",
                  backgroundColor: isSelected ? "var(--primary-dim)" : "transparent",
                  borderLeft: isSelected ? "2px solid var(--primary)" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "var(--primary-dim)";
                    e.currentTarget.style.color = "var(--primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = isEmpty ? "var(--text-muted)" : "var(--text-primary)";
                  }
                }}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
