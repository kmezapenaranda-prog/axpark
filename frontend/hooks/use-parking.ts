"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveVehicles, registerVehicleEntry, exitVehicle } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfter } from "@/lib/query-invalidation";

export function useActiveVehicles(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.activeVehicles(tenantId ?? 0),
    queryFn: () => getActiveVehicles(tenantId!),
    enabled: tenantId != null,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useRegisterVehicleEntry(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plate, vehicleType }: { plate: string; vehicleType: "car" | "moto" }) =>
      registerVehicleEntry(tenantId, plate, vehicleType),
    onSuccess: () => invalidateAfter(queryClient, "registerVehicleEntry", tenantId),
  });
}

export function useExitVehicle(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plate: string) => exitVehicle(tenantId, plate),
    onSuccess: () => invalidateAfter(queryClient, "exitVehicle", tenantId),
  });
}
