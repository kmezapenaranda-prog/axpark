"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { downloadReceipt, type ActiveVehicle } from "@/lib/api";
import { useActiveVehicles, useRegisterVehicleEntry, useExitVehicle } from "@/hooks/use-parking";
import { invalidateAfter } from "@/lib/query-invalidation";
import { useAuth } from "@/components/auth-provider";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, isUnconfirmed, type SubmitNotice } from "@/lib/submit-error";
import { LogOut, LogIn, Loader2, AlertCircle, CheckCircle2, Search, Car, Clock, X, Receipt, TriangleAlert } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { Sheet } from "@/components/ui/sheet";

const ENTRY_TYPE_OPTIONS = [
  { value: "car", label: "Carro" },
  { value: "moto", label: "Moto" },
];

// Backend returns "DD/MM/YYYY HH:mm:ss" via DateFormatterInterceptor
function parseColombianDate(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/");
  return new Date(`${year}-${month}-${day}T${timePart}`);
}

function elapsedTime(entryTime: string): string {
  const entry = parseColombianDate(entryTime);
  const diffMs = Date.now() - entry.getTime();
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatTime(dateStr: string): string {
  return parseColombianDate(dateStr).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

const vehicleTypeLabel: Record<string, string> = { car: "Carro", moto: "Moto", truck: "Camión" };

const entryActionLabel: Record<string, string> = {
  GRANTED: "Mensualidad activa",
  ALERT: "Mensualidad vencida",
  VISITOR: "Visitante",
};

function ExitDrawer({
  vehicle,
  onClose,
  onConfirm,
  loading,
  notice,
}: {
  vehicle: ActiveVehicle;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  notice: SubmitNotice | null;
}) {
  return (
    <>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-danger-dim border border-destructive/30">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dar Salida</h2>
              <p className="text-xs text-text-muted">Confirma la salida del vehículo</p>
            </div>
          </div>
          <button
            onClick={() => { if (!loading) onClose(); }}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary cursor-pointer flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-xl p-4 space-y-3 bg-page-row-hover border border-border-default">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Placa</span>
              <span className="text-sm font-bold tracking-wider px-2.5 py-1 rounded-lg bg-primary-dim text-primary font-mono">
                {vehicle.plate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Tipo</span>
              <span className="text-sm text-text-secondary">{vehicleTypeLabel[vehicle.vehicleType] ?? vehicle.vehicleType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Hora de ingreso</span>
              <span className="text-sm text-text-secondary">{formatTime(vehicle.entryTime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Tiempo transcurrido</span>
              <span className="text-sm font-semibold text-warn">{elapsedTime(vehicle.entryTime)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border-soft">
              <span className="text-xs font-semibold text-text-muted">Cobro estimado</span>
              <span className="text-base font-bold text-ok">{formatCOP(vehicle.estimatedCost)}</span>
            </div>
          </div>

          <NoticeBox notice={notice} className="mt-4" />
        </div>

        <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 text-white bg-destructive">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</>
            ) : (
              <><LogOut className="w-4 h-4" />Confirmar Salida</>
            )}
          </button>
        </div>
    </>
  );
}

function EntryDrawer({
  plate,
  onPlateChange,
  vehicleType,
  onVehicleTypeChange,
  onClose,
  onConfirm,
  loading,
  notice,
}: {
  plate: string;
  onPlateChange: (v: string) => void;
  vehicleType: "car" | "moto";
  onVehicleTypeChange: (v: "car" | "moto") => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  notice: SubmitNotice | null;
}) {
  return (
    <>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-ok-dim border border-ok/30">
              <LogIn className="w-5 h-5 text-ok" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registrar Entrada</h2>
              <p className="text-xs text-text-muted">Ingresa la placa del vehículo</p>
            </div>
          </div>
          <button
            onClick={() => { if (!loading) onClose(); }}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary cursor-pointer flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <label htmlFor="entry-plate" className="text-xs font-semibold uppercase tracking-wider text-text-dim">
            Placa
          </label>
          <input
            id="entry-plate"
            type="text"
            autoFocus
            value={plate}
            onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading && plate.trim()) onConfirm(); }}
            placeholder="ABC123"
            className="mt-2 w-full px-4 py-2.5 rounded-xl text-sm font-mono tracking-wider text-white outline-none border border-border-medium bg-page-input"
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-text-dim">
            Tipo de vehículo
          </label>
          <div className="mt-2">
            <CustomSelect
              value={vehicleType}
              onChange={(v) => onVehicleTypeChange(v as "car" | "moto")}
              options={ENTRY_TYPE_OPTIONS}
            />
          </div>

          <NoticeBox notice={notice} className="mt-4" />
        </div>

        <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading || !plate.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 text-white bg-ok">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</>
            ) : (
              <><LogIn className="w-4 h-4" />Confirmar Entrada</>
            )}
          </button>
        </div>
    </>
  );
}

