"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMemberships, getExpiringMemberships, createMembership, deleteMembership, renewMembership,
  type CreateMembershipDto,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfter } from "@/lib/query-invalidation";

export function useMemberships(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.memberships(tenantId ?? 0),
    queryFn: () => getMemberships(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

export function useExpiringMemberships(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.expiringMemberships(tenantId ?? 0),
    queryFn: () => getExpiringMemberships(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

export function useCreateMembership(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMembershipDto) => createMembership(data),
    onSuccess: () => invalidateAfter(queryClient, "createMembership", tenantId),
  });
}

export function useDeleteMembership(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMembership(id, tenantId),
    onSuccess: () => invalidateAfter(queryClient, "deleteMembership", tenantId),
  });
}

export function useRenewMembership(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => renewMembership(id, tenantId),
    onSuccess: () => invalidateAfter(queryClient, "renewMembership", tenantId),
  });
}
