"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { getEntries, getCajaReport, getReportSummary } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useEntries(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.entries(tenantId ?? 0),
    queryFn: () => getEntries(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

export function useReportSummary(tenantId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.reportSummary(tenantId ?? 0),
    queryFn: () => getReportSummary(tenantId!),
    enabled: tenantId != null,
    staleTime: 30_000,
  });
}

// El cierre de caja se genera bajo demanda para una fecha elegida por el
// usuario: no es una consulta atada al montaje de la página, así que se
// modela como mutación (GET disparado por acción) en vez de useQuery.
export function useGenerateCajaReport(tenantId: number) {
  return useMutation({
    mutationFn: (fecha: string) => getCajaReport(fecha, tenantId),
  });
}
