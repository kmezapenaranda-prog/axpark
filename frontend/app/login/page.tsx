"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BrandIcon, BrandMark, BRAND_TAGLINE, MadeByAxons } from "@/components/brand-logo";
import { Eye, EyeOff, TriangleAlert, ScanLine, Receipt, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: ScanLine, label: "Registro de placas al entrar y salir" },
  { icon: Receipt, label: "Cobros y cierres de caja sin hojas de cálculo" },
  { icon: ShieldCheck, label: "Accesos y permisos por rol" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      setSession(result);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <section className="relative hidden lg:flex flex-col justify-between px-14 py-12 overflow-hidden bg-page-sidebar border-r border-border-soft">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--text-dim) 1px, transparent 1px), linear-gradient(90deg, var(--text-dim) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* Brillo azul, igual al hero de Axons */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.22),transparent_65%)]"
        />

        <div className="relative flex items-center gap-4">
          <BrandMark className="w-14 h-14" />
          <div className="h-10 w-px bg-border-default" aria-hidden />
          <div>
            <p className="text-2xl font-bold leading-none tracking-tight">
              <span className="text-primary">Ax</span><span className="text-text-primary">Park</span>
            </p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-text-secondary">
              {BRAND_TAGLINE}
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-[2.75rem] leading-[1.08] font-bold tracking-tight text-balance mb-4 text-text-primary">
            La operación de tu parqueadero, <span className="text-brand-gradient">más simple.</span>
          </h1>
          <p className="text-text-secondary leading-relaxed">
            Todo lo que necesitas para administrar tu negocio, en una sola plataforma.
          </p>
        </div>

        <div className="relative rounded-xl border border-border-soft bg-page-card/70 backdrop-blur-sm p-4">
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-[7px] flex items-center justify-center bg-primary-dim text-primary flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <span className="text-sm text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <MadeByAxons className="absolute bottom-4 left-14" />
      </section>

      {/* Panel de formulario */}
      <section className="flex items-center justify-center px-6 py-16 bg-page">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <BrandIcon className="w-9 h-9" />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-primary">Ax</span><span className="text-text-primary">Park</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-1.5 text-text-primary">Bienvenido de nuevo</h2>
          <p className="text-sm text-text-secondary mb-8">
            Ingresa tus credenciales para entrar al panel de tu negocio.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@negocio.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary transition-colors duration-150 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <p className="text-xs text-text-dim mt-8">
            ¿Olvidaste tu contraseña? Pídele al administrador de tu parqueadero que te asigne una nueva.
          </p>
          <MadeByAxons className="mt-10 lg:hidden" />
        </div>
      </section>
    </main>
  );
}
