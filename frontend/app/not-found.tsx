import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h1 className="text-6xl font-bold text-text-dim mb-4">404</h1>
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Página no encontrada
      </h2>
      <p className="text-sm text-text-muted mb-6 text-center max-w-md">
        La página que buscas no existe o fue movida.
      </p>
      <Link href="/">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