export default function ParkingPage() {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const queryClient = useQueryClient();
  const activeVehiclesQuery = useActiveVehicles(tenantId);
  const registerEntryMutation = useRegisterVehicleEntry(tenantId);
  const exitVehicleMutation = useExitVehicle(tenantId);

  const vehicles = activeVehiclesQuery.data ?? [];
  const loading = activeVehiclesQuery.isLoading;
  const error = activeVehiclesQuery.isError ? "No se pudo conectar con el servidor." : null;
  const lastUpdate = activeVehiclesQuery.dataUpdatedAt ? new Date(activeVehiclesQuery.dataUpdatedAt) : null;
  const exitLoading = exitVehicleMutation.isPending;
  const entryLoading = registerEntryMutation.isPending;

  const [, setTick] = useState(0);
  const [exitTarget, setExitTarget] = useState<ActiveVehicle | null>(null);
  const [exitNotice, setExitNotice] = useState<SubmitNotice | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryPlate, setEntryPlate] = useState("");
  const [entryType, setEntryType] = useState<"car" | "moto">("car");
  const [entryNotice, setEntryNotice] = useState<SubmitNotice | null>(null);
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null);
  const [exitReceipt, setExitReceipt] = useState<{ plate: string; url: string } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const q = search.trim().toLowerCase();
  const filteredVehicles = q
    ? vehicles.filter((v) => v.plate.toLowerCase().includes(q))
    : vehicles;
  const alertVehicles = vehicles.filter((v) => v.excessiveTimeAlert);

  const handleEntry = async () => {
    const plate = entryPlate.trim();
    if (!plate) return;
    setEntryNotice(null);
    try {
      const result = await registerEntryMutation.mutateAsync({ plate, vehicleType: entryType });
      setEntryOpen(false);
      setEntryPlate("");
      setEntryType("car");
      setEntrySuccess(`${result.plate} · ${entryActionLabel[result.action] ?? result.action}`);
    } catch (err: unknown) {
      setEntryNotice(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "registerVehicleEntry", tenantId);
    }
  };

  useEffect(() => {
    if (!entrySuccess) return;
    const t = setTimeout(() => setEntrySuccess(null), 4000);
    return () => clearTimeout(t);
  }, [entrySuccess]);

  const handleExit = async () => {
    if (!exitTarget) return;
    setExitNotice(null);
    try {
      const result = await exitVehicleMutation.mutateAsync(exitTarget.plate);
      setExitTarget(null);
      setExitReceipt({ plate: result.plate, url: result.receiptUrl });
      downloadReceipt(result.receiptUrl, `recibo-${result.plate}.pdf`).catch(() => {
        // La salida ya quedó registrada; el recibo se puede bajar desde el aviso.
      });
    } catch (err: unknown) {
      // Dejamos el modal abierto con el aviso. Ante red/timeout la salida pudo
      // registrarse igual: refrescamos el listado para que el operador verifique.
      setExitNotice(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "exitVehicle", tenantId);
    }
  };

  return (
    <div className="px-4 py-5 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Parking Activo</h1>
          <p className="text-sm text-text-secondary">Vehículos dentro del parqueadero en este momento</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {lastUpdate && (
            <span className="hidden sm:inline text-xs text-text-dim">
              Actualizado {lastUpdate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap bg-ok-dim border border-ok/25">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-ok" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-ok" />
            </span>
            <span className="text-xs text-ok">En vivo · 10s</span>
          </div>
          <button
            onClick={() => { setEntryNotice(null); setEntryPlate(""); setEntryType("car"); setEntryOpen(true); }}
            className="ml-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer text-white bg-ok hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Registrar Entrada
          </button>
        </div>
      </div>

      {/* Éxito registro entrada */}
      {entrySuccess && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 border border-ok/30 text-ok bg-ok-dim">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          Entrada registrada: {entrySuccess}
        </div>
      )}

      {/* Salida registrada: link al desprendible */}
      {exitReceipt && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center justify-between gap-3 border border-ok/30 text-ok bg-ok-dim">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            Salida registrada: {exitReceipt.plate}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() =>
                downloadReceipt(exitReceipt.url, `recibo-${exitReceipt.plate}.pdf`).catch((err: unknown) =>
                  alert(err instanceof Error ? err.message : "No se pudo descargar el recibo"),
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-ok/40 text-ok hover:bg-ok/10"
            >
              <Receipt className="w-3.5 h-3.5" />
              Descargar recibo
            </button>
            <button
              onClick={() => setExitReceipt(null)}
              className="p-1 rounded-lg text-ok/70 hover:text-ok cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Vehículos con más de 24h dentro: posible abandono o evasión de cobro */}
      {!loading && alertVehicles.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl flex flex-wrap items-center gap-3 bg-danger-dim border border-destructive/30">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-destructive/15">
            <TriangleAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-sm text-destructive">
              {alertVehicles.length} vehículo{alertVehicles.length !== 1 ? "s" : ""} con más de 24h dentro
            </p>
            <p className="text-xs mt-0.5 text-text-secondary">
              {alertVehicles.map((v) => v.plate).join(", ")} — revisa si siguen estacionados o hay un error de registro.
            </p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        {[
          { label: "Vehículos adentro", value: loading ? "—" : String(vehicles.length), color: "var(--primary)" },
          {
            label: "Tiempo promedio",
            value: loading || vehicles.length === 0 ? "—" : (() => {
              const avg = vehicles.reduce((acc, v) => acc + v.currentMinutes, 0) / vehicles.length;
              const h = Math.floor(avg / 60);
              const m = Math.round(avg % 60);
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            })(),
            color: "var(--text-secondary)",
          },
          {
            label: "Última actualización",
            value: lastUpdate ? lastUpdate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—",
            color: "var(--ok)",
          },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-2xl p-3 sm:p-5 border border-border-default bg-page-card backdrop-blur">
            <p className="text-[11px] sm:text-xs leading-tight font-medium mb-1 text-text-muted">{stat.label}</p>
            <p className="text-lg sm:text-2xl font-bold truncate tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 border border-destructive/30 text-destructive bg-danger-dim">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6 relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por placa..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none border border-border-medium bg-page-input"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden border border-border-default bg-page-card backdrop-blur">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm text-text-muted">Cargando...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-primary-dim">
              <Car className="w-8 h-8 text-primary" />
            </div>
            <p className="text-white font-semibold mb-1">Parqueadero vacío</p>
            <p className="text-sm text-text-muted">No hay vehículos dentro en este momento</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-white font-semibold mb-1">Sin resultados</p>
            <p className="text-sm text-text-muted">Ningún vehículo dentro coincide con &quot;{search}&quot;</p>
          </div>
        ) : (
          <div>
            {/* Tabla (desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-b-border-soft">
                    {["Placa", "Tipo", "Hora de ingreso", "Tiempo dentro", "Costo estimado", "Acción"].map((col) => (
                      <th key={col} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v, i) => (
                    <tr key={v.id}
                      className={`transition-colors duration-150 ${i < filteredVehicles.length - 1 ? "border-b border-border-row" : ""} ${v.excessiveTimeAlert ? "bg-danger-dim/40 hover:bg-danger-dim/60" : "hover:bg-page-row-hover"}`}>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider text-primary font-mono bg-primary-dim border border-primary/30">
                          {v.plate}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-text-secondary">{vehicleTypeLabel[v.vehicleType] ?? v.vehicleType}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-text-secondary">{formatTime(v.entryTime)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${v.excessiveTimeAlert ? "text-destructive" : "text-warn"}`}>
                          {v.excessiveTimeAlert ? <TriangleAlert className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {elapsedTime(v.entryTime)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-ok">{formatCOP(v.estimatedCost)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => { setExitNotice(null); setExitTarget(v); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer border border-destructive/30 text-destructive bg-danger-dim hover:bg-destructive/25">
                          <LogOut className="w-3.5 h-3.5" />
                          Dar salida
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (móvil) */}
            <div className="md:hidden p-4 space-y-3">
              {filteredVehicles.map((v) => (
                <div key={v.id} className={`rounded-xl p-4 space-y-3 border ${v.excessiveTimeAlert ? "bg-danger-dim/40 border-destructive/35" : "bg-page-card border-border-default"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider text-primary font-mono bg-primary-dim border border-primary/30">
                      {v.plate}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${v.excessiveTimeAlert ? "text-destructive" : "text-warn"}`}>
                      {v.excessiveTimeAlert ? <TriangleAlert className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {elapsedTime(v.entryTime)}
                    </span>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-t-border-soft">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Tipo</span>
                      <span className="text-sm text-right text-text-secondary">{vehicleTypeLabel[v.vehicleType] ?? v.vehicleType}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Ingreso</span>
                      <span className="text-sm text-right text-text-secondary">{formatTime(v.entryTime)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Costo estimado</span>
                      <span className="text-sm font-semibold text-right text-ok">{formatCOP(v.estimatedCost)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setExitNotice(null); setExitTarget(v); }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer border border-destructive/30 text-destructive bg-danger-dim">
                    <LogOut className="w-3.5 h-3.5" />
                    Dar salida
                  </button>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-t-border-soft">
              <p className="text-xs text-text-dim">
                {filteredVehicles.length} vehículo{filteredVehicles.length !== 1 ? "s" : ""} · Actualización automática cada 10 segundos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Exit drawer */}
      <Sheet open={!!exitTarget} onClose={() => { if (!exitLoading) { setExitTarget(null); setExitNotice(null); } }}>
        {exitTarget && (
          <ExitDrawer
          vehicle={exitTarget}
          onClose={() => { if (!exitLoading) { setExitTarget(null); setExitNotice(null); } }}
          onConfirm={handleExit}
          loading={exitLoading}
          notice={exitNotice}
        />
        )}
      </Sheet>

      {/* Entry drawer */}
      <Sheet open={!!entryOpen} onClose={() => { if (!entryLoading) { setEntryOpen(false); setEntryNotice(null); } }}>
        {entryOpen && (
          <EntryDrawer
          plate={entryPlate}
          onPlateChange={setEntryPlate}
          vehicleType={entryType}
          onVehicleTypeChange={setEntryType}
          onClose={() => { if (!entryLoading) { setEntryOpen(false); setEntryNotice(null); } }}
          onConfirm={handleEntry}
          loading={entryLoading}
          notice={entryNotice}
        />
        )}
      </Sheet>
    </div>
  );
}
