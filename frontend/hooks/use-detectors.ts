"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDetector, listDetectors, revokeDetector } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useDetectors(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.detectors(tenantId ?? 0),
    queryFn: () => listDetectors(tenantId!),
    enabled: tenantId != null,
    // El estado "en línea" depende del último latido: refrescar cada 30 s.
    refetchInterval: 30_000,
  });
}

export function useCreateDetector(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createDetector(tenantId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.detectors(tenantId) }),
  });
}

export function useRevokeDetector(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => revokeDetector(id, tenantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.detectors(tenantId) }),
  });
}
