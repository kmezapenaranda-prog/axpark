"use client";

import { useState, type FormEvent } from "react";
import type { CreatedDetector, Detector } from "@/lib/api";
import { useCreateDetector, useDetectors, useRevokeDetector } from "@/hooks/use-detectors";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, type SubmitNotice } from "@/lib/submit-error";
import { Camera, Check, Copy, KeyRound, Plus, ShieldOff, TriangleAlert } from "lucide-react";

/** El detector envía un latido cada 60 s: si pasan 3 min sin noticias, se considera sin señal. */
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/**
 * El backend entrega las fechas como "dd/mm/aaaa HH:MM:SS" en hora de Bogotá (DateFormatterInterceptor).
 * new Date() las leería como mes/día, así que se convierten explícitamente.
 */
function parseApiDate(value: string): Date {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return new Date(value);
  const [, d, mo, y, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}-05:00`);
}

function relativeTime(value: string): string {
  const diffSec = Math.round((parseApiDate(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

type DetectorState = "online" | "offline" | "never" | "revoked";

function detectorState(d: Detector): DetectorState {
  if (d.status === "revoked") return "revoked";
  if (!d.lastSeenAt) return "never";
  return Date.now() - parseApiDate(d.lastSeenAt).getTime() < ONLINE_WINDOW_MS ? "online" : "offline";
}

const STATE_UI: Record<DetectorState, { label: string; dot: string; text: string }> = {
  online: { label: "En línea", dot: "bg-ok", text: "text-ok" },
  offline: { label: "Sin señal", dot: "bg-warn", text: "text-warn" },
  never: { label: "Nunca conectado", dot: "bg-text-dim", text: "text-text-muted" },
  revoked: { label: "Revocado", dot: "bg-destructive", text: "text-destructive" },
};

/**
 * Detectores de placas de un negocio: cada PC con cámara tiene su propia clave,
 * ligada a este negocio. Se usa en el panel de admin y en Usuarios (admin del negocio).
 */
export function DetectorsSection({ tenantId }: { tenantId: number }) {
  const detectorsQuery = useDetectors(tenantId);
  const createMutation = useCreateDetector(tenantId);
  const revokeMutation = useRevokeDetector(tenantId);
  const detectors = detectorsQuery.data ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [createNotice, setCreateNotice] = useState<SubmitNotice | null>(null);
  const [created, setCreated] = useState<CreatedDetector | null>(null);
  const [copied, setCopied] = useState<"key" | "env" | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<Detector | null>(null);
  const [revokeNotice, setRevokeNotice] = useState<SubmitNotice | null>(null);

  function openCreate() {
    setName("");
    setCreateNotice(null);
    setCreated(null);
    setCopied(null);
    setCreateOpen(true);
  }

  function closeCreate() {
    if (createMutation.isPending) return;
    setCreateOpen(false);
    // La clave solo vive en memoria mientras el diálogo está abierto.
    setCreated(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setCreateNotice(errorNotice("Ponle un nombre de al menos 2 caracteres, p. ej. \"Entrada principal\"."));
      return;
    }
    setCreateNotice(null);
    try {
      setCreated(await createMutation.mutateAsync(name.trim()));
    } catch (err: unknown) {
      setCreateNotice(describeSubmitError(err));
    }
  }

  async function copy(text: string, what: "key" | "env") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevokeNotice(null);
    try {
      await revokeMutation.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    } catch (err: unknown) {
      setRevokeNotice(describeSubmitError(err));
    }
  }

  const envSnippet = created ? `DETECTOR_API_KEY=${created.key}` : "";

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Detectores de placas</h2>
          <p className="text-sm text-text-secondary">
            Cada PC con cámara usa su propia clave, válida solo para este parqueadero
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo detector
        </Button>
      </div>

      <div className="rounded-2xl overflow-hidden bg-page-card border border-border-default">
        {detectorsQuery.isLoading ? (
          <div className="p-5 space-y-3">
            {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : detectors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-primary-dim">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold mb-1 text-text-primary">Sin detectores</p>
            <p className="text-sm text-text-muted max-w-sm">
              Crea uno por cada cámara que registre entradas automáticamente en este parqueadero.
            </p>
          </div>
        ) : (
          <ul>
            {detectors.map((d, i) => {
              const state = detectorState(d);
              const ui = STATE_UI[state];
              return (
                <li
                  key={d.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${i < detectors.length - 1 ? "border-b border-border-row" : ""}`}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-dim">
                    <Camera className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-tight truncate ${state === "revoked" ? "text-text-muted line-through" : "text-text-primary"}`}>
                      {d.name}
                    </p>
                    <p className="text-xs mt-0.5 font-mono text-text-dim">{d.keyPrefix}…</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ui.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ui.dot}`} />
                      {ui.label}
                    </span>
                    {d.lastSeenAt && state !== "revoked" && (
                      <span className="text-xs text-text-dim">Visto {relativeTime(d.lastSeenAt)}</span>
                    )}
                  </div>
                  {d.status === "active" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { setRevokeNotice(null); setRevokeTarget(d); }}
                    >
                      Revocar
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Crear detector: primero el nombre, luego la clave (una sola vez) */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) closeCreate(); }}>
        <DialogContent className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium">
          <div className="h-1 w-full bg-primary" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                  {created ? <KeyRound className="w-5 h-5 text-primary" /> : <Camera className="w-5 h-5 text-primary" />}
                </div>
                <DialogTitle className="text-lg font-bold text-text-primary">
                  {created ? "Clave del detector" : "Nuevo detector"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-text-muted">
                {created
                  ? `“${created.name}” está listo. Configura su PC con esta clave.`
                  : "Ponle un nombre que identifique la cámara, por ejemplo su ubicación."}
              </DialogDescription>
            </DialogHeader>

            {created ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-warn-dim border border-warn/30 text-sm text-warn">
                  <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Cópiala ahora: por seguridad no se vuelve a mostrar. Si la pierdes, revoca este detector y crea otro.</p>
                </div>

                <div>
                  <Label>Clave</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate px-3 py-2.5 rounded-xl text-xs font-mono bg-page-input border border-border-default text-text-primary select-all">
                      {created.key}
                    </code>
                    <Button type="button" variant="secondary" onClick={() => copy(created.key, "key")} aria-label="Copiar clave">
                      {copied === "key" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>En el archivo .env del PC del parqueadero</Label>
                  <div className="relative">
                    <pre className="px-3 py-2.5 pr-12 rounded-xl text-xs font-mono whitespace-pre-wrap break-all bg-page-input border border-border-default text-text-secondary">
                      {envSnippet}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copy(envSnippet, "env")}
                      aria-label="Copiar línea del .env"
                      className="absolute top-2 right-2 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-page-subtle cursor-pointer"
                    >
                      {copied === "env" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <Button className="w-full justify-center" onClick={closeCreate}>Listo, ya la copié</Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4" noValidate>
                <div>
                  <Label htmlFor="detector-name">Nombre *</Label>
                  <Input
                    id="detector-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Entrada principal"
                    maxLength={80}
                    autoFocus
                  />
                </div>
                <NoticeBox notice={createNotice} />
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="secondary" className="flex-1 justify-center" disabled={createMutation.isPending} onClick={closeCreate}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 justify-center" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creando..." : "Crear y ver clave"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revocar: el PC de ese detector deja de poder registrar entradas al instante */}
      <Sheet
        open={!!revokeTarget}
        onClose={() => { if (!revokeMutation.isPending) setRevokeTarget(null); }}
        label="Revocar detector"
      >
        {revokeTarget && (
          <>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-dim border border-destructive/30">
                <ShieldOff className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">¿Revocar este detector?</h2>
                <p className="text-xs mt-0.5 text-text-muted">Su clave deja de funcionar de inmediato</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-4 p-3 rounded-xl bg-danger-dim border border-destructive/15">
                <p className="text-sm text-text-primary font-medium mb-1">{revokeTarget.name}</p>
                <p className="text-xs font-mono text-text-secondary">{revokeTarget.keyPrefix}…</p>
              </div>
              <p className="text-sm text-text-secondary">
                Las entradas ya registradas se conservan. Para volver a usar esa cámara, crea un detector nuevo.
              </p>
              <div className="mt-4"><NoticeBox notice={revokeNotice} /></div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
              <Button variant="secondary" className="flex-1 justify-center" disabled={revokeMutation.isPending} onClick={() => setRevokeTarget(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 justify-center" disabled={revokeMutation.isPending} onClick={handleRevoke}>
                {revokeMutation.isPending ? "Revocando..." : "Sí, revocar"}
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </section>
  );
}
