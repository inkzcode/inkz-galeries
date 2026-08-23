"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

export type LightboxPhoto = { id: string; src: string; alt?: string };

// Visionneuse plein écran partagée entre la galerie de sélection
// (gallery-view.tsx, avec pointage de remarque) et la livraison finale
// (delivery-view.tsx, avec téléchargement) — navigation précédent/suivant
// au clic et au clavier (flèches, Échap), transition en fondu-enchaîné
// entre deux photos plutôt qu'un changement brutal.
export function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  imageOverlay,
  sidePanel,
  children,
}: {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  /** Contenu superposé à l'image (ex. DrawingOverlay) — rendu dans le même
   * conteneur `relative`, dimensionné exactement comme l'image affichée. */
  imageOverlay?: React.ReactNode;
  /** Panneau latéral (ex. remarques éditables) — affiché à droite de la
   * photo sur grand écran, empilé en dessous sur mobile (retour d'Enzo,
   * 2026-08-22 : "la photo en grand à gauche et à droite une fenêtre où
   * on peut écrire"). Absent pour delivery-view.tsx, qui continue à
   * utiliser `children` pour son simple bouton de téléchargement. */
  sidePanel?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const open = index !== null;
  const photo = open ? photos[index] : null;

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index! < photos.length - 1) onNavigate(index! + 1);
      if (event.key === "ArrowLeft" && index! > 0) onNavigate(index! - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, index, photos.length, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {open && photo && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-ink/95 p-4 lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div
            className={`flex w-full flex-1 flex-col items-center gap-4 ${
              sidePanel ? "lg:max-w-6xl lg:flex-row lg:items-stretch lg:gap-6" : "justify-center"
            }`}
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              <div className="relative" onClick={(event) => event.stopPropagation()}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={photo.id}
                    src={photo.src}
                    alt={photo.alt ?? ""}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="max-h-[70vh] max-w-full object-contain select-none lg:max-h-[80vh]"
                  />
                </AnimatePresence>
                {imageOverlay}
              </div>
            </div>

            {sidePanel && (
              <div
                className="flex w-full shrink-0 flex-col overflow-hidden rounded-lg border border-paper/10 bg-ink/40 lg:w-[380px] lg:max-h-[80vh]"
                onClick={(event) => event.stopPropagation()}
              >
                {sidePanel}
              </div>
            )}
          </div>

          {children}

          {index! > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNavigate(index! - 1);
              }}
              aria-label="Photo précédente"
              className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/10 text-2xl text-paper transition-colors hover:bg-paper/20 sm:left-4"
            >
              ‹
            </button>
          )}
          {index! < photos.length - 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNavigate(index! + 1);
              }}
              aria-label="Photo suivante"
              className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/10 text-2xl text-paper transition-colors hover:bg-paper/20 sm:right-4"
            >
              ›
            </button>
          )}

          <span className="absolute top-4 left-4 text-xs text-paper/60">
            {index! + 1} / {photos.length}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper/10 text-2xl text-paper transition-colors hover:bg-paper/20"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
