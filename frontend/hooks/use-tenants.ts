"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTenants, getTenant, createTenant, updateTenant, deactivateTenant,
  type CreateTenantDto, type UpdateTenantDto,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfter } from "@/lib/query-invalidation";

export function useTenants() {
  return useQuery({
    queryKey: queryKeys.tenants(),
    queryFn: () => listTenants(),
    staleTime: 30_000,
  });
}

export function useTenant(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.tenant(id ?? 0),
    queryFn: () => getTenant(id!),
    enabled: id != null && Number.isFinite(id),
    staleTime: 30_000,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantDto) => createTenant(data),
    onSuccess: () => invalidateAfter(queryClient, "createTenant", 0),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTenantDto }) => updateTenant(id, data),
    onSuccess: (_result, { id }) => invalidateAfter(queryClient, "updateTenant", id),
  });
}

export function useDeactivateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deactivateTenant(id),
    onSuccess: (_result, id) => invalidateAfter(queryClient, "deactivateTenant", id),
  });
}
