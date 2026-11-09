"use client";

import { useState } from "react";
import type { CajaReport } from "@/lib/api";
import { useMemberships } from "@/hooks/use-memberships";
import { useEntries, useReportSummary, useGenerateCajaReport } from "@/hooks/use-reports";
import { useAuth } from "@/components/auth-provider";
import { StatCard } from "@/components/reports/StatCard";
import { ExportBtn } from "@/components/reports/ExportBtn";
import { HoursChart } from "@/components/reports/HoursChart";
import { TopPlatesChart } from "@/components/reports/TopPlatesChart";
import { CajaSection } from "@/components/reports/CajaSection";
import { formatCOP, isoToDisplay } from "@/components/reports/helpers";
import { RefreshCw } from "lucide-react";

// ── Excel export ────────────────────────────────────────────────────────────
async function exportXlsx(sheets: { name: string; rows: Record<string, unknown>[] }[], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename);
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const membershipsQuery = useMemberships(tenantId);
  const entriesQuery = useEntries(tenantId);
  const summaryQuery = useReportSummary(tenantId);
  const generateCajaMutation = useGenerateCajaReport(tenantId);

  const entries = entriesQuery.data ?? [];
  const memberships = membershipsQuery.data ?? [];
  const summary = summaryQuery.data ?? null;
  const loading = membershipsQuery.isLoading || entriesQuery.isLoading || summaryQuery.isLoading;
  const fetching = membershipsQuery.isFetching || entriesQuery.isFetching || summaryQuery.isFetching;
  const error = membershipsQuery.isError || entriesQuery.isError || summaryQuery.isError
    ? "No se pudo conectar con el servidor."
    : null;
  const lastUpdated = summaryQuery.dataUpdatedAt
    ? new Date(summaryQuery.dataUpdatedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : null;
  const [exporting, setExporting] = useState(false);

  // Cierre de caja state
  const [cajaReport, setCajaReport] = useState<CajaReport | null>(null);
  const cajaLoading = generateCajaMutation.isPending;
  const [cajaError, setCajaError] = useState<string | null>(null);

  function load() {
    membershipsQuery.refetch();
    entriesQuery.refetch();
    summaryQuery.refetch();
  }

  // ── Derived metrics ──────────────────────────────────────────────────────
  const closedEntries = entries.filter((e) => e.exitTime && e.amountPaid != null);

  const incomeToday = summary?.ingresosHoy ?? 0;
  const incomeWeek = summary?.ingresos7Dias ?? 0;
  const incomeMonth = summary?.ingresos30Dias ?? 0;

  const clientCount = summary?.clientes ?? 0;
  const vehicleCount = summary?.vehiculos ?? 0;
  const activeMemberships = summary?.mensualidadesActivas ?? 0;
  const expiredMemberships = summary?.mensualidadesVencidas ?? 0;

  const topPlates = (summary?.vehiculosFrecuentes ?? []).map(({ plate, cantidad }) => ({
    plate,
    count: cantidad,
  }));

  const peakHours = (summary?.horasPico ?? []).map(({ hora, cantidad }) => ({
    hour: hora,
    count: cantidad,
  }));

  // Companies (memberships)
  const companyCounts: Record<string, { count: number; active: number }> = {};
  memberships.forEach((m) => {
    if (!m.company) return;
    if (!companyCounts[m.company]) companyCounts[m.company] = { count: 0, active: 0 };
    companyCounts[m.company].count++;
    if (m.status === "active") companyCounts[m.company].active++;
  });
  const companyRows = Object.entries(companyCounts).sort((a, b) => b[1].count - a[1].count);

  // ── Excel exports ────────────────────────────────────────────────────────
  async function exportIngresos() {
    setExporting(true);
    try {
      const rows = closedEntries.map((e) => ({
        Placa: e.plate,
        Tipo: e.vehicleType ?? "—",
        "Hora entrada": e.entryTime,
        "Hora salida": e.exitTime ?? "—",
        "Cobrado (COP)": e.amountPaid ?? 0,
      }));
      await exportXlsx([{ name: "Ingresos", rows }], "ingresos.xlsx");
    } finally {
      setExporting(false);
    }
  }

  async function exportMensualidades() {
    setExporting(true);
    try {
      const rows = memberships
        .filter((m) => m.status === "active")
        .map((m) => ({
          Cliente: m.client?.fullName ?? `#${m.clientId}`,
          Placa: m.vehicle?.plate ?? `#${m.vehicleId}`,
          Tipo: m.vehicle?.type ?? "—",
          Empresa: m.company ?? "—",
          Inicio: isoToDisplay(m.startDate),
          Vencimiento: isoToDisplay(m.endDate),
          "Precio (COP)": m.price,
        }));
      await exportXlsx([{ name: "Mensualidades activas", rows }], "mensualidades_activas.xlsx");
    } finally {
      setExporting(false);
    }
  }

  async function exportHistorial() {
    setExporting(true);
    try {
      const rows = entries.map((e) => ({
        Placa: e.plate,
        Tipo: e.vehicleType ?? "—",
        "Hora entrada": e.entryTime,
        "Hora salida": e.exitTime ?? "En parqueadero",
        "Cobrado (COP)": e.amountPaid ?? (e.exitTime ? 0 : "—"),
      }));
      await exportXlsx([{ name: "Historial" , rows }], "historial_entradas.xlsx");
    } finally {
      setExporting(false);
    }
  }

  async function exportEmpresas() {
    setExporting(true);
    try {
      const rows = companyRows.map(([company, { count, active }]) => ({
        Empresa: company,
        "Total mensualidades": count,
        "Mensualidades activas": active,
        "Mensualidades vencidas": count - active,
      }));
      await exportXlsx([{ name: "Cobros por empresa", rows }], "cobros_empresa.xlsx");
    } finally {
      setExporting(false);
    }
  }

  async function generarCierre(fecha: string) {
    setCajaError(null);
    setCajaReport(null);
    try {
      const report = await generateCajaMutation.mutateAsync(fecha);
      setCajaReport(report);
    } catch (e: unknown) {
      setCajaError(e instanceof Error ? e.message : "Error al generar cierre");
    }
  }

  return (
    <div className="px-4 py-5 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Reportes</h1>
          <p className="text-sm text-text-secondary">Métricas y exportación de datos</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && !fetching && <span className="text-xs text-text-dim">Actualizado {lastUpdated}</span>}
          <button onClick={load} disabled={fetching}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 bg-primary-dim text-primary border border-primary/30">
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 bg-danger-dim border border-destructive/30 text-destructive">
          {error}
        </div>
      )}

      {/* Ingresos */}
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-text-dim">Ingresos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Ingresos hoy" value={formatCOP(incomeToday)} accent="var(--ok)" loading={loading} />
        <StatCard label="Ingresos últimos 7 días" value={formatCOP(incomeWeek)} accent="var(--primary)" loading={loading} />
        <StatCard label="Ingresos últimos 30 días" value={formatCOP(incomeMonth)} accent="var(--text-secondary)" loading={loading} />
      </div>

      {/* Vehículos y mensualidades */}
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-text-dim">General</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clientes" value={String(clientCount)} accent="var(--primary)" loading={loading} />
        <StatCard label="Vehículos" value={String(vehicleCount)} accent="var(--text-secondary)" loading={loading} />
        <StatCard label="Mensualidades activas" value={String(activeMemberships)} accent="var(--ok)" loading={loading} />
        <StatCard label="Mensualidades vencidas" value={String(expiredMemberships)} accent="var(--destructive)" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <HoursChart data={peakHours} loading={loading} />
        <TopPlatesChart data={topPlates} loading={loading} />
      </div>

      {/* Empresas */}
      {!loading && companyRows.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-text-dim">Cobros por empresa</h2>
          <div className="rounded-2xl overflow-hidden mb-8 bg-page-card backdrop-blur border border-border-default">
            {/* Tabla (desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-soft">
                    {["Empresa", "Total mensualidades", "Activas", "Vencidas"].map((c) => (
                      <th key={c} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companyRows.map(([company, { count, active }], i) => (
                    <tr key={company} className={i < companyRows.length - 1 ? "border-b border-border-row" : ""}>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-page-subtle border border-border-medium text-text-secondary">
                          {company}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-white">{count}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-ok">{active}</td>
                      <td className="px-5 py-3 text-sm text-destructive">{count - active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (móvil) */}
            <div className="md:hidden p-4 space-y-3">
              {companyRows.map(([company, { count, active }]) => (
                <div key={company} className="rounded-xl p-4 space-y-3 bg-page-subtle border border-border-default">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-page-input border border-border-medium text-text-secondary">
                    {company}
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{count}</p>
                      <p className="text-xs text-text-dim">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-ok">{active}</p>
                      <p className="text-xs text-text-dim">Activas</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-destructive">{count - active}</p>
                      <p className="text-xs text-text-dim">Vencidas</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Export buttons */}
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-text-dim">Exportar a Excel</h2>
      <div className="flex flex-wrap gap-3 mb-12">
        <ExportBtn label="Ingresos del período" onClick={exportIngresos} loading={exporting} />
        <ExportBtn label="Mensualidades activas" onClick={exportMensualidades} loading={exporting} />
        <ExportBtn label="Historial entradas/salidas" onClick={exportHistorial} loading={exporting} />
        <ExportBtn label="Cobros por empresa" onClick={exportEmpresas} loading={exporting} />
      </div>

      <CajaSection onGenerate={generarCierre} loading={cajaLoading} report={cajaReport} error={cajaError} />
    </div>
  );
}
