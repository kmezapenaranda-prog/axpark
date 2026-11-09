"use client";

import Link from "next/link";
import { Calendar, CircleParking, Users, Car } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useVehicles } from "@/hooks/use-vehicles";
import { useClients } from "@/hooks/use-clients";
import { useActiveVehicles } from "@/hooks/use-parking";
import { useMemberships, useExpiringMemberships } from "@/hooks/use-memberships";

const cards = [
  {
    href: "/mensualidades",
    title: "Mensualidades",
    description: "Gestiona y renueva mensualidades de vehículos",
    color: "var(--primary)",
    icon: <Calendar className="w-6 h-6" />,
    metricKey: "memberships" as const,
    metricLabel: "activas",
  },
  {
    href: "/parking",
    title: "Parking Activo",
    description: "Monitorea los vehículos dentro del parqueadero",
    color: "var(--ok)",
    icon: <CircleParking className="w-6 h-6" />,
    metricKey: "activeVehicles" as const,
    metricLabel: "en parqueadero",
  },
  {
    href: "/clientes",
    title: "Clientes",
    description: "Administra los clientes registrados",
    color: "var(--text-secondary)",
    icon: <Users className="w-6 h-6" />,
    metricKey: "clients" as const,
    metricLabel: "registrados",
  },
  {
    href: "/vehiculos",
    title: "Vehículos",
    description: "Consulta y gestiona vehículos registrados",
    color: "var(--text-secondary)",
    icon: <Car className="w-6 h-6" />,
    metricKey: "vehicles" as const,
    metricLabel: "registrados",
  },
];

interface Metrics {
  activeVehicles: number | null;
  memberships: number | null;
  expiringMemberships: number | null;
  clients: number | null;
  vehicles: number | null;
}

export default function HomePage() {
  const { session } = useAuth();
  const tenantId = session?.user.tenantId ?? undefined;

  const vehiclesQuery = useVehicles(tenantId);
  const clientsQuery = useClients(tenantId);
  const activeVehiclesQuery = useActiveVehicles(tenantId);
  const membershipsQuery = useMemberships(tenantId);
  const expiringQuery = useExpiringMemberships(tenantId);

  const metrics: Metrics = {
    activeVehicles: activeVehiclesQuery.isError
      ? null
      : activeVehiclesQuery.data?.length ?? null,
    memberships: membershipsQuery.isError
      ? null
      : membershipsQuery.data?.filter((m) => m.status === "active").length ?? null,
    expiringMemberships: expiringQuery.isError ? null : expiringQuery.data?.length ?? null,
    clients: clientsQuery.isError ? null : clientsQuery.data?.length ?? null,
    vehicles: vehiclesQuery.isError ? null : vehiclesQuery.data?.length ?? null,
  };

  const metricsLoading: Record<keyof Metrics, boolean> = {
    activeVehicles: activeVehiclesQuery.isLoading,
    memberships: membershipsQuery.isLoading,
    expiringMemberships: expiringQuery.isLoading,
    clients: clientsQuery.isLoading,
    vehicles: vehiclesQuery.isLoading,
  };

  function getMetricDisplay(card: (typeof cards)[number]) {
    if (metricsLoading[card.metricKey]) return "...";
    const value = metrics[card.metricKey];
    if (value === null) return "—";
    if (card.metricKey === "memberships" && metrics.expiringMemberships !== null) {
      return `${value} (${metrics.expiringMemberships} por vencer)`;
    }
    return value;
  }

  function getMetricLabel(card: (typeof cards)[number]) {
    if (card.metricKey === "memberships") return "activas";
    return card.metricLabel;
  }

  return (
    <div className="px-4 py-5 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-text-secondary">
          Bienvenido a AxPark
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group block rounded-2xl p-6 transition duration-200 cursor-pointer bg-page-card backdrop-blur border border-border-default"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                `color-mix(in srgb, ${card.color} 40%, transparent)`;
              (e.currentTarget as HTMLAnchorElement).style.background =
                "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "var(--border-default)";
              (e.currentTarget as HTMLAnchorElement).style.background =
                "var(--bg-card)";
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)`,
                color: card.color,
              }}
            >
              {card.icon}
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              {card.title}
            </h2>
            <p className="text-sm text-text-muted">{card.description}</p>
            <div className="mt-3 flex items-baseline gap-1">
              <span
                className="text-2xl font-bold"
                style={{ color: card.color }}
              >
                {getMetricDisplay(card)}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {getMetricLabel(card)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
