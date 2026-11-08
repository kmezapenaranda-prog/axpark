"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { Building, LayoutGrid, CircleParking, Users, Car, Calendar, DollarSign, BarChart3, UserPlus, Sun, Moon, LogOut, X } from "lucide-react";
import { BrandIcon } from "@/components/brand-logo";
import { MotionConfig, motion, type PanInfo } from "motion/react";

/** Mismo resorte que las hojas: sin rebote, interrumpible. */
const drawerSpring = { type: "spring", bounce: 0, duration: 0.35 } as const;
/** Píldora de la opción activa: se desliza entre opciones (rápido, sin rebote: se usa muchas veces al día). */
const pillSpring = { type: "spring", bounce: 0, duration: 0.3 } as const;

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Admin de plataforma",
  business_admin: "Admin del negocio",
  operator: "Operador",
};

type Role = "platform_admin" | "business_admin" | "operator";

const navItems: { href: string; label: string; roles: Role[]; icon: React.ReactNode }[] = [
  {
    href: "/admin",
    label: "Negocios",
    roles: ["platform_admin"],
    icon: <Building className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/",
    label: "Dashboard",
    roles: ["business_admin", "operator"],
    icon: <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/parking",
    label: "Parking Activo",
    roles: ["business_admin", "operator"],
    icon: <CircleParking className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/clientes",
    label: "Clientes",
    roles: ["business_admin", "operator"],
    icon: <Users className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/vehiculos",
    label: "Vehículos",
    roles: ["business_admin", "operator"],
    icon: <Car className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/mensualidades",
    label: "Mensualidades",
    roles: ["business_admin", "operator"],
    icon: <Calendar className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/tarifas",
    label: "Tarifas",
    roles: ["business_admin"],
    icon: <DollarSign className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/reportes",
    label: "Reportes",
    roles: ["business_admin"],
    icon: <BarChart3 className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    roles: ["business_admin"],
    icon: <UserPlus className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
];

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { session, logout } = useAuth();
  const isLight = theme === "light";
  const role = session?.user.role;
  const visibleNavItems = navItems.filter((item) => !role || item.roles.includes(role));

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      {/* Rail — desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[76px] flex-col items-center py-5 z-40 bg-page-sidebar border-r border-border-soft">
        <BrandIcon className="w-10 h-10 mb-6" />

        <nav className="flex-1 flex flex-col items-stretch gap-1 w-full px-2.5">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative flex items-center justify-center px-2.5 py-2.5 rounded-[10px] transition-colors duration-150 ${
                  isActive
                    ? "text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-page-subtle"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="rail-active"
                    transition={pillSpring}
                    className="absolute inset-0 rounded-[10px] bg-primary-dim"
                  >
                    <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-primary" />
                  </motion.span>
                )}
                <span className="relative">{item.icon}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col items-stretch gap-1 w-full px-2.5 pt-3 border-t border-border-soft">
          <button
            onClick={toggle}
            title={isLight ? "Modo oscuro" : "Modo claro"}
            className="flex items-center justify-center px-2.5 py-2.5 rounded-[10px] text-text-secondary hover:text-text-primary hover:bg-page-subtle transition-colors duration-150 cursor-pointer"
          >
            {isLight ? <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} /> : <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          </button>
          <div
            title={session ? `${session.user.fullName} · ${ROLE_LABELS[session.user.role] ?? session.user.role}` : "Invitado"}
            className="flex items-center justify-center py-1.5"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
              {session ? session.user.fullName.charAt(0).toUpperCase() : "?"}
            </div>
          </div>
          {session && (
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex items-center justify-center px-2.5 py-2.5 rounded-[10px] text-text-muted hover:text-destructive hover:bg-danger-dim transition-colors duration-150 cursor-pointer"
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </aside>

      {/* Drawer — mobile */}
      <MotionConfig reducedMotion="user">
      <motion.aside
        className="fixed left-0 top-0 h-full w-64 flex flex-col z-50 lg:hidden bg-page-sidebar border-r border-border-soft touch-pan-y"
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={drawerSpring}
        // Se cierra arrastrándolo hacia la izquierda; un lanzamiento rápido basta.
        drag={open ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 1, right: 0.04 }}
        onDragEnd={(_: unknown, info: PanInfo) => {
          if (info.offset.x < -256 * 0.35 || info.velocity.x < -500) onClose?.();
        }}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
          <BrandIcon className="w-9 h-9" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight"><span className="text-primary">Ax</span><span className="text-text-primary">Park</span></p>
            <p className="text-xs leading-tight text-text-muted">Gestión de parqueaderos</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-text-dim">
            Principal
          </p>
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "text-primary"
                    : "text-text-secondary hover:bg-page-subtle hover:text-text-primary"
                }`}
              >
                {isActive && (
                  <motion.span layoutId="drawer-active" transition={pillSpring} className="absolute inset-0 rounded-[10px] bg-primary-dim" />
                )}
                <span className="relative flex items-center gap-3 flex-1">
                  {item.icon}
                  {item.label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border-soft">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium cursor-pointer transition duration-200 mb-3 bg-page-subtle border border-border-default text-text-secondary hover:bg-page-input hover:text-text-primary"
          >
            {isLight ? <Sun className="w-4 h-4 text-warn" strokeWidth={1.75} /> : <Moon className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
            <span className="flex-1 text-left">{isLight ? "Modo claro" : "Modo oscuro"}</span>
            <span className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${isLight ? "bg-primary" : "bg-border-medium"}`}>
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                style={{
                  transform: isLight ? "translateX(18px)" : "translateX(2px)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground">
              {session ? session.user.fullName.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-text-primary">
                {session ? session.user.fullName : "Invitado"}
              </p>
              <p className="text-xs truncate text-text-muted">
                {session ? ROLE_LABELS[session.user.role] ?? session.user.role : "Sin sesión"}
              </p>
            </div>
            {session && (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg flex-shrink-0 cursor-pointer transition-colors duration-150 text-text-muted hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>
      </MotionConfig>
    </>
  );
}
