"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { markDeliveredAction } from "./delivery-actions";
import { Lightbox } from "./lightbox";

const EASE = [0.2, 0.7, 0.3, 1] as const;
const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const tile: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

type DeliveredPhoto = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  viewUrl: string;
  downloadUrl: string;
};

// Étape 3 du parcours (brief §18) : "Tes photos sont prêtes ✨". Fichiers
// HD, sans watermark (voir final-delivery-service.ts — le final n'est
// jamais retraité). Téléchargement individuel seulement pour l'instant —
// pas de "Tout télécharger" (nécessiterait de zipper côté serveur,
// volontairement pas construit, le brief le présente comme "éventuel").
//
// Le marquage "livré" se déclenche ici, au montage réel dans le
// navigateur — jamais pendant le rendu serveur de la page (voir
// delivery-actions.ts pour pourquoi : un GET ne doit jamais avoir d'effet
// de bord).
export function DeliveryView({
  gallerySlug,
  galleryId,
  galleryTitle,
  photos,
  isPreview = false,
}: {
  gallerySlug: string;
  galleryId: string;
  galleryTitle: string;
  photos: DeliveredPhoto[];
  /** Aperçu depuis l'admin (voir preview/page.tsx) — tout le reste de
   * cette vue est réellement interactif dans l'aperçu (photos, lightbox,
   * téléchargement) ; seul ce déclenchement est bloqué, pour ne jamais
   * faire passer la galerie au statut "livrée" juste parce qu'Enzo
   * regarde son propre aperçu. */
  isPreview?: boolean;
}) {
  useEffect(() => {
    if (isPreview) return;
    markDeliveredAction(gallerySlug, galleryId);
  }, [gallerySlug, galleryId, isPreview]);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openPhoto = openIndex !== null ? photos[openIndex] : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm tracking-wide text-muted uppercase">{galleryTitle}</p>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Tes photos sont prêtes ✨</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Voici tes photographies finales, en haute définition, sans filigrane.
        </p>
      </motion.div>

      {photos.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          Les fichiers arrivent bientôt — reviens un peu plus tard.
        </p>
      ) : (
        <motion.div
          className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3"
          variants={grid}
          initial="hidden"
          animate="show"
        >
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              variants={tile}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-md border border-border bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL signée/locale, voir storage/README.md */}
              <img
                src={photo.viewUrl}
                alt={photo.filename}
                onClick={() => setOpenIndex(index)}
                style={
                  photo.width && photo.height
                    ? { aspectRatio: `${photo.width} / ${photo.height}` }
                    : undefined
                }
                className="h-auto w-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-[1.015]"
              />
              <a
                href={photo.downloadUrl}
                download={photo.filename}
                onClick={(event) => event.stopPropagation()}
                className="block px-3 py-2.5 text-center text-xs font-medium text-ink underline decoration-border underline-offset-2 hover:text-accent"
              >
                Télécharger
              </a>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Lightbox
        photos={photos.map((photo) => ({ id: photo.id, src: photo.viewUrl, alt: photo.filename }))}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      >
        {openPhoto && (
          <a
            href={openPhoto.downloadUrl}
            download={openPhoto.filename}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Télécharger cette photo
          </a>
        )}
      </Lightbox>
    </main>
  );
}
