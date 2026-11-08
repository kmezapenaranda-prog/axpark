"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listUsers, createUser, updateUser, deactivateUser, resetUserPassword,
  type CreateUserDto, type UpdateUserDto,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfter } from "@/lib/query-invalidation";

export function useUsers(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.users(tenantId ?? 0),
    queryFn: () => listUsers(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

export function useCreateUser(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDto) => createUser(data),
    onSuccess: () => invalidateAfter(queryClient, "createUser", tenantId),
  });
}

export function useUpdateUser(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) => updateUser(id, data),
    onSuccess: () => invalidateAfter(queryClient, "updateUser", tenantId),
  });
}

export function useDeactivateUser(tenantId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deactivateUser(id),
    onSuccess: () => invalidateAfter(queryClient, "deactivateUser", tenantId),
  });
}

/** Restablecer contraseña: no cambia nada de la lista, así que no invalida caché. */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => resetUserPassword(id, password),
  });
}
