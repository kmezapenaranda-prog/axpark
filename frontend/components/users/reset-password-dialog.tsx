"use client";

import { useState, type FormEvent } from "react";
import type { AppUser } from "@/lib/api";
import { useResetUserPassword } from "@/hooks/use-users";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, type SubmitNotice } from "@/lib/submit-error";
import { CheckCircle2, KeyRound } from "lucide-react";

const MIN_LENGTH = 8;

/**
 * Diálogo para que un administrador ponga una contraseña nueva a un usuario.
 * El administrador se la comunica luego al usuario por su propio canal.
 */
export function ResetPasswordDialog({ target, onClose }: { target: AppUser | null; onClose: () => void }) {
  const mutation = useResetUserPassword();
  const saving = mutation.isPending;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState<SubmitNotice | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    if (saving) return;
    setPassword("");
    setConfirm("");
    setNotice(null);
    setDone(false);
    mutation.reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (password.length < MIN_LENGTH) {
      setNotice(errorNotice(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`));
      return;
    }
    if (password !== confirm) {
      setNotice(errorNotice("Las contraseñas no coinciden."));
      return;
    }
    setNotice(null);
    try {
      await mutation.mutateAsync({ id: target.id, password });
      setDone(true);
    } catch (err: unknown) {
      setNotice(describeSubmitError(err));
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent
        className="sm:max-w-lg border-0 p-0 overflow-hidden bg-page-modal border border-border-medium"
        style={{ backdropFilter: "blur(20px)" }}
      >
        <div className="h-1 w-full bg-primary" />
        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-dim border border-primary/30">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold text-text-primary">Restablecer contraseña</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-text-muted">
              {target?.fullName} · {target?.email}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-ok-dim border border-ok/30 text-sm text-ok">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  Contraseña actualizada. Compártela con {target?.fullName.split(" ")[0]} por un canal privado;
                  la anterior ya no funciona.
                </p>
              </div>
              <Button className="w-full justify-center" onClick={close}>Listo</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="reset-password">Nueva contraseña *</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Mínimo ${MIN_LENGTH} caracteres`}
                />
              </div>
              <div>
                <Label htmlFor="reset-password-confirm">Confirmar contraseña *</Label>
                <Input
                  id="reset-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                />
              </div>
              <NoticeBox notice={notice} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" className="flex-1 justify-center" disabled={saving} onClick={close}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
