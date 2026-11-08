"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-provider";
import { Menu } from "lucide-react";
import { BrandIcon } from "@/components/brand-logo";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

const NO_SIDEBAR_ROUTES = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useAuth();
  const isLoginRoute = NO_SIDEBAR_ROUTES.includes(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session && !isLoginRoute) {
      router.replace("/login");
      return;
    }
    if (session && isLoginRoute) {
      router.replace(session.user.role === "platform_admin" ? "/admin" : "/");
      return;
    }
    if (!session) return;
    const isAdminRoute = pathname.startsWith("/admin");
    if (session.user.role === "platform_admin" && !isAdminRoute) {
      router.replace("/admin");
    } else if (session.user.role !== "platform_admin" && isAdminRoute) {
      router.replace("/");
    }
  }, [loading, session, isLoginRoute, pathname, router]);

  // /login se renderiza de inmediato (sin esperar la sesión) para que sea la
  // pantalla que se ve al abrir la app. Las rutas protegidas sí esperan a
  // resolver la sesión, para no dejar ver contenido antes de redirigir.
  if (isLoginRoute) {
    if (!loading && session) {
      return <main className="min-h-screen bg-page" />;
    }
    return <main className="min-h-screen">{children}</main>;
  }

  if (loading || !session) {
    return <main className="min-h-screen bg-page" />;
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isWrongSection =
    (session.user.role === "platform_admin" && !isAdminRoute) ||
    (session.user.role !== "platform_admin" && isAdminRoute);
  if (isWrongSection) {
    return <main className="min-h-screen bg-page" />;
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-screen">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Overlay móvil: cierra el drawer al tocar fuera */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-overlay"
            className="fixed inset-0 z-30 lg:hidden bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 lg:ml-[76px] min-h-screen flex flex-col">
        {/* Topbar móvil con botón hamburguesa */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 material-bar backdrop-blur-xl backdrop-saturate-150 border-b border-border-soft">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="p-1.5 rounded-lg cursor-pointer transition-colors duration-150 text-text-secondary"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <BrandIcon className="w-7 h-7" />
            <span className="font-bold text-sm"><span className="text-primary">Ax</span><span className="text-text-primary">Park</span></span>
          </div>
        </header>

        <main className="flex-1 min-h-0 min-w-0">{children}</main>
      </div>
    </div>
    </MotionConfig>
  );
}
