"use client";

import { useState } from "react";
import type { CajaReport } from "@/lib/api";
import { DatePicker } from "@/components/ui/date-picker";
import { StatCard } from "./StatCard";
import { formatCOP, formatTime, exportCajaPDF } from "./helpers";
import { FileText, RefreshCw, Calendar } from "lucide-react";

interface CajaSectionProps {
  onGenerate: (fecha: string) => Promise<void>;
  loading: boolean;
  report: CajaReport | null;
  error: string | null;
}

export function CajaSection({ onGenerate, loading, report, error }: CajaSectionProps) {
  const [fecha, setFecha] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  });
  const [exporting, setExporting] = useState(false);

  async function handleExportPDF() {
    if (!report) return;
    setExporting(true);
    try {
      await exportCajaPDF(report);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="border-t border-border-default pt-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Cierre de Caja</h2>
          <p className="text-sm text-text-secondary">Resumen diario de ingresos para cuadre al final del turno</p>
        </div>
        {report && (
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-colors duration-200 bg-ok-dim border border-ok/30 text-ok hover:bg-ok/20">
            <FileText className="w-4 h-4" />
            {exporting ? "Generando PDF..." : "Exportar PDF"}
          </button>
        )}
      </div>

      {/* Date picker + generate button */}
      <div className="flex items-center gap-3 mb-6">
        <DatePicker
          value={fecha}
          onChange={(v) => { setFecha(v); }}
        />
        <button
          onClick={() => onGenerate(fecha)}
          disabled={loading || !fecha}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-colors duration-200 bg-primary-dim border border-primary/30 text-primary hover:bg-primary/20">
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          {loading ? "Generando..." : "Generar Cierre"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm bg-danger-dim border border-destructive/30 text-destructive">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Total del día */}
          <div className="rounded-2xl p-7 mb-6 text-center bg-ok-dim border border-ok/30">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-text-dim">Total recaudado</p>
            <p className="text-4xl font-bold mb-2 text-ok">
              {formatCOP(report.totalCOP)}
            </p>
            <p className="text-sm text-text-secondary">
              {(() => { const [y2, m2, d2] = report.fecha.split("-"); return `${d2}/${m2}/${y2}`; })()}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Vehículos totales" value={String(report.totalVehiculos)} accent="var(--primary)" loading={false} />
            <StatCard label="Visitantes" value={String(report.visitantes)} accent="var(--text-secondary)" loading={false} sub="Sin mensualidad" />
            <StatCard label="Mensualidades" value={String(report.mensualidades)} accent="var(--ok)" loading={false} sub="Con mensualidad activa" />
            <StatCard label="Cobros realizados" value={String(report.cobros.length)} accent="var(--text-secondary)" loading={false} />
          </div>

          {/* Hourly breakdown */}
          {report.desglosePorHora.length > 0 && (
            <div className="rounded-2xl p-5 mb-6 bg-page-card backdrop-blur border border-border-default">
              <h3 className="text-sm font-semibold text-white mb-4">Desglose por hora</h3>
              <div className="flex items-end gap-2 h-20">
                {report.desglosePorHora.map(({ hora, cantidad }) => {
                  const max = Math.max(...report.desglosePorHora.map((h) => h.cantidad), 1);
                  return (
                    <div key={hora} className="flex flex-col items-center flex-1 gap-1">
                      <span className="text-xs font-bold text-primary">{cantidad}</span>
                      <div className="w-full rounded-t bg-primary" style={{ height: `${(cantidad / max) * 48}px`, minHeight: "4px" }} />
                      <span className="text-xs font-mono text-text-muted" style={{ fontSize: "10px" }}>{hora}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed cobros table */}
          <div className="rounded-2xl overflow-hidden mb-6 bg-page-card backdrop-blur border border-border-default">
            <div className="px-5 py-4 flex items-center justify-between border-b border-border-soft">
              <h3 className="text-sm font-semibold text-white">Detalle de cobros</h3>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary-dim text-primary border border-primary/20">
                {report.cobros.length} {report.cobros.length === 1 ? "cobro" : "cobros"}
              </span>
            </div>
            {report.cobros.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-text-dim">
                No hay cobros registrados para esta fecha
              </div>
            ) : (
              <div>
                {/* Tabla (desktop) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-soft">
                        {["Placa", "Tipo", "Entrada", "Salida", "Duración", "Monto", ""].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-dim">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.cobros.map((c, i) => (
                        <tr key={i} className={i < report.cobros.length - 1 ? "border-b border-border-row" : ""}>
                          <td className="px-5 py-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded font-mono bg-primary-dim text-primary border border-primary/25">
                              {c.placa}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-text-secondary">{c.tipo}</td>
                          <td className="px-5 py-3 text-sm font-mono text-text-secondary">{formatTime(c.horaEntrada)}</td>
                          <td className="px-5 py-3 text-sm font-mono text-text-secondary">{formatTime(c.horaSalida)}</td>
                          <td className="px-5 py-3 text-sm text-text-muted">{c.duracion}</td>
                          <td className={`px-5 py-3 text-sm font-semibold ${c.monto > 0 ? "text-ok" : "text-text-muted"}`}>
                            {formatCOP(c.monto)}
                          </td>
                          <td className="px-5 py-3">
                            {c.esMensualidad ? (
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-ok-dim text-ok border border-ok/25">
                                Mensualidad
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-warn-dim text-warn border border-warn/25">
                                Visitante
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border-default">
                        <td colSpan={5} className="px-5 py-3 text-sm font-semibold text-white">Total</td>
                        <td className="px-5 py-3 text-sm font-bold text-ok">{formatCOP(report.totalCOP)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Tarjetas (móvil) */}
                <div className="md:hidden p-4 space-y-3">
                  {report.cobros.map((c, i) => (
                    <div key={i} className="rounded-xl p-4 space-y-3 bg-page-subtle border border-border-default">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded font-mono bg-primary-dim text-primary border border-primary/25">
                          {c.placa}
                        </span>
                        {c.esMensualidad ? (
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-ok-dim text-ok border border-ok/25">
                            Mensualidad
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-warn-dim text-warn border border-warn/25">
                            Visitante
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 pt-1 border-t border-border-soft">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Tipo</span>
                          <span className="text-sm text-right text-text-secondary">{c.tipo}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Entrada → Salida</span>
                          <span className="text-sm text-right font-mono text-text-secondary">{formatTime(c.horaEntrada)} → {formatTime(c.horaSalida)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Duración</span>
                          <span className="text-sm text-right text-text-muted">{c.duracion}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Monto</span>
                          <span className={`text-sm font-semibold text-right ${c.monto > 0 ? "text-ok" : "text-text-muted"}`}>{formatCOP(c.monto)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-1 pt-2 border-t-2 border-border-default">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <span className="text-sm font-bold text-ok">{formatCOP(report.totalCOP)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
