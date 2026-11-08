import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            if (error.kind === "timeout") return false;
            if (error.status != null && error.status >= 400 && error.status < 500) {
              return false;
            }
          }
          return failureCount < 1;
        },
      },
    },
  });
}
