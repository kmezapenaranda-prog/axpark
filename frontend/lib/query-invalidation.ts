import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

const invalidationMap = {
  createVehicle: (tenantId: number) => [queryKeys.vehicles(tenantId)],
  updateVehicle: (tenantId: number) => [queryKeys.vehicles(tenantId)],
  deleteVehicle: (tenantId: number) => [
    queryKeys.vehicles(tenantId),
    queryKeys.memberships(tenantId),
    queryKeys.expiringMemberships(tenantId),
  ],
  createClient: (tenantId: number) => [
    queryKeys.clients(tenantId),
    queryKeys.vehicles(tenantId),
  ],
  updateClient: (tenantId: number) => [queryKeys.clients(tenantId)],
  deleteClient: (tenantId: number) => [
    // El backend desactiva en cascada vehículos y mensualidades del cliente.
    queryKeys.clients(tenantId),
    queryKeys.vehicles(tenantId),
    queryKeys.memberships(tenantId),
    queryKeys.expiringMemberships(tenantId),
  ],
  createMembership: (tenantId: number) => [
    queryKeys.memberships(tenantId),
    queryKeys.expiringMemberships(tenantId),
    queryKeys.vehicles(tenantId),
  ],
  deleteMembership: (tenantId: number) => [
    queryKeys.memberships(tenantId),
    queryKeys.expiringMemberships(tenantId),
    queryKeys.vehicles(tenantId),
  ],
  renewMembership: (tenantId: number) => [
    queryKeys.memberships(tenantId),
    queryKeys.expiringMemberships(tenantId),
    queryKeys.vehicles(tenantId),
  ],
  registerVehicleEntry: (tenantId: number) => [queryKeys.activeVehicles(tenantId)],
  exitVehicle: (tenantId: number) => [queryKeys.activeVehicles(tenantId)],
  updateSettings: (tenantId: number) => [queryKeys.settings(tenantId)],
  createUser: (tenantId: number) => [queryKeys.users(tenantId)],
  updateUser: (tenantId: number) => [queryKeys.users(tenantId)],
  deactivateUser: (tenantId: number) => [queryKeys.users(tenantId)],
  // createTenant no tiene un id de negocio existente que invalidar puntualmente;
  // el argumento se conserva solo para que todas las entradas compartan firma.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createTenant: (_tenantId: number) => [queryKeys.tenants()],
  // Aquí el argumento sí se usa: es el id del negocio editado/desactivado.
  updateTenant: (tenantId: number) => [queryKeys.tenants(), queryKeys.tenant(tenantId)],
  deactivateTenant: (tenantId: number) => [queryKeys.tenants(), queryKeys.tenant(tenantId)],
} as const;

export type InvalidatableMutation = keyof typeof invalidationMap;

export function invalidateAfter(
  queryClient: QueryClient,
  mutation: InvalidatableMutation,
  tenantId: number,
): void {
  for (const key of invalidationMap[mutation](tenantId)) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
