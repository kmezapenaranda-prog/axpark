"use client";

import { Search } from "lucide-react";

export function VehicleFilters({
  search, onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="mb-6 relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar por placa, propietario o marca..."
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none bg-page-subtle border border-border-default"
      />
    </div>
  );
}
