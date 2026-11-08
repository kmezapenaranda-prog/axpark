import type { Vehicle } from "@/lib/api";

export const vehicleTypeLabel: Record<string, string> = { car: "Carro", moto: "Moto", truck: "Camión" };

export const vehicleStatusConfig = {
  active:   { label: "Activo",   bg: "var(--ok-dim)",    border: "color-mix(in srgb, var(--ok) 45%, transparent)",   color: "var(--ok)" , dot: "var(--ok)" },
  inactive: { label: "Inactivo", bg: "var(--bg-subtle)", border: "var(--border-medium)", color: "var(--text-secondary)", dot: "var(--text-dim)" },
};

export const membershipStatusConfig = {
  active:    { label: "Al día",      bg: "var(--ok-dim)",     border: "color-mix(in srgb, var(--ok) 40%, transparent)",     color: "var(--ok)" },
  expired:   { label: "Vencida",     bg: "var(--danger-dim)", border: "color-mix(in srgb, var(--destructive) 40%, transparent)", color: "var(--destructive)" },
  cancelled: { label: "Cancelada",   bg: "var(--bg-subtle)",  border: "var(--border-medium)", color: "var(--text-secondary)" },
  none:      { label: "Sin mensual.", bg: "var(--warn-dim)",  border: "color-mix(in srgb, var(--warn) 35%, transparent)",   color: "var(--warn)" },
};

export const BRAND_OPTIONS = ["Chevrolet","Renault","Mazda","Toyota","Nissan","Kia","Hyundai","Ford","Volkswagen","Honda","Suzuki","Mitsubishi","Jeep","Ram","Dodge"];
export const COLOR_OPTIONS  = ["Blanco","Negro","Gris","Plateado","Rojo","Azul","Verde","Amarillo","Naranja","Café","Beige","Morado"];
export const BRANDS = [...BRAND_OPTIONS, "Otra"];
export const COLORS = [...COLOR_OPTIONS, "Otro"];

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function initBrand(v: Vehicle): string {
  if (!v.brand) return "";
  return BRAND_OPTIONS.includes(v.brand) ? v.brand : "Otra";
}
export function initBrandCustom(v: Vehicle): string {
  if (!v.brand || BRAND_OPTIONS.includes(v.brand)) return "";
  return v.brand;
}
export function initColor(v: Vehicle): string {
  if (!v.color) return "";
  return COLOR_OPTIONS.includes(v.color) ? v.color : "Otro";
}
export function initColorCustom(v: Vehicle): string {
  if (!v.color || COLOR_OPTIONS.includes(v.color)) return "";
  return v.color;
}
