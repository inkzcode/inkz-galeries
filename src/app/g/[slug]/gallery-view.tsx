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
import { WATERMARK_DISCLAIMER } from "@/lib/domain/watermark-policy";
import type { DrawingPoint, PublicGallery } from "@/lib/services/public-gallery-service";
import { RawDisclaimer } from "./raw-disclaimer";
import { GalleryHeader } from "./gallery-header";
import { HeartButton } from "./heart-button";
import { BackLink } from "../../back-link";

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
  isPreview = false,
}: {
  gallery: PublicGallery;
  selfImageMessages?: string[];
  /** Aperçu admin (voir preview/page.tsx) — retour d'Enzo, 2026-08-27 :
   * "quand les photos ne s'affichent pas à cause du 1 Go par jour [...]
   * juste côté admin photographe" pour pouvoir continuer à juger la mise
   * en page pendant un dépassement de quota B2, sans jamais montrer un
   * faux visuel à un vrai client (voir onImageError plus bas, strictement
   * gardé par ce drapeau). */
  isPreview?: boolean;
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
  // Couverture de l'ouverture de galerie (gallery-header.tsx) : une photo
  // verticale d'abord si une existe (retour d'Enzo, 2026-08-27 : "ça rend
  // beaucoup mieux") — la colonne de couverture est plus haute que large,
  // une photo au format paysage y serait recadrée bizarrement. Retombe
  // sur la première photo tout court si aucune verticale n'est présente,
  // plutôt que de n'afficher aucune couverture.
  const coverPhoto =
    viewablePhotos.find((photo) => photo.width && photo.height && photo.height > photo.width) ??
    viewablePhotos[0] ??
    null;
  const openPhoto = openIndex !== null ? viewablePhotos[openIndex] : null;
  const drafts = openPhoto ? (draftsByPhoto[openPhoto.id] ?? []) : [];
  const nextColor = openPhoto
    ? colorForNoteIndex(openPhoto.notes.length + drafts.length)
    : colorForNoteIndex(0);
  // Petit signal visuel quand on clique "Annoter cette photo" dans le
  // panneau (retour d'Enzo, mockup du 2026-08-27 : conserver ce bouton du
  // mockup) — le tracé libre est déjà actif en permanence sur la photo
  // (voir drawing-overlay.tsx), ce bouton ne change donc rien au
  // fonctionnement (point 12 : "ne casse rien"), il rend juste visible où
  // dessiner via un bref halo coloré sur la photo. `key`-based replay,
  // même idée que send-burst.tsx.
  const [hintKey, setHintKey] = useState(0);

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

  // Retour d'Enzo, 2026-08-27 : quand le quota B2 (1 Go/jour) est
  // dépassé, toutes les images échouent à charger d'un coup — impossible
  // de juger la mise en page pendant ce temps. En aperçu admin
  // UNIQUEMENT (jamais côté vrai client — ce serait montrer un faux
  // visuel), une image qui échoue est remplacée par un aperçu générique,
  // juste pour voir le rythme de la grille.
  //
  // Suivi en état React (pas juste `event.currentTarget.src` comme au
  // premier jet) — retour d'Enzo, 2026-08-28 : "le logo Inkz apparaît
  // bien côté grille mais quand on clique sur une image pour voir la
  // fenêtre de détail elle ne s'affiche plus". Cause réelle : la
  // visionneuse (lightbox.tsx) recharge la MÊME url d'origine dans un
  // <img> totalement séparé de celui de la grille — un simple swap du
  // DOM de la grille ne la corrige donc pas. En gardant la liste des
  // photos en échec ici, `effectiveSrc` peut fournir directement le
  // repli à la grille ET à la visionneuse.
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(new Set());

  function handleImageError(photoId: string) {
    if (!isPreview) return;
    setBrokenPhotoIds((prev) => (prev.has(photoId) ? prev : new Set(prev).add(photoId)));
  }

  function effectiveSrc(photo: { id: string; previewUrl: string | null }): string | null {
    if (isPreview && brokenPhotoIds.has(photo.id)) return "/photo-placeholder-landscape.png";
    return photo.previewUrl;
  }

  return (
    <div className="pb-28">
      {/* Retour d'Enzo, 2026-08-27 : "un petit bouton pour retourner vers
          le site une fois dans la galerie vu client" — même composant que
          le reste de l'admin (back-link.tsx), pour rester discret. */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <BackLink href="/" label="Retour au site" />
      </div>

      <GalleryHeader gallery={gallery} coverPhoto={coverPhoto} isPreview={isPreview} />

      {gallery.retouchPhilosophyEnabled && <RawDisclaimer />}

      {/* Filigrane légal (retour d'Enzo, 2026-08-27 : "il fait tache dans
          la première impression") — déplacé du header vers ici, juste
          avant les photos qu'il concerne, indépendamment de
          `retouchPhilosophyEnabled` (c'est une mention légale, pas un
          contenu éditorial optionnel). */}
      {gallery.watermarkLevel !== "NONE" && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="max-w-2xl text-xs text-faint">{WATERMARK_DISCLAIMER}</p>
        </div>
      )}

      {/* Transition calme avant la grille (retour d'Enzo, 2026-08-27) —
          juste le compte, rien de plus ; les photos deviennent le produit
          principal à partir d'ici. Repris en petite pastille or (retour
          d'Enzo, 2026-08-27 : "la palette doit être plus présente [...]
          jaune crème pour les petits fonds éditoriaux") — la partie
          "sélectionnée(s)" en rouge, seul vrai signal de couleur de cette
          ligne, pour rester lisible comme une info, pas une décoration. */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-6 sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1 text-sm text-ink-soft tabular-nums">
          {photos.length} photographie{photos.length > 1 ? "s" : ""}
          {selectedCount > 0 && (
            <span className="font-medium text-accent">
              · {selectedCount} sélectionnée{selectedCount > 1 ? "s" : ""}
            </span>
          )}
        </span>
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
            className={`group relative mb-6 break-inside-avoid overflow-hidden rounded-md transition-shadow ${
              photo.selected
                ? "ring-2 ring-accent ring-offset-2 ring-offset-paper"
                : "hover:ring-1 hover:ring-accent-soft"
            }`}
          >
            {photo.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URLs de preview signées/locales, voir storage/README.md
              <img
                src={effectiveSrc(photo) ?? undefined}
                alt=""
                onClick={() => openLightbox(viewablePhotos.findIndex((p) => p.id === photo.id))}
                onError={() => handleImageError(photo.id)}
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
              />
            </span>
          </motion.div>
        ))}
      </motion.div>

      <Lightbox
        photos={viewablePhotos.map((photo) => ({ id: photo.id, src: effectiveSrc(photo)! }))}
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
              hintKey={hintKey}
            />
          )
        }
        sidePanel={
          // Pas de `key={openPhoto.id}` ici (retiré le 2026-08-28) — un
          // remontage complet à chaque photo empêchait l'animation de
          // hauteur de la carte (lightbox.tsx, `motion.div layout`) de
          // se dérouler proprement : Framer Motion perdait le fil entre
          // l'ancien et le nouveau DOM, laissant la carte visuellement
          // "coincée" à mi-transition. `PhotoNotesPanel` réinitialise
          // maintenant son état interne lui-même via un effet sur
          // `photoId` (voir photo-notes-panel.tsx).
          openPhoto && (
            <PhotoNotesPanel
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
              onAnnotateHint={() => setHintKey((key) => key + 1)}
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
