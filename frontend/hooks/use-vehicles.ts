"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
  type CreateVehicleDto,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfter } from "@/lib/query-invalidation";

export function useVehicles(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles(tenantId ?? 0),
    queryFn: () => getVehicles(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

export function useCreateVehicle(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleDto) => createVehicle(data),
    onSuccess: () => invalidateAfter(queryClient, "createVehicle", tenantId),
  });
}

export function useUpdateVehicle(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { clientId?: number; brand?: string; color?: string } }) =>
      updateVehicle(id, data, tenantId),
    onSuccess: () => invalidateAfter(queryClient, "updateVehicle", tenantId),
  });
}

export function useDeleteVehicle(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVehicle(id, tenantId),
    onSuccess: () => invalidateAfter(queryClient, "deleteVehicle", tenantId),
  });
}
