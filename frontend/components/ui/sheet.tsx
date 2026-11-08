"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion, useDragControls, type PanInfo } from "motion/react";

/*
 * Panel lateral (hoja) con física estilo iOS. Sigue las skills apple-design y emil-design-eng:
 *  - Entra y sale por el mismo lado (consistencia espacial).
 *  - Resorte sin rebote (damping 1.0), interrumpible: si lo agarras mientras se mueve, sigue tu dedo.
 *  - Se arrastra 1:1 hacia la derecha para cerrarlo. Un "lanzamiento" rápido basta, sin recorrer
 *    la mitad de la pantalla. Hacia la izquierda resiste (rubber-band) en vez de frenar en seco.
 *  - Con "reducir movimiento" activado, solo hace un fundido.
 */

/** Velocidad (px/s) a partir de la cual un lanzamiento cierra la hoja aunque haya recorrido poco. */
const FLICK_VELOCITY = 500;
/** Fracción del ancho que hay que arrastrar para cerrar sin lanzar. */
const CLOSE_DISTANCE = 0.35;

const sheetSpring = { type: "spring", bounce: 0, duration: 0.35 } as const;

export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  /** Se llama al tocar fuera, arrastrar para cerrar o pulsar Escape. Debe ignorarse si hay una acción en curso. */
  onClose: () => void;
  children: ReactNode;
  /** Nombre accesible del panel. */
  label?: string;
}) {
  const controls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  // Al cerrar, el padre deja de pasar contenido; AnimatePresence conserva el último render
  // del panel mientras anima la salida, así que no se vacía a mitad de camino.

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function startDrag(e: PointerEvent<HTMLDivElement>) {
    // No robar el gesto a campos de texto (seleccionar texto no debe mover la hoja).
    if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']")) return;
    controls.start(e);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const width = panelRef.current?.offsetWidth ?? 384;
    if (info.offset.x > width * CLOSE_DISTANCE || info.velocity.x > FLICK_VELOCITY) onClose();
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <div key="sheet" className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={onClose}
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="material-sheet relative w-full max-w-sm h-full bg-page-modal border-l border-border-medium flex flex-col touch-pan-y"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={sheetSpring}
              drag="x"
              dragListener={false}
              dragControls={controls}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.04, right: 1 }}
              dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
              onPointerDown={startDrag}
              onDragEnd={onDragEnd}
            >
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
