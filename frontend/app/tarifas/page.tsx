"use client";

import { useEffect, useState } from "react";
import type { AppSettings } from "@/lib/api";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useAuth } from "@/components/auth-provider";
import { Car, Info, Loader2, Check, Save } from "lucide-react";

const EMPTY_SETTINGS: Omit<AppSettings, "id" | "tenantId"> = {
  fraccionCarro: 0,
  horaCarro: 0,
  medioDiaCarro: 0,
  diaCarro: 0,
  mensualidadCarro: 0,
  fraccionMoto: 0,
  horaMoto: 0,
  medioDiaMoto: 0,
  diaMoto: 0,
  mensualidadMoto: 0,
};

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value);
}

interface TarifaRow {
  key: keyof AppSettings;
  label: string;
  description: string;
}

const carroRows: TarifaRow[] = [
  { key: "fraccionCarro",   label: "Fracción (≤15 min)",  description: "Cobro mínimo de entrada" },
  { key: "horaCarro",       label: "Hora (≤60 min)",      description: "Hasta una hora completa" },
  { key: "medioDiaCarro",   label: "Medio día (≤6 h)",    description: "Hasta seis horas" },
  { key: "diaCarro",        label: "Día (≤12 h)",         description: "Hasta doce horas" },
  { key: "mensualidadCarro",label: "Mensualidad",         description: "Tarifa mensual fija" },
];

const motoRows: TarifaRow[] = [
  { key: "fraccionMoto",    label: "Fracción (≤15 min)",  description: "Cobro mínimo de entrada" },
  { key: "horaMoto",        label: "Hora (≤60 min)",      description: "Hasta una hora completa" },
  { key: "medioDiaMoto",    label: "Medio día (≤6 h)",    description: "Hasta seis horas" },
  { key: "diaMoto",         label: "Día (≤12 h)",         description: "Hasta doce horas" },
  { key: "mensualidadMoto", label: "Mensualidad",         description: "Tarifa mensual fija" },
];

function TarifaSection({ title, rows, settings, form, onChange }: {
  title: string;
  rows: TarifaRow[];
  settings: AppSettings | null;
  form: Partial<AppSettings>;
  onChange: (key: keyof AppSettings, value: string) => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden card-hover bg-page-card backdrop-blur border border-border-default">
      <div className="px-6 py-4 flex items-center gap-3 border-b border-border-soft">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-dim border border-primary/20">
          <Car className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="divide-y divide-border-soft">
        {rows.map((row) => (
          <div key={row.key} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{row.label}</p>
              <p className="text-xs mt-0.5 text-text-dim">{row.description}</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
              {settings && (
                <span className="text-xs font-medium text-text-dim">
                  actual: {formatCOP(settings[row.key] as number)}
                </span>
              )}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={(form[row.key] as number) ?? ""}
                  onChange={(e) => onChange(row.key, e.target.value)}
                  className="pl-6 pr-3 py-2 rounded-lg text-sm outline-none w-32 text-right transition-colors duration-150 bg-page-input border border-border-medium text-text-primary"
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-medium)"; }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TarifasPage() {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const settingsQuery = useSettings(tenantId);
  const updateSettingsMutation = useUpdateSettings(tenantId);
  const settings = settingsQuery.data ?? null;
  const loading = settingsQuery.isLoading;
  const saving = updateSettingsMutation.isPending;
  const [form, setForm] = useState<Partial<AppSettings>>(EMPTY_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sincroniza el formulario con la configuración recibida al cargar o refrescar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settingsQuery.isError) { setError("No se pudo cargar la configuración."); return; }
    if (settingsQuery.data !== undefined) setForm(settingsQuery.data ?? EMPTY_SETTINGS);
  }, [settingsQuery.data, settingsQuery.isError]);

  function handleChange(key: keyof AppSettings, value: string) {
    const digits = value.replace(/\D/g, "");
    const num = parseInt(digits, 10);
    setForm((p) => ({ ...p, [key]: isNaN(num) ? 0 : num }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const updated = await updateSettingsMutation.mutateAsync(form);
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Error al guardar las tarifas.");
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Tarifas</h1>
          <p className="text-sm text-text-secondary">
            Configura los precios por tipo de vehículo y tiempo de permanencia
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 bg-danger-dim border border-destructive/30 text-destructive">
          {error}
        </div>
      )}

      {/* Negocio nuevo: aún no hay tarifas configuradas. Damos la bienvenida en
          vez de mostrar un error. */}
      {!loading && !error && !settings && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-start gap-3 bg-primary-dim border border-primary/30 text-primary">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white mb-0.5">¡Bienvenido!</p>
            <p>Aún no has configurado las tarifas de tu negocio. Ingresa los precios por tipo de vehículo y guárdalos para empezar a operar.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <TarifaSection title="Carro / Taxi" rows={carroRows} settings={settings} form={form} onChange={handleChange} />
          <TarifaSection title="Moto" rows={motoRows} settings={settings} form={form} onChange={handleChange} />

          <div className="flex items-center justify-end gap-4">
            {saved && (
              <span className="text-sm flex items-center gap-1.5 text-ok">
                <Check className="w-4 h-4" />
                Tarifas guardadas
              </span>
            )}
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors duration-150">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
              ) : (
                <><Save className="w-4 h-4" />Guardar Tarifas</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
