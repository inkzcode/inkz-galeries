"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type LightboxPhoto = { id: string; src: string; alt?: string };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
  zoomEnabled = true,
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
  /** Zoom pincé sur la photo (retour de l'ami d'Enzo testant sur
   * téléphone, 2026-08-31 : "ça serait cool qu'on puisse zoomer sur les
   * photos pour mieux pouvoir entourer sur téléphone"). Désactivé par
   * l'appelant pendant qu'un dessin est en cours (gallery-view.tsx) —
   * les deux gestes tactiles ne doivent jamais se disputer le même
   * évènement pointeur. Toujours actif pour delivery-view.tsx (pas de
   * dessin là-bas, aucune raison de le désactiver). */
  zoomEnabled?: boolean;
}) {
  const open = index !== null;
  const photo = open ? photos[index] : null;

  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ pointerX: number; pointerY: number; originX: number; originY: number } | null>(
    null,
  );

  // Toujours dézoomé à l'arrivée sur une photo, ou dès que le zoom est
  // désactivé (passage en mode dessin) — la surface de dessin suppose une
  // photo à sa taille normale ; un zoom encore actif désynchroniserait le
  // tracé de ce que le client voit réellement. Réinitialisé PENDANT le
  // rendu (même pattern que `prevPhotoId` dans photo-notes-panel.tsx),
  // pas dans un `useEffect` — évite une frame de zoom obsolète.
  const zoomResetKey = `${photo?.id ?? ""}:${zoomEnabled}`;
  const [prevZoomResetKey, setPrevZoomResetKey] = useState(zoomResetKey);
  if (zoomResetKey !== prevZoomResetKey) {
    setPrevZoomResetKey(zoomResetKey);
    setZoom({ scale: 1, x: 0, y: 0 });
  }
  // Les refs de geste (pas des données de rendu) sont nettoyées à part,
  // dans un effet — les muter pendant le rendu est interdit (règle
  // react-hooks/refs).
  useEffect(() => {
    pointersRef.current.clear();
    pinchRef.current = null;
    panRef.current = null;
  }, [zoomResetKey]);

  function handleImagePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!zoomEnabled) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture non disponible pour ce type de pointeur (rare).
    }
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: zoom.scale };
      panRef.current = null;
    } else if (pointersRef.current.size === 1 && zoom.scale > MIN_ZOOM) {
      panRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        originX: zoom.x,
        originY: zoom.y,
      };
    }
  }

  function handleImagePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!zoomEnabled || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const nextScale = clamp(
        pinchRef.current.scale * (distance / pinchRef.current.distance),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      setZoom((current) => ({ ...current, scale: nextScale }));
    } else if (pointersRef.current.size === 1 && panRef.current && zoom.scale > MIN_ZOOM) {
      const dx = event.clientX - panRef.current.pointerX;
      const dy = event.clientY - panRef.current.pointerY;
      const maxOffset = (zoom.scale - 1) * 220;
      setZoom((current) => ({
        ...current,
        x: clamp(panRef.current!.originX + dx, -maxOffset, maxOffset),
        y: clamp(panRef.current!.originY + dy, -maxOffset, maxOffset),
      }));
    }
  }

  function handleImagePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    panRef.current = null;
    if (pointersRef.current.size === 0) {
      setZoom((current) => (current.scale <= MIN_ZOOM + 0.02 ? { scale: 1, x: 0, y: 0 } : current));
    }
  }

  function handleImageDoubleClick() {
    if (!zoomEnabled) return;
    setZoom((current) => (current.scale > MIN_ZOOM ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }));
  }

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
              {/* Carte photo — `layout` lisse aussi le changement de
                  hauteur entre une photo portrait et une photo paysage. */}
              <div className="flex flex-1 flex-col gap-4">
                <motion.div layout transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }} className="relative mx-auto">
                  {/* Zoom pincé (retour de l'ami d'Enzo, 2026-08-31) —
                      gestionnaires posés ici, sur le conteneur PARTAGÉ
                      avec la surface de dessin : quand celle-ci est
                      désactivée (mode dessin éteint), elle passe en
                      `pointer-events-none` (drawing-overlay.tsx) et les
                      gestes tactiles retombent naturellement ici. Double-
                      clic/double-tap pour réinitialiser rapidement. */}
                  <div
                    className="relative touch-none overflow-hidden rounded-2xl bg-ink shadow-sm"
                    onPointerDown={handleImagePointerDown}
                    onPointerMove={handleImagePointerMove}
                    onPointerUp={handleImagePointerUp}
                    onPointerCancel={handleImagePointerUp}
                    onDoubleClick={handleImageDoubleClick}
                  >
                    <motion.div
                      animate={{ x: zoom.x, y: zoom.y, scale: zoom.scale }}
                      transition={{ duration: zoom.scale === 1 ? 0.25 : 0, ease: [0.2, 0.7, 0.3, 1] }}
                    >
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
                    </motion.div>
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
                </motion.div>

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

              {/* `layout` anime tout changement de hauteur de cette carte
                  (citation "à garder en tête" plus ou moins longue d'une
                  photo à l'autre, bouton "favoris" qui apparaît/disparaît)
                  — retour d'Enzo, 2026-08-28 : "la fenêtre reste
                  complètement figée [...] il faudrait un truc hyper
                  smooth comme si il s'étendait ou se rapetissait".
                  `PhotoNotesPanel` se démonte/remonte à chaque photo (son
                  propre état interne doit repartir de zéro), donc c'est
                  CETTE carte qui doit porter l'animation, pas son
                  contenu — `layout` la détecte même à travers un
                  remontage de ses enfants. */}
              {sidePanel && (
                <motion.div
                  layout
                  transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
                  className="w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-paper shadow-sm lg:w-[400px]"
                >
                  {sidePanel}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
