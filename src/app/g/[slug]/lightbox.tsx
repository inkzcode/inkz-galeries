"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

export type LightboxPhoto = { id: string; src: string; alt?: string };

// Visionneuse plein écran partagée entre la galerie de sélection
// (gallery-view.tsx, avec pointage de remarque) et la livraison finale
// (delivery-view.tsx, avec téléchargement) — navigation précédent/suivant
// au clic et au clavier (flèches, Échap), transition en fondu-enchaîné
// entre deux photos plutôt qu'un changement brutal.
//
// Refonte du 2026-08-27 (retour d'Enzo, mockup à l'appui) : plus de fond
// sombre semi-transparent (`bg-ink/95`) laissant deviner la grille
// derrière — la visionneuse est maintenant un espace à part entière,
// opaque, dans la même palette claire que le reste du site (le site n'a
// pas de vrai mode sombre à ce jour, donc pas de variante `dark:` ici).
// Barre du haut (compteur + fermer) toujours hors de la zone photo pour
// ne jamais recouvrir l'image ; "Voir toutes les photos" posé sous la
// photo dans le flux normal, pour la même raison — jamais en superposition.
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
          className="fixed inset-0 z-50 flex flex-col bg-surface"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* Barre du haut — toujours hors de la zone photo, ne recouvre jamais l'image */}
          <div className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-6">
            <span className="text-sm text-ink-soft tabular-nums">
              {index! + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              aria-label="Fermer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-paper text-xl text-ink shadow-sm transition-colors hover:bg-border/40"
            >
              ×
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <div
              className="relative flex flex-col gap-3 px-4 pb-6 sm:px-6 lg:min-h-0 lg:flex-1"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative flex min-h-0 flex-1 items-center justify-center">
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
                    className="max-h-[62vh] max-w-full object-contain select-none lg:max-h-[78vh]"
                  />
                </AnimatePresence>
                {imageOverlay}

                {index! > 0 && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onNavigate(index! - 1);
                    }}
                    aria-label="Photo précédente"
                    className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-paper text-2xl text-ink shadow-sm transition-colors hover:bg-border/40"
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
                    className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-paper text-2xl text-ink shadow-sm transition-colors hover:bg-border/40"
                  >
                    ›
                  </button>
                )}
              </div>

              {children}

              {/* Retour à la grille (retour d'Enzo, mockup à l'appui) — posé
                  sous la photo dans le flux normal, jamais en superposition,
                  pour ne jamais concurrencer l'image quelle que soit son
                  ratio. */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
                className="inline-flex w-fit shrink-0 items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                  <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                  <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
                  <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
                </svg>
                Voir toutes les photos
              </button>
            </div>

            {sidePanel && (
              <div
                className="flex w-full shrink-0 flex-col overflow-hidden border-t border-border bg-paper lg:w-[400px] lg:min-h-0 lg:border-t-0 lg:border-l"
                onClick={(event) => event.stopPropagation()}
              >
                {sidePanel}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
