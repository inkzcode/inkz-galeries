"use client";

import { useState } from "react";
import { motion, type Variants } from "motion/react";
import type { PortfolioEntry } from "@/lib/services/portfolio-service";
import { Lightbox } from "./g/[slug]/lightbox";

const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const tile: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Grille du portfolio public (brief §1) — utilisée à deux endroits :
// directement sur la page d'accueil (retour d'Enzo, 2026-08-25 : "je ne
// veux pas que le portfolio soit simplement un petit mot en bas de page,
// je veux une vraie galerie à grille") ET sur /portfolio, pour garder un
// lien direct partageable (Instagram bio, etc.) sans dupliquer le rendu.
//
// Couverture → clic → dévoile le shooting (retour d'Enzo, 2026-08-29 :
// "le même type que inkz.fr [...] quand on clique ça dévoile le reste du
// shooting") — réutilise la visionneuse existante (g/[slug]/lightbox.tsx)
// telle quelle, plutôt qu'un nouveau composant : avec un tableau d'une
// seule photo (entrées PortfolioItem autonomes, `photos: null`), la
// visionneuse cache déjà ses flèches précédent/suivant d'elle-même — donc
// aucun "voir plus" trompeur pour ce qui n'a structurellement rien à
// dévoiler, sans code de branchement supplémentaire.
export function PortfolioGrid({ entries }: { entries: PortfolioEntry[] }) {
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  const openEntry = entries.find((entry) => entry.id === openEntryId) ?? null;
  const openPhotos = openEntry ? (openEntry.photos ?? [openEntry.coverUrl]) : [];

  function handleOpen(entry: PortfolioEntry) {
    setOpenEntryId(entry.id);
    setPhotoIndex(0);
  }

  function handleClose() {
    setOpenEntryId(null);
    setPhotoIndex(null);
  }

  return (
    <>
      <motion.div
        className="columns-1 gap-4 sm:columns-2 lg:columns-3"
        variants={grid}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {entries.map((entry) => {
          const photoCount = entry.photos?.length ?? 1;
          return (
            <motion.button
              type="button"
              key={entry.id}
              variants={tile}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
              onClick={() => handleOpen(entry)}
              className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-md bg-surface text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
              <img
                src={entry.coverUrl}
                alt={entry.title}
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />

              {/* Voile + icône qui invitent au clic (retour d'Enzo,
                  2026-08-29 : "rajoute un max d'animation") — distinct du
                  bandeau de titre toujours visible en dessous. */}
              <div className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/25 group-hover:opacity-100">
                <span className="flex -translate-y-2 scale-90 items-center gap-1.5 rounded-full bg-paper/95 px-3.5 py-1.5 text-xs font-medium text-ink opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
                    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
                  </svg>
                  {photoCount > 1 ? `Voir les ${photoCount} photos` : "Voir la photo"}
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent px-4 pt-10 pb-3 transition-transform duration-300 group-hover:-translate-y-1">
                <p className="font-serif text-lg font-semibold text-paper">{entry.title}</p>
                {entry.shootingType && (
                  <p className="text-xs tracking-wide text-paper/70 uppercase">{entry.shootingType}</p>
                )}
                {entry.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-paper/85">{entry.description}</p>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <Lightbox
        photos={openPhotos.map((src, index) => ({ id: `${openEntryId}-${index}`, src }))}
        index={photoIndex}
        onClose={handleClose}
        onNavigate={setPhotoIndex}
      />
    </>
  );
}
