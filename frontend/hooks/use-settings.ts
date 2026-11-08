"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings, type AppSettings } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfter } from "@/lib/query-invalidation";

export function useSettings(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.settings(tenantId ?? 0),
    queryFn: () => getSettings(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

export function useUpdateSettings(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => updateSettings(tenantId, data),
    onSuccess: () => invalidateAfter(queryClient, "updateSettings", tenantId),
  });
}
