"use client";

import { useState, type FormEvent } from "react";
import { changeMyPassword } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, type SubmitNotice } from "@/lib/submit-error";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";

const MIN_LENGTH = 8;

/** Diálogo para que el usuario con sesión cambie su propia contraseña. */
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<SubmitNotice | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    if (saving) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setShow(false);
    setNotice(null);
    setDone(false);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return setNotice(errorNotice("Escribe tu contraseña actual."));
    if (next.length < MIN_LENGTH) return setNotice(errorNotice(`La contraseña nueva debe tener al menos ${MIN_LENGTH} caracteres.`));
    if (next !== confirm) return setNotice(errorNotice("La contraseña nueva y su confirmación no coinciden."));
    if (next === current) return setNotice(errorNotice("La contraseña nueva debe ser distinta de la actual."));
    setNotice(null);
    setSaving(true);
    try {
      await changeMyPassword(current, next);
      setDone(true);
    } catch (err: unknown) {
      setNotice(describeSubmitError(err));
    } finally {
      setSaving(false);
    }
  }

  const type = show ? "text" : "password";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium">
        <div className="h-1 w-full bg-primary" />
        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold text-text-primary">Cambiar mi contraseña</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-text-muted">
              Usa una contraseña que solo tú conozcas.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-ok-dim border border-ok/30 text-sm text-ok">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>Listo, tu contraseña se cambió. Úsala la próxima vez que inicies sesión.</p>
              </div>
              <Button className="w-full justify-center" onClick={close}>Cerrar</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="cp-current">Contraseña actual</Label>
                <Input id="cp-current" type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cp-new">Contraseña nueva</Label>
                <Input id="cp-new" type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder={`Mínimo ${MIN_LENGTH} caracteres`} />
              </div>
              <div>
                <Label htmlFor="cp-confirm">Repite la contraseña nueva</Label>
                <Input id="cp-confirm" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary cursor-pointer"
              >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {show ? "Ocultar contraseñas" : "Mostrar contraseñas"}
              </button>
              <NoticeBox notice={notice} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" className="flex-1 justify-center" disabled={saving} onClick={close}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={saving}>
                  {saving ? "Guardando..." : "Cambiar contraseña"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
