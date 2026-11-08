"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "blocked", label: "Bloqueado" },
];

interface ClientFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function ClientFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ClientFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, documento, teléfono..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none transition duration-200 bg-page-input border border-border-medium focus:border-primary"
        />
      </div>
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-text-muted" />
        <div className="w-40">
          <CustomSelect
            value={statusFilter}
            onChange={(v) => onStatusFilterChange(String(v))}
            options={STATUS_OPTIONS}
            placeholder="Estado"
          />
        </div>
      </div>
    </div>
  );
}
