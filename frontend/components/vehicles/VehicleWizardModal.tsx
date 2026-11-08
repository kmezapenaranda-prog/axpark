"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Vehicle, type Client, type CreateClientDto,
} from "@/lib/api";
import { useUpdateVehicle } from "@/hooks/use-vehicles";
import { useCreateClient } from "@/hooks/use-clients";
import { UserPlus, Car, X, SquarePen, Search, ChevronRight, Check, ChevronLeft, Loader2 } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, type SubmitNotice } from "@/lib/submit-error";
import { BRANDS, COLORS, initBrand, initBrandCustom, initColor, initColorCustom } from "./config";

type ModalStep = "s1" | "s2a" | "s2b" | "s3a" | "s3b" | "s4";

function stepNumber(s: ModalStep): number {
  if (s === "s1") return 1;
  if (s === "s2a" || s === "s2b") return 2;
  if (s === "s3a" || s === "s3b") return 3;
  return 4;
}

function Spinner() {
  return (
    <Loader2 className="w-4 h-4 animate-spin" />
  );
}

function BrandColorFields({
  brand, setBrand, brandCustom, setBrandCustom,
  color, setColor, colorCustom, setColorCustom,
  disabled,
}: {
  brand: string; setBrand: (v: string) => void;
  brandCustom: string; setBrandCustom: (v: string) => void;
  color: string; setColor: (v: string) => void;
  colorCustom: string; setColorCustom: (v: string) => void;
  disabled: boolean;
}) {
  const inputCls = "w-full mt-2 px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-colors bg-page-input border border-border-medium";
  const brandOpts = BRANDS.map((b) => ({ value: b, label: b }));
  const colorOpts = COLORS.map((c) => ({ value: c, label: c }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Marca</label>
        <CustomSelect
          value={brand}
          onChange={(v) => { setBrand(String(v)); if (String(v) !== "Otra") setBrandCustom(""); }}
          options={[{ value: "", label: "Seleccionar marca..." }, ...brandOpts]}
          placeholder="Seleccionar marca..."
          disabled={disabled}
        />
        {brand === "Otra" && (
          <input
            className={inputCls}
            value={brandCustom}
            onChange={(e) => setBrandCustom(e.target.value)}
            placeholder="Escribe la marca..."
            disabled={disabled}
          />
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Color</label>
        <CustomSelect
          value={color}
          onChange={(v) => { setColor(String(v)); if (String(v) !== "Otro") setColorCustom(""); }}
          options={[{ value: "", label: "Seleccionar color..." }, ...colorOpts]}
          placeholder="Seleccionar color..."
          disabled={disabled}
        />
        {color === "Otro" && (
          <input
            className={inputCls}
            value={colorCustom}
            onChange={(e) => setColorCustom(e.target.value)}
            placeholder="Escribe el color..."
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number | null }) {
  const count = total ?? 1;
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: count }, (_, i) => {
          const done = i + 1 < current;
          const active = i + 1 === current;
          return (
            <div key={i} className={`rounded-full transition duration-300 ${done || active ? "bg-primary" : "bg-border-medium"}`}
              style={{
                width: active ? "22px" : "8px",
                height: "8px",
                opacity: done ? 0.6 : 1,
              }} />
          );
        })}
      </div>
      <span className="text-xs font-semibold text-text-muted">
        Paso {current}{total ? ` de ${total}` : ""}
      </span>
    </div>
  );
}

export function VehicleWizardModal({
  vehicle, clients, tenantId, onClose, onDone,
}: {
  vehicle: Vehicle;
  clients: Client[];
  tenantId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const updateVehicleMutation = useUpdateVehicle(tenantId);
  const createClientMutation = useCreateClient(tenantId);

  const [step, setStep]               = useState<ModalStep>("s1");
  const [totalSteps, setTotalSteps]   = useState<number | null>(null);
  const [step3Variant, setStep3Variant] = useState<"s3a" | "s3b" | null>(null);

  const [brand, setBrand]           = useState(initBrand(vehicle));
  const [brandCustom, setBrandCustom] = useState(initBrandCustom(vehicle));
  const [color, setColor]           = useState(initColor(vehicle));
  const [colorCustom, setColorCustom] = useState(initColorCustom(vehicle));

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");

  const [newClient, setNewClient] = useState<Omit<CreateClientDto, "tenantId">>({
    fullName: "", document: "", phone: "", email: "", address: "",
  });

  const [resolvedClientId, setResolvedClientId] = useState<number | null>(null);

  const [error, setError]     = useState<SubmitNotice | null>(null);

  const saving = updateVehicleMutation.isPending || createClientMutation.isPending;

  const effectiveBrand = brand === "Otra"  ? brandCustom.trim() : brand;
  const effectiveColor = color === "Otro"  ? colorCustom.trim() : color;

  function goBack() {
    setError(null);
    if (step === "s2a" || step === "s2b") { setStep("s1"); return; }
    if (step === "s3a" || step === "s3b") { setStep("s2b"); return; }
    if (step === "s4" && step3Variant) setStep(step3Variant);
  }

  function handleS1No()  { setTotalSteps(2); setStep("s2a"); setError(null); }
  function handleS1Yes() { setTotalSteps(4); setStep("s2b"); setError(null); }

  function handleS2bExisting() { setStep3Variant("s3a"); setStep("s3a"); setError(null); }
  function handleS2bNew()      { setStep3Variant("s3b"); setStep("s3b"); setError(null); }

  function handleS3aNext() {
    if (!selectedClientId) { setError(errorNotice("Selecciona un cliente para continuar.")); return; }
    setResolvedClientId(selectedClientId as number);
    setStep("s4");
    setError(null);
  }

  async function handleS3bNext() {
    if (!newClient.fullName.trim() || !newClient.document.trim()) {
      setError(errorNotice("Nombre y documento son obligatorios."));
      return;
    }
    setError(null);
    try {
      const created = await createClientMutation.mutateAsync({ ...newClient, tenantId });
      setResolvedClientId(created.id);
      setStep("s4");
    } catch (e: unknown) {
      setError(describeSubmitError(e));
    }
  }

  async function handleS2aSave() {
    setError(null);
    try {
      const payload: { brand?: string; color?: string } = {};
      if (effectiveBrand) payload.brand = effectiveBrand;
      if (effectiveColor) payload.color = effectiveColor;
      await updateVehicleMutation.mutateAsync({ id: vehicle.id, data: payload });
      onDone();
    } catch (e: unknown) {
      setError(describeSubmitError(e));
    }
  }

  async function handleS4Save() {
    if (!resolvedClientId) return;
    setError(null);
    try {
      const payload: { clientId: number; brand?: string; color?: string } = { clientId: resolvedClientId };
      if (effectiveBrand) payload.brand = effectiveBrand;
      if (effectiveColor) payload.color = effectiveColor;
      await updateVehicleMutation.mutateAsync({ id: vehicle.id, data: payload });
      onDone();
      router.push(`/mensualidades?vehicleId=${vehicle.id}`);
    } catch (e: unknown) {
      setError(describeSubmitError(e));
    }
  }

  const filteredClients = clients.filter((c) => {
    const q = clientSearch.toLowerCase();
    return !q || c.fullName.toLowerCase().includes(q) || c.document.includes(q);
  });
  const clientOptions = filteredClients.map((c) => ({
    value: c.id,
    label: `${c.fullName} — ${c.document}`,
  }));

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-colors bg-page-input border border-border-medium";

  const btnPrimaryCls = "bg-primary text-primary-foreground";
  const btnOkCls = "bg-ok text-black";

  const stepTitles: Record<ModalStep, { title: string; sub: string }> = {
    s1:  { title: "¿Registrar para mensualidad?", sub: "Elige cómo continuar con este vehículo" },
    s2a: { title: "Actualizar datos del vehículo", sub: "Solo se guardará marca y color" },
    s2b: { title: "¿El cliente ya existe?", sub: "Elige cómo vincular el propietario" },
    s3a: { title: "Buscar cliente existente", sub: "Selecciona al propietario del vehículo" },
    s3b: { title: "Registrar nuevo cliente", sub: "Ingresa los datos del propietario" },
    s4:  { title: "Datos del vehículo", sub: "Último paso — luego se abrirá la mensualidad" },
  };

  const { title, sub } = stepTitles[step];
  const currentNum = stepNumber(step);
  const canGoBack = step !== "s1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col bg-page-modal border border-border-medium max-h-[90vh]">

        {/* Accent bar */}
        <div className="h-1 w-full flex-shrink-0 bg-primary" />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* Plate badge + close */}
          <div className="flex items-start justify-between mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider bg-primary-dim border border-primary/30 text-primary font-mono">
              <Car className="w-4 h-4" />
              {vehicle.plate}
            </span>
            <button onClick={onClose} disabled={saving}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 text-text-muted"
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-input)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <StepIndicator current={currentNum} total={totalSteps} />

          {/* Step title */}
          <h2 className="text-base font-bold text-white mb-0.5">{title}</h2>
          <p className="text-xs mb-5 text-text-muted">{sub}</p>

          {/* ── Step content ── */}

          {/* S1 — Pregunta inicial */}
          {step === "s1" && (
            <div className="space-y-3">
              <button onClick={handleS1No}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors duration-150 cursor-pointer bg-page-input border border-border-medium hover:bg-page-subtle hover:border-border-medium">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-page-subtle border border-border-medium">
                  <SquarePen className="w-5 h-5 text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">No, solo actualizar datos</p>
                  <p className="text-xs mt-0.5 text-text-muted">Guardar marca y color del vehículo</p>
                </div>
              </button>

              <button onClick={handleS1Yes}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors duration-150 cursor-pointer bg-primary-dim border border-primary/25 hover:bg-primary/15 hover:border-primary/50">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-dim border border-primary/35">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Sí, registrar para mensualidad</p>
                  <p className="text-xs mt-0.5 text-text-muted">Vincular cliente y crear mensualidad</p>
                </div>
              </button>
            </div>
          )}

          {/* S2A — Solo marca y color */}
          {step === "s2a" && (
            <>
              <BrandColorFields
                brand={brand} setBrand={setBrand}
                brandCustom={brandCustom} setBrandCustom={setBrandCustom}
                color={color} setColor={setColor}
                colorCustom={colorCustom} setColorCustom={setColorCustom}
                disabled={saving}
              />
              <NoticeBox notice={error} className="mt-3" />
              <button onClick={handleS2aSave} disabled={saving}
                className={`w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${btnPrimaryCls}`}>
                {saving ? <Spinner /> : null}
                {saving ? "Guardando..." : "Guardar datos"}
              </button>
            </>
          )}

          {/* S2B — ¿Cliente existe? */}
          {step === "s2b" && (
            <div className="space-y-3">
              <button onClick={handleS2bExisting}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors duration-150 cursor-pointer bg-ok-dim border border-ok/25 hover:bg-ok/15 hover:border-ok/50">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-ok-dim border border-ok/35">
                  <Search className="w-5 h-5 text-ok" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ok">Sí, buscar cliente existente</p>
                  <p className="text-xs mt-0.5 text-text-muted">Seleccionar de los clientes registrados</p>
                </div>
              </button>

              <button onClick={handleS2bNew}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors duration-150 cursor-pointer bg-primary-dim border border-primary/25 hover:bg-primary/15 hover:border-primary/50">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-dim border border-primary/35">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">No, es cliente nuevo</p>
                  <p className="text-xs mt-0.5 text-text-muted">Registrar nuevo propietario</p>
                </div>
              </button>
            </div>
          )}

          {/* S3A — Buscar cliente existente */}
          {step === "s3a" && (
            <>
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  className={`${inputCls} pl-9`}
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setSelectedClientId(""); }}
                  placeholder="Filtrar por nombre o documento..."
                />
              </div>
              <CustomSelect
                value={selectedClientId}
                onChange={(v) => setSelectedClientId(v === "" ? "" : v as number)}
                options={[{ value: "", label: "Seleccionar cliente..." }, ...clientOptions]}
                placeholder="Seleccionar cliente..."
              />
              {selectedClientId !== "" && (
                <div className="mt-3 p-3 rounded-xl bg-ok-dim border border-ok/20">
                  {(() => {
                    const c = clients.find((x) => x.id === selectedClientId);
                    return c ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-primary text-primary-foreground">
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{c.fullName}</p>
                          <p className="text-xs text-text-muted">{c.document}{c.phone ? ` · ${c.phone}` : ""}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              <NoticeBox notice={error} className="mt-3" />
              <button onClick={handleS3aNext}
                className={`w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 ${btnPrimaryCls}`}>
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* S3B — Nuevo cliente */}
          {step === "s3b" && (
            <>
              <div className="space-y-3">
                {(["fullName","document","phone","email","address"] as (keyof Omit<CreateClientDto, "tenantId">)[]).map((field) => {
                  const labels: Record<keyof Omit<CreateClientDto, "tenantId">, string> = {
                    fullName: "Nombre completo *", document: "Documento *",
                    phone: "Teléfono", email: "Correo electrónico", address: "Dirección",
                  };
                  return (
                    <div key={field}>
                      <label className="block text-xs font-semibold mb-1.5 text-text-secondary">
                        {labels[field]}
                      </label>
                      <input
                        className={inputCls}
                        type={field === "email" ? "email" : "text"}
                        value={newClient[field]}
                        onChange={(e) => setNewClient((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder={labels[field].replace(" *", "")}
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
              <NoticeBox notice={error} className="mt-3" />
              <button onClick={handleS3bNext} disabled={saving}
                className={`w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${btnPrimaryCls}`}>
                {saving ? <Spinner /> : null}
                {saving ? "Creando cliente..." : "Crear cliente y continuar"}
              </button>
            </>
          )}

          {/* S4 — Datos del vehículo + mensualidad */}
          {step === "s4" && (
            <>
              {resolvedClientId && (
                <div className="mb-4 p-3 rounded-xl flex items-center gap-3 bg-ok-dim border border-ok/20">
                  {(() => {
                    const c = clients.find((x) => x.id === resolvedClientId);
                    return c ? (
                      <>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{c.fullName}</p>
                          <p className="text-xs text-text-muted">{c.document}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-white">Cliente #{resolvedClientId}</p>
                    );
                  })()}
                  <Check className="w-4 h-4 ml-auto flex-shrink-0 text-ok" />
                </div>
              )}
              <BrandColorFields
                brand={brand} setBrand={setBrand}
                brandCustom={brandCustom} setBrandCustom={setBrandCustom}
                color={color} setColor={setColor}
                colorCustom={colorCustom} setColorCustom={setColorCustom}
                disabled={saving}
              />
              <NoticeBox notice={error} className="mt-3" />
              <button onClick={handleS4Save} disabled={saving}
                className={`w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${btnOkCls}`}>
                {saving ? <Spinner /> : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? "Guardando..." : "Guardar y crear mensualidad"}
              </button>
            </>
          )}

          {/* Back button */}
          {canGoBack && (
            <button onClick={goBack} disabled={saving}
              className="flex items-center gap-1.5 mt-4 text-xs cursor-pointer disabled:opacity-40 transition-colors text-text-muted"
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}>
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
