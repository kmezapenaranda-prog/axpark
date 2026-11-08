import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import appIcon from "@/public/brand/axons-parking-app-icon.png";
import mark from "@/public/brand/axons-parking-mark.png";

export const BRAND_NAME = "AxPark";
export const BRAND_TAGLINE = "Gestor inteligente de parqueaderos";

/** Web de Axons, la empresa detrás de AxPark. Se puede cambiar con NEXT_PUBLIC_AXONS_URL. */
export const AXONS_URL = process.env.NEXT_PUBLIC_AXONS_URL || "https://axonsia.com/";

/** Firma "Un producto de Axons" que enlaza a la web de Axons. */
export function MadeByAxons({ className }: { className?: string }) {
  return (
    <a
      href={AXONS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1 text-xs text-text-dim transition-colors hover:text-text-secondary",
        className,
      )}
    >
      Un producto de{" "}
      <span className="font-semibold text-brand-cyan group-hover:underline underline-offset-2">Axons</span>
      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-0.5 transition group-hover:opacity-100 group-hover:translate-x-0" />
    </a>
  );
}

/** Ícono de app (cuadro azul). Se ve bien en tema claro y oscuro. */
export function BrandIcon({ className }: { className?: string }) {
  return <Image src={appIcon} alt={BRAND_NAME} className={cn("w-9 h-9 flex-shrink-0", className)} priority />;
}

/**
 * Símbolo con brillo para fondos oscuros. En tema claro la "P" blanca no se lee,
 * así que ahí se muestra el ícono de app.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <>
      <Image src={mark} alt={BRAND_NAME} className={cn("hidden dark:block flex-shrink-0", className)} priority />
      <Image src={appIcon} alt={BRAND_NAME} className={cn("dark:hidden flex-shrink-0", className)} priority />
    </>
  );
}
