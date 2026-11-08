"use client";

import { useState } from "react";
import type { CreateClientDto, UpdateClientDto } from "@/lib/api";
import { useCreateClient } from "@/hooks/use-clients";
import { useCreateVehicle } from "@/hooks/use-vehicles";
import { useAuth } from "@/components/auth-provider";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, type SubmitNotice } from "@/lib/submit-error";
import { Plus, Loader2, Save, User, Car, SquarePen } from "lucide-react";

const CLIENT_STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "blocked", label: "Bloqueado" },
];

const VEHICLE_TYPE_OPTIONS = [
  { value: "car", label: "Carro" },
  { value: "moto", label: "Moto" },
  { value: "truck", label: "Camión" },
];

function InputField({ label, name, value, onChange, type = "text", placeholder }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-text-secondary">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition duration-200 bg-page-input border border-border-medium focus:border-primary"
      />
    </div>
  );
}

interface ClientFormProps {
  mode: "create" | "edit";
  initialData?: UpdateClientDto & { id?: number };
  onSubmit: (data: CreateClientDto | UpdateClientDto) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function ClientForm({ mode, initialData, onSubmit, onCancel, loading }: ClientFormProps) {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const createClientMutation = useCreateClient(tenantId);
  const createVehicleMutation = useCreateVehicle(tenantId);

  const [step, setStep] = useState<"client" | "vehicle">("client");
  const [form, setForm] = useState<Omit<CreateClientDto, "tenantId">>(
    mode === "edit"
      ? { fullName: initialData?.fullName ?? "", document: initialData?.document ?? "", phone: initialData?.phone ?? "", email: initialData?.email ?? "", address: initialData?.address ?? "" }
      : { fullName: "", document: "", phone: "", email: "", address: "" }
  );
  const [formError, setFormError] = useState<SubmitNotice | null>(null);
  const [newClientId, setNewClientId] = useState<number | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ plate: "", type: "car" as "car" | "moto" | "truck", brand: "", color: "" });
  const vehicleSaving = createVehicleMutation.isPending;
  const [vehicleError, setVehicleError] = useState<SubmitNotice | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.document || !form.phone) {
      setFormError(errorNotice("Nombre, documento y teléfono son obligatorios."));
      return;
    }
    setFormError(null);
    try {
      if (mode === "edit") {
        await onSubmit({ ...form, status: initialData?.status } as UpdateClientDto);
      } else {
        const client = await createClientMutation.mutateAsync({ ...form, tenantId });
        setNewClientId(client.id);
        setVehicleForm({ plate: "", type: "car", brand: "", color: "" });
        setVehicleError(null);
        setStep("vehicle");
      }
    } catch (err: unknown) {
      setFormError(describeSubmitError(err));
    }
  }

  async function handleVehicleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleForm.plate || !newClientId) return;
    setVehicleError(null);
    try {
      await createVehicleMutation.mutateAsync({ ...vehicleForm, clientId: newClientId, tenantId });
      onCancel();
    } catch (err: unknown) {
      setVehicleError(describeSubmitError(err));
    }
  }

  if (mode === "edit") {
    return (
      <DialogContent className="sm:max-w-lg border-0 p-0 overflow-hidden bg-modal backdrop-blur-xl border border-border-medium">
        <div className="h-1 w-full bg-primary" />
        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                <SquarePen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Editar Cliente</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm text-text-muted">
              {initialData?.fullName} · modificando datos del cliente
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleClientSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <InputField label="Nombre completo *" name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Ej. Juan Pérez García" />
              </div>
              <InputField label="Documento *" name="document"
                value={form.document}
                onChange={handleChange}
                placeholder="Cédula o NIT" />
              <InputField label="Teléfono *" name="phone" type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="300 123 4567" />
              <div className="col-span-2">
                <InputField label="Email" name="email" type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com" />
              </div>
              <div className="col-span-2">
                <InputField label="Dirección" name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Calle 123 #45-67" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Estado</label>
                <CustomSelect
                  value={initialData?.status ?? "active"}
                  onChange={() => { /* status is passed via initialData */ }}
                  options={CLIENT_STATUS_OPTIONS}
                  disabled
                />
              </div>
            </div>

            <NoticeBox notice={formError} />

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onCancel} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 bg-primary text-primary-foreground">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" />Guardar cambios</>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-lg border-0 p-0 overflow-hidden bg-modal backdrop-blur-xl border border-border-medium">
      <div className="h-1 w-full bg-primary" />
      <div className="p-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {(["client", "vehicle"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${step === "vehicle" ? "bg-primary/50" : "bg-border-medium"}`} />}
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (s === "client" && step === "vehicle") ? "bg-primary text-primary-foreground" : "bg-page-input text-text-primary"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${step === s ? "text-primary" : "text-text-dim"}`}>
                  {s === "client" ? "Datos cliente" : "Vehículo"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {step === "client" ? (
          <>
            <DialogHeader className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-lg font-bold text-white">Nuevo Cliente</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-text-muted">
                Completa el formulario para registrar un nuevo cliente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <InputField label="Nombre completo *" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Ej. Juan Pérez García" />
                </div>
                <InputField label="Documento *" name="document" value={form.document} onChange={handleChange} placeholder="Cédula o NIT" />
                <InputField label="Teléfono *" name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="300 123 4567" />
                <div className="col-span-2">
                  <InputField label="Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="correo@ejemplo.com" />
                </div>
                <div className="col-span-2">
                  <InputField label="Dirección" name="address" value={form.address} onChange={handleChange} placeholder="Calle 123 #45-67" />
                </div>
              </div>
              <NoticeBox notice={formError} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onCancel} disabled={createClientMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={createClientMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 bg-primary text-primary-foreground">
                  {createClientMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                  ) : (
                    <><Plus className="w-4 h-4" />Crear Cliente</>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-ok-dim border border-ok/30">
                  <Car className="w-5 h-5 text-ok" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white">Agregar Vehículo</DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-sm text-text-muted">
                Cliente creado. Registra su vehículo o sáltate este paso.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <InputField label="Placa *" name="plate" value={vehicleForm.plate}
                onChange={(e) => setVehicleForm((p) => ({ ...p, plate: e.target.value.toUpperCase() }))}
                placeholder="Ej. ABC123" />
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Tipo *</label>
                <CustomSelect
                  value={vehicleForm.type}
                  onChange={(v) => setVehicleForm((p) => ({ ...p, type: v as "car" | "moto" | "truck" }))}
                  options={VEHICLE_TYPE_OPTIONS}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Marca" name="brand" value={vehicleForm.brand}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="Ej. Chevrolet" />
                <InputField label="Color" name="color" value={vehicleForm.color}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, color: e.target.value }))}
                  placeholder="Ej. Blanco" />
              </div>
              <NoticeBox notice={vehicleError} />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onCancel} disabled={vehicleSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
                  Omitir
                </button>
                <button type="submit" disabled={vehicleSaving || !vehicleForm.plate}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 bg-ok text-black">
                  {vehicleSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                  ) : "Agregar Vehículo"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </DialogContent>
  );
}
