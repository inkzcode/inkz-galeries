"use client";

import { useOptimistic, useState, useTransition } from "react";
import { motion, type Variants } from "motion/react";
import { toggleSelectionAction } from "./selection-actions";
import { PhotoNotesPanel } from "./photo-notes-panel";
import { ConfirmSelectionBar } from "./confirm-selection-bar";
import { Lightbox } from "./lightbox";
import { DrawingOverlay, type DraftNote } from "./drawing-overlay";
import { summarizeSelection } from "@/lib/domain/selection-summary";
import { colorForNoteIndex } from "@/lib/domain/note-colors";
import type { DrawingPoint, PublicGallery } from "@/lib/services/public-gallery-service";
import { RawDisclaimer } from "./raw-disclaimer";
import { GalleryHeader } from "./gallery-header";
import { HeartButton } from "./heart-button";

const EASE = [0.2, 0.7, 0.3, 1] as const;
const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const tile: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function GalleryView({
  gallery,
  selfImageMessages,
}: {
  gallery: PublicGallery;
  selfImageMessages?: string[];
}) {
  const [photos, toggleOptimistic] = useOptimistic(
    gallery.photos,
    (state, photoId: string) =>
      state.map((photo) =>
        photo.id === photoId ? { ...photo, selected: !photo.selected } : photo,
      ),
  );
  const [, startTransition] = useTransition();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Brouillons de remarques (tracé + message) en attente d'envoi, par
  // photo — conservés même si on change de photo dans la lightbox, pour
  // ne jamais perdre un tracé fait par erreur de navigation (retour
  // d'Enzo, 2026-08-22 : plusieurs tracés/remarques avant un envoi groupé).
  const [draftsByPhoto, setDraftsByPhoto] = useState<Record<string, DraftNote[]>>({});

  const locked = gallery.selectionLockedAt !== null;
  const selectedCount = photos.filter((photo) => photo.selected).length;
  const summary = summarizeSelection(
    {
      pricingMode: gallery.pricingMode,
      includedPhotosCount: gallery.includedPhotosCount,
      extraPhotoPriceCents: gallery.extraPhotoPriceCents,
      currency: gallery.currency,
    },
    selectedCount,
  );

  function handleToggle(photoId: string) {
    if (locked) return;
    startTransition(async () => {
      toggleOptimistic(photoId);
      await toggleSelectionAction(gallery.slug, photoId);
    });
  }

  function openLightbox(index: number) {
    setOpenIndex(index);
  }

  function closeLightbox() {
    setOpenIndex(null);
  }

  // Seules les photos avec un aperçu peuvent s'ouvrir en grand — indices
  // toujours relatifs à CETTE liste (pas à `photos`), pour ne jamais
  // désynchroniser la lightbox si une preview manque quelque part au
  // milieu de la grille.
  const viewablePhotos = photos.filter((photo) => photo.previewUrl);
  const openPhoto = openIndex !== null ? viewablePhotos[openIndex] : null;
  const drafts = openPhoto ? (draftsByPhoto[openPhoto.id] ?? []) : [];
  const nextColor = openPhoto
    ? colorForNoteIndex(openPhoto.notes.length + drafts.length)
    : colorForNoteIndex(0);
  // Change avec la navigation (flèches ou clic sur une image), pas avec
  // le temps (retour d'Enzo, 2026-08-25 : "je veux qu'elle change à
  // chaque fois qu'on appuie sur les flèches [...] mais aussi à chaque
  // fois qu'on clique sur une image") — dérivé de l'index de la photo
  // ouverte, jamais tiré au hasard côté client (revenir sur la même
  // photo montre toujours le même message, plutôt qu'un vrai hasard qui
  // pourrait sembler incohérent).
  const currentSelfImageMessage =
    selfImageMessages && selfImageMessages.length > 0 && openIndex !== null
      ? selfImageMessages[openIndex % selfImageMessages.length]
      : null;

  function handleStrokeComplete(points: DrawingPoint[]) {
    if (!openPhoto) return;
    const photoId = openPhoto.id;
    const baseCount = openPhoto.notes.length;
    setDraftsByPhoto((prev) => {
      const existing = prev[photoId] ?? [];
      const color = colorForNoteIndex(baseCount + existing.length);
      const draft: DraftNote = { id: crypto.randomUUID(), points, color, message: "" };
      return { ...prev, [photoId]: [...existing, draft] };
    });
  }

  function handleDraftMessageChange(draftId: string, message: string) {
    if (!openPhoto) return;
    const photoId = openPhoto.id;
    setDraftsByPhoto((prev) => ({
      ...prev,
      [photoId]: (prev[photoId] ?? []).map((d) => (d.id === draftId ? { ...d, message } : d)),
    }));
  }

  function handleDraftDiscard(draftId: string) {
    if (!openPhoto) return;
    const photoId = openPhoto.id;
    setDraftsByPhoto((prev) => ({
      ...prev,
      [photoId]: (prev[photoId] ?? []).filter((d) => d.id !== draftId),
    }));
  }

  function handleDraftsSaved(savedDraftIds: string[]) {
    if (!openPhoto) return;
    const photoId = openPhoto.id;
    setDraftsByPhoto((prev) => ({
      ...prev,
      [photoId]: (prev[photoId] ?? []).filter((d) => !savedDraftIds.includes(d.id)),
    }));
  }

  return (
    <div className="pb-28">
      <GalleryHeader gallery={gallery} coverPhoto={viewablePhotos[0] ?? null} />

      {gallery.retouchPhilosophyEnabled && <RawDisclaimer />}

      {/* Transition calme avant la grille (retour d'Enzo, 2026-08-27) —
          juste le compte, rien de plus ; les photos deviennent le produit
          principal à partir d'ici. */}
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <p className="text-sm text-muted tabular-nums">
          {photos.length} photographie{photos.length > 1 ? "s" : ""}
          {selectedCount > 0 &&
            ` · ${selectedCount} sélectionnée${selectedCount > 1 ? "s" : ""}`}
        </p>
      </div>

      <motion.div
        className="mx-auto max-w-6xl columns-1 gap-6 px-4 sm:columns-2 sm:px-6 lg:columns-3"
        variants={grid}
        initial="hidden"
        animate="show"
      >
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            variants={tile}
            className="group relative mb-6 break-inside-avoid overflow-hidden rounded-md"
          >
            {photo.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URLs de preview signées/locales, voir storage/README.md
              <img
                src={photo.previewUrl}
                alt=""
                onClick={() => openLightbox(viewablePhotos.findIndex((p) => p.id === photo.id))}
                style={
                  photo.width && photo.height
                    ? { aspectRatio: `${photo.width} / ${photo.height}` }
                    : undefined
                }
                className="h-auto w-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-[1.015]"
              />
            ) : (
              <div className="flex aspect-[3/2] w-full items-center justify-center bg-surface text-xs text-muted">
                Aperçu indisponible
              </div>
            )}

            {photo.notes.length > 0 && (
              <span
                aria-hidden
                className="absolute bottom-2 left-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink/70 px-1.5 text-xs font-medium text-paper backdrop-blur-sm"
              >
                {photo.notes.length}
              </span>
            )}

            <span className="absolute top-2 right-2">
              <HeartButton
                selected={photo.selected}
                locked={locked}
                onToggle={() => handleToggle(photo.id)}
                variant="chip"
              />
            </span>
          </motion.div>
        ))}
      </motion.div>

      <Lightbox
        photos={viewablePhotos.map((photo) => ({ id: photo.id, src: photo.previewUrl! }))}
        index={openIndex}
        onClose={closeLightbox}
        onNavigate={(newIndex) => openLightbox(newIndex)}
        imageOverlay={
          openPhoto && (
            <DrawingOverlay
              notes={openPhoto.notes}
              draftNotes={drafts}
              activeColor={nextColor}
              onStrokeComplete={handleStrokeComplete}
            />
          )
        }
        sidePanel={
          openPhoto && (
            <PhotoNotesPanel
              key={openPhoto.id}
              gallerySlug={gallery.slug}
              photoId={openPhoto.id}
              notes={openPhoto.notes}
              drafts={drafts}
              onDraftMessageChange={handleDraftMessageChange}
              onDraftDiscard={handleDraftDiscard}
              onDraftsSaved={handleDraftsSaved}
              tips={{
                selfImageMessage: gallery.selfImageMessagesEnabled ? currentSelfImageMessage : null,
              }}
              selected={openPhoto.selected}
              locked={locked}
              onToggleSelected={() => handleToggle(openPhoto.id)}
            />
          )
        }
      />

      <ConfirmSelectionBar
        gallerySlug={gallery.slug}
        locked={locked}
        summary={summary}
        selectedPhotos={photos.filter((photo) => photo.selected)}
      />
    </div>
  );
}
