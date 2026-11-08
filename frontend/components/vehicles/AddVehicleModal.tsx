"use client";

import { useState } from "react";
import { type Client } from "@/lib/api";
import { useCreateVehicle } from "@/hooks/use-vehicles";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, type SubmitNotice } from "@/lib/submit-error";
import { Car, Loader2, Plus, Search } from "lucide-react";

const VEHICLE_TYPE_OPTIONS = [
  { value: "car", label: "Carro" },
  { value: "moto", label: "Moto" },
  { value: "truck", label: "Camión" },
];

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-text-secondary">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition duration-200 bg-page-input border border-border-medium focus:border-primary"
      />
    </div>
  );
}

export function AddVehicleModal({
  clients, tenantId, onCancel, onDone,
}: {
  clients: Client[];
  tenantId: number;
  onCancel: () => void;
  onDone: () => void;
}) {
  const createVehicleMutation = useCreateVehicle(tenantId);

  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState<number | "">("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<"car" | "moto" | "truck">("car");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState<SubmitNotice | null>(null);

  const saving = createVehicleMutation.isPending;

  const filteredClients = clients.filter((c) => {
    const q = clientSearch.toLowerCase();
    return !q || c.fullName.toLowerCase().includes(q) || c.document.includes(q);
  });
  const clientOptions = filteredClients.map((c) => ({
    value: c.id,
    label: `${c.fullName} — ${c.document}`,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plate.trim()) { setError(errorNotice("La placa es obligatoria.")); return; }
    setError(null);
    try {
      await createVehicleMutation.mutateAsync({
        tenantId,
        plate: plate.trim().toUpperCase(),
        type,
        ...(clientId ? { clientId } : {}),
        ...(brand.trim() ? { brand: brand.trim() } : {}),
        ...(color.trim() ? { color: color.trim() } : {}),
      });
      onDone();
    } catch (err: unknown) {
      setError(describeSubmitError(err));
    }
  }

  return (
    <DialogContent className="sm:max-w-lg border-0 p-0 overflow-hidden bg-modal backdrop-blur-xl border border-border-medium">
      <div className="h-1 w-full bg-primary" />
      <div className="p-6">
        <DialogHeader className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold text-white">Nuevo Vehículo</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-text-muted">
            Registra manualmente un vehículo y su propietario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Propietario</label>
            <p className="text-xs text-text-muted mb-2">Opcional — déjalo vacío para un vehículo ocasional</p>
            <div className="mb-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none transition duration-200 bg-page-input border border-border-medium focus:border-primary"
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setClientId(""); }}
                placeholder="Filtrar por nombre o documento..."
              />
            </div>
            <CustomSelect
              value={clientId}
              onChange={(v) => setClientId(v === "" ? "" : v as number)}
              options={[{ value: "", label: "Sin propietario (ocasional)" }, ...clientOptions]}
              placeholder="Sin propietario (ocasional)"
            />
          </div>

          <InputField label="Placa *" value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="Ej. ABC123" />

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Tipo *</label>
            <CustomSelect
              value={type}
              onChange={(v) => setType(v as "car" | "moto" | "truck")}
              options={VEHICLE_TYPE_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej. Chevrolet" />
            <InputField label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej. Blanco" />
          </div>

          <NoticeBox notice={error} />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 bg-primary text-primary-foreground">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
              ) : (
                <><Plus className="w-4 h-4" />Crear Vehículo</>
              )}
            </button>
          </div>
        </form>
      </div>
    </DialogContent>
  );
}
