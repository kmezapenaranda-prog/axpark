"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="w-12 h-12 rounded-full bg-danger-dim flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Algo salió mal
      </h2>
      <p className="text-sm text-text-muted mb-4 text-center max-w-md">
        {error.message || "Ocurrió un error inesperado. Intenta de nuevo."}
      </p>
      <Button onClick={reset} variant="outline">
        Intentar de nuevo
      </Button>
    </div>
  );
}
