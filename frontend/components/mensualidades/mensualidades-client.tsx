"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { downloadReceipt, type Membership } from "@/lib/api";
import { useMemberships, useExpiringMemberships, useCreateMembership, useDeleteMembership, useRenewMembership } from "@/hooks/use-memberships";
import { useVehicles } from "@/hooks/use-vehicles";
import { useSettings } from "@/hooks/use-settings";
import { invalidateAfter } from "@/lib/query-invalidation";
import { useAuth } from "@/components/auth-provider";
import { CustomSelect } from "@/components/ui/custom-select";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, isUnconfirmed, UNCONFIRMED_MESSAGE, type SubmitNotice } from "@/lib/submit-error";
import { MensualidadesTable } from "./mensualidades-table";
import { ExpiringAlert } from "./expiring-alert";
import { OverdueAlert } from "./overdue-alert";
import { RenewModal } from "./renew-modal";
import { TableSkeleton } from "./table-skeleton";
import { Plus, AlertCircle, Search, Trash2, Loader2, CheckCircle2, Receipt, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { motion } from "motion/react";

type FilterTab = "todas" | "activas" | "vencidas" | "proximas";
const tabs: { value: FilterTab; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "activas", label: "Activas" },
  { value: "vencidas", label: "Vencidas" },
  { value: "proximas", label: "Próximas a vencer" },
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function nextMonthISO() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

export function MensualidadesClient() {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const queryClient = useQueryClient();
  const membershipsQuery = useMemberships(tenantId);
  const expiringQuery = useExpiringMemberships(tenantId);
  const vehiclesQuery = useVehicles(tenantId);
  const settingsQuery = useSettings(tenantId);
  const createMembershipMutation = useCreateMembership(tenantId);
  const deleteMembershipMutation = useDeleteMembership(tenantId);
  const renewMembershipMutation = useRenewMembership(tenantId);

  const memberships = membershipsQuery.data ?? [];
  const expiring = expiringQuery.data ?? [];
  const overdue = memberships.filter((m) => m.status === "expired" && m.daysOverdue >= 1);
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const settings = settingsQuery.data ?? null;
  const loading = membershipsQuery.isLoading || expiringQuery.isLoading || vehiclesQuery.isLoading;
  const error = membershipsQuery.isError || expiringQuery.isError || vehiclesQuery.isError
    ? "No se pudo conectar con el servidor."
    : null;

  const [activeTab, setActiveTab] = useState<FilterTab>("todas");
  const [companyFilter, setCompanyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [renewTarget, setRenewTarget] = useState<Membership | null>(null);
  const renewing = renewMembershipMutation.isPending;
  const [deleteTarget, setDeleteTarget] = useState<Membership | null>(null);
  const deleting = deleteMembershipMutation.isPending;
  const [deleteError, setDeleteError] = useState<SubmitNotice | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<{ plate: string; url: string } | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    vehicleId: "" as number | "",
    startDate: todayISO(),
    endDate: nextMonthISO(),
    price: "",
    company: "",
  });
  const creating = createMembershipMutation.isPending;
  const [createError, setCreateError] = useState<SubmitNotice | null>(null);

  // Auto-open create modal when navigated from vehiculos wizard (?vehicleId=X)
  const preselectRef = useRef<number | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get("vehicleId");
    if (vid) {
      const id = Number(vid);
      if (!isNaN(id)) preselectRef.current = id;
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const priceForVehicle = useCallback((vehicleId: number | "") => {
    if (!settings || !vehicleId) return "";
    const v = vehicles.find((x) => x.id === vehicleId);
    const isMoto = v?.type === "moto";
    return String(isMoto ? settings.mensualidadMoto : settings.mensualidadCarro);
  }, [settings, vehicles]);

  // Apply vehicleId preselect once vehicles are loaded
  useEffect(() => {
    if (loading || preselectRef.current === null) return;
    const id = preselectRef.current;
    preselectRef.current = null;
    setCreateForm((prev) => ({ ...prev, vehicleId: id, price: priceForVehicle(id) }));
    setCreateOpen(true);
  }, [loading, priceForVehicle]);

  const companies = Array.from(new Set(memberships.map((m) => m.company).filter(Boolean))) as string[];

  const q = search.trim().toLowerCase();
  const filtered = memberships.filter((m) => {
    if (activeTab === "activas" && m.status !== "active") return false;
    if (activeTab === "vencidas" && m.status !== "expired") return false;
    if (activeTab === "proximas" && !expiring.some((e) => e.id === m.id)) return false;
    if (companyFilter && m.company !== companyFilter) return false;
    if (q) {
      const matches =
        m.vehicle?.plate?.toLowerCase().includes(q) ||
        m.client?.fullName?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMembershipMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "deleteMembership", tenantId);
    }
  };

  const handleRenew = async () => {
    if (!renewTarget) return;
    try {
      const result = await renewMembershipMutation.mutateAsync(renewTarget.id);
      const plate = renewTarget.vehicle?.plate ?? `#${renewTarget.vehicleId}`;
      setRenewTarget(null);
      setPaymentReceipt({ plate, url: result.receiptUrl });
      downloadReceipt(result.receiptUrl, `recibo-${plate}.pdf`).catch(() => {
        // El pago ya quedó registrado; el recibo se puede bajar desde el aviso.
      });
    } catch (err: unknown) {
      const notice = describeSubmitError(err);
      if (isUnconfirmed(err)) {
        // La renovación pudo completarse: refrescamos y avisamos sin afirmar fallo.
        setRenewTarget(null);
        invalidateAfter(queryClient, "renewMembership", tenantId);
        alert(UNCONFIRMED_MESSAGE);
      } else {
        alert(notice.message);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.vehicleId || !createForm.price) {
      setCreateError(errorNotice("Vehículo y precio son obligatorios."));
      return;
    }
    const v = vehicles.find((x) => x.id === createForm.vehicleId);
    if (!v) { setCreateError(errorNotice("Vehículo no encontrado.")); return; }

    setCreateError(null);
    try {
      const result = await createMembershipMutation.mutateAsync({
        tenantId,
        vehicleId: v.id,
        clientId: v.clientId,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        price: Number(createForm.price),
        company: createForm.company || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ vehicleId: "", startDate: todayISO(), endDate: nextMonthISO(), price: "", company: "" });
      setPaymentReceipt({ plate: v.plate, url: result.receiptUrl });
      downloadReceipt(result.receiptUrl, `recibo-${v.plate}.pdf`).catch(() => {
        // El pago ya quedó registrado; el recibo se puede bajar desde el aviso.
      });
    } catch (err: unknown) {
      setCreateError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "createMembership", tenantId);
    }
  };

  const counts = {
    todas: memberships.length,
    activas: memberships.filter((m) => m.status === "active").length,
    vencidas: memberships.filter((m) => m.status === "expired").length,
    proximas: expiring.length,
  };



  return (
    <div className="px-4 py-5 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Mensualidades</h1>
          <p className="text-sm text-text-secondary">
            Gestiona y renueva las mensualidades de vehículos registrados
          </p>
        </div>
        <button onClick={() => { setCreateOpen(true); setCreateError(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary-hover transition-colors duration-150">
          <Plus className="w-4 h-4" />
          Nueva Mensualidad
        </button>
      </div>

      {!loading && overdue.length > 0 && (
        <OverdueAlert count={overdue.length} onViewAll={() => setActiveTab("vencidas")} />
      )}

      {!loading && expiring.length > 0 && (
        <ExpiringAlert count={expiring.length} onViewAll={() => setActiveTab("proximas")} />
      )}

      {/* Pago registrado: link al desprendible */}
      {paymentReceipt && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center justify-between gap-3 border border-ok/30 text-ok bg-ok-dim">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            Pago registrado: {paymentReceipt.plate}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() =>
                downloadReceipt(paymentReceipt.url, `recibo-${paymentReceipt.plate}.pdf`).catch((err: unknown) =>
                  alert(err instanceof Error ? err.message : "No se pudo descargar el recibo"),
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-ok/40 text-ok hover:bg-ok/10"
            >
              <Receipt className="w-3.5 h-3.5" />
              Descargar recibo
            </button>
            <button
              onClick={() => setPaymentReceipt(null)}
              className="p-1 rounded-lg text-ok/70 hover:text-ok cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 bg-danger-dim border border-destructive/30 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden bg-page-card backdrop-blur-[12px] border border-border-default">
        {/* Tabs + company filter */}
        <div className="flex items-center justify-between flex-wrap gap-3 p-4">
          <div className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-1 p-1 rounded-xl w-fit bg-black/30">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-colors duration-200 ${isActive ? "text-primary-foreground" : "text-text-secondary hover:text-text-primary"}`}>
                    {isActive && (
                      <motion.span
                        layoutId="memberships-tab"
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        className="absolute inset-0 rounded-lg bg-primary"
                      />
                    )}
                    <span className="relative">{tab.label}</span>
                    <span className={`relative text-xs px-1.5 py-0.5 rounded-full font-semibold transition-colors duration-200 ${isActive ? "bg-black/20 text-primary-foreground" : "bg-page-input text-text-dim"}`}>
                      {counts[tab.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por placa o cliente..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none bg-page-input border border-border-medium"
              />
            </div>
            {companies.length > 0 && (
              <div className="w-full sm:w-56">
                <CustomSelect
                  value={companyFilter}
                  onChange={(v) => setCompanyFilter(String(v))}
                  options={[
                    { value: "", label: "Todas las empresas" },
                    ...companies.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {loading ? <TableSkeleton /> : (
          <MensualidadesTable memberships={filtered} expiringIds={expiring.map((e) => e.id)} onRenew={setRenewTarget} onDelete={(m) => { setDeleteError(null); setDeleteTarget(m); }} />
        )}
      </div>

      <RenewModal membership={renewTarget} open={!!renewTarget} onClose={() => setRenewTarget(null)} onConfirm={handleRenew} loading={renewing} />

      {/* Delete confirmation drawer */}
      <Sheet open={!!deleteTarget} onClose={() => { if (!deleting) setDeleteTarget(null); }}>
        {deleteTarget && (
          <>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-dim border border-destructive/30">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">¿Desactivar esta mensualidad?</h2>
                <p className="text-xs mt-0.5 text-text-muted">Sus datos se conservan, no se borra nada</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-4 p-3 rounded-xl bg-danger-dim border border-destructive/15">
                <p className="text-sm text-white font-medium">{deleteTarget.client?.fullName ?? `Cliente #${deleteTarget.clientId}`}</p>
                <p className="text-xs mt-0.5 font-mono text-primary">{deleteTarget.vehicle?.plate ?? `Vehículo #${deleteTarget.vehicleId}`}</p>
                <p className="text-xs mt-1 text-text-secondary">Vence: {deleteTarget.endDate}</p>
              </div>
              <NoticeBox notice={deleteError} />
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 text-white bg-destructive">
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Desactivando...</>
                ) : "Sí, desactivar"}
              </button>
            </div>
          </>
        )}
      </Sheet>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !creating) setCreateOpen(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-page-modal border border-border-medium">
            <div className="h-1 w-full bg-primary" style={{ borderRadius: "0.875rem 0.875rem 0 0" }} />
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-1">Nueva Mensualidad</h2>
              <p className="text-xs mb-5 text-text-muted">Registra una mensualidad para un vehículo</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Vehículo *</label>
                  <CustomSelect
                    value={createForm.vehicleId}
                    onChange={(val) => {
                      const vehicleId = val === "" ? "" : (val as number);
                      setCreateForm((p) => ({ ...p, vehicleId, price: priceForVehicle(vehicleId) }));
                    }}
                    options={[
                      { value: "", label: "Seleccionar vehículo..." },
                      ...vehicles.map((v) => ({
                        value: v.id,
                        label: `${v.plate} — ${v.type === "moto" ? "Moto" : "Carro"}${v.client ? ` (${v.client.fullName})` : ""}`,
                      })),
                    ]}
                    placeholder="Seleccionar vehículo..."
                    disabled={creating}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Inicio</label>
                    <input type="date" value={createForm.startDate}
                      onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none bg-page-input border border-border-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Vencimiento</label>
                    <input type="date" value={createForm.endDate}
                      onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none bg-page-input border border-border-medium" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Precio (COP) *</label>
                  <input type="number" value={createForm.price}
                    onChange={(e) => setCreateForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="120000" className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none bg-page-input border border-border-medium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Empresa / Organización</label>
                  <input type="text" value={createForm.company}
                    onChange={(e) => setCreateForm((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Ej. Empresa ABC (opcional)" className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none bg-page-input border border-border-medium" />
                </div>
                <NoticeBox notice={createError} />
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setCreateOpen(false)} disabled={creating}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
                    Cancelar
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 bg-primary text-primary-foreground">
                    {creating ? "Guardando..." : "Crear Mensualidad"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
