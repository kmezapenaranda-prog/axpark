import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: {
    template: "%s — AxPark",
    default: "AxPark — Gestor inteligente de parqueaderos",
  },
  description:
    "Sistema integral de gestión de parqueaderos con control de clientes, vehículos, mensualidades y reportes",
  keywords: ["parking", "parqueadero", "gestión", "vehículos", "mensualidades"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased dark">
      <body className="min-h-full bg-page font-sans">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
