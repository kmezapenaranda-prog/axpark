"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClients, createClient, updateClient, deleteClient, type CreateClientDto, type UpdateClientDto } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfter } from "@/lib/query-invalidation";

export function useClients(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.clients(tenantId ?? 0),
    queryFn: () => getClients(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

export function useCreateClient(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClientDto) => createClient(data),
    onSuccess: () => invalidateAfter(queryClient, "createClient", tenantId),
  });
}

export function useUpdateClient(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClientDto }) => updateClient(id, data, tenantId),
    onSuccess: () => invalidateAfter(queryClient, "updateClient", tenantId),
  });
}

export function useDeleteClient(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteClient(id, tenantId),
    onSuccess: () => invalidateAfter(queryClient, "deleteClient", tenantId),
  });
}
