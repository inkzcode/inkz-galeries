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
// Refonte du 2026-08-27 (retour d'Enzo, mockup PRÉCIS à reproduire, pas
// une simple inspiration) : plus de fond sombre semi-transparent — deux
// "cartes" claires (photo + panneau) posées sur un fond crème, chacune
// arrondie/bordée/ombrée comme dans le mockup, avec la barre compteur/
// fermer AU-DESSUS des deux cartes (jamais superposée à la photo). Les
// flèches sortent légèrement de la carte photo plutôt que de flotter aux
// bords de l'écran. Tous les contrôles ont retrouvé une micro-animation
// au survol/clic (`whileHover`/`whileTap`) — leur absence dans le premier
// jet de cette refonte a été explicitement reprochée par Enzo ("on a
// perdu toute les animations").
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
          className="fixed inset-0 z-50 overflow-y-auto bg-surface"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-8">
            {/* Barre du haut — toujours hors des deux cartes */}
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <span className="text-sm text-ink-soft tabular-nums">
                {index! + 1} / {photos.length}
              </span>
              <motion.button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Fermer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-paper text-xl text-ink shadow-sm transition-colors hover:bg-border/40"
              >
                ×
              </motion.button>
            </div>

            <div
              className="flex flex-col gap-6 lg:flex-row lg:items-start"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Carte photo */}
              <div className="flex flex-1 flex-col gap-4">
                <div className="relative mx-auto">
                  <div className="overflow-hidden rounded-2xl bg-ink shadow-sm">
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
                        className="max-h-[60vh] max-w-full object-contain select-none lg:max-h-[72vh]"
                      />
                    </AnimatePresence>
                    {imageOverlay}
                  </div>

                  {index! > 0 && (
                    <motion.button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onNavigate(index! - 1);
                      }}
                      whileHover={{ scale: 1.08, x: -2 }}
                      whileTap={{ scale: 0.92 }}
                      aria-label="Photo précédente"
                      className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-paper text-2xl text-ink shadow-sm transition-colors hover:bg-border/40 lg:-left-5"
                    >
                      ‹
                    </motion.button>
                  )}
                  {index! < photos.length - 1 && (
                    <motion.button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onNavigate(index! + 1);
                      }}
                      whileHover={{ scale: 1.08, x: 2 }}
                      whileTap={{ scale: 0.92 }}
                      aria-label="Photo suivante"
                      className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-paper text-2xl text-ink shadow-sm transition-colors hover:bg-border/40 lg:-right-5"
                    >
                      ›
                    </motion.button>
                  )}
                </div>

                {children}

                {/* Retour à la grille (retour d'Enzo, mockup à l'appui) —
                    sous la photo dans le flux normal, jamais en
                    superposition, pour ne jamais concurrencer l'image. */}
                <motion.button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  whileHover={{ x: -2 }}
                  className="inline-flex w-fit shrink-0 items-center gap-2.5 text-sm text-ink-soft transition-colors hover:text-ink"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
                    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
                  </svg>
                  <span className="leading-tight">
                    Voir toutes
                    <br />
                    les photos
                  </span>
                </motion.button>
              </div>

              {sidePanel && (
                <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-paper shadow-sm lg:w-[400px]">
                  {sidePanel}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
