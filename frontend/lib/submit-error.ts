import { ApiError } from "./api";

/** Aviso a mostrar tras una operación de escritura. */
export interface SubmitNotice {
  message: string;
  /** "error" = fallo real (rojo). "warning" = aviso, no un fallo (ámbar). */
  tone: "error" | "warning";
}

/**
 * Mensaje para errores de red/timeout: NO afirmamos que la operación falló,
 * porque el servidor pudo haberla completado igual (típico con Render lento).
 */
export const UNCONFIRMED_MESSAGE =
  "No pudimos confirmar el resultado. Es posible que la operación sí se haya completado; " +
  "revisa la lista antes de reintentar para no duplicar el registro.";

/** Aviso de validación/local (siempre rojo). */
export function errorNotice(message: string): SubmitNotice {
  return { message, tone: "error" };
}

/**
 * Traduce el error de una operación de escritura en un aviso para el usuario:
 * - 409 Conflict → el registro ya existe. Mostramos el mensaje del backend
 *   como aviso (ámbar), no como fallo rojo.
 * - Timeout / error de red → la operación pudo completarse. Avisamos que no
 *   pudimos confirmar el resultado (ámbar), sin afirmar que falló.
 * - Cualquier otro → error real del backend (rojo).
 */
export function describeSubmitError(err: unknown): SubmitNotice {
  if (err instanceof ApiError) {
    if (err.isConflict) return { message: err.message, tone: "warning" };
    if (err.isUnconfirmed) return { message: UNCONFIRMED_MESSAGE, tone: "warning" };
    return { message: err.message, tone: "error" };
  }
  return {
    message: err instanceof Error ? err.message : "Ocurrió un error inesperado.",
    tone: "error",
  };
}

/**
 * true si el error es de red/timeout: la operación pudo completarse igual, así
 * que conviene refrescar la lista antes de permitir un reintento.
 */
export function isUnconfirmed(err: unknown): boolean {
  return err instanceof ApiError && err.isUnconfirmed;
}
