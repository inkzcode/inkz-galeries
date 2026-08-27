"use client";

import { motion } from "motion/react";
import type { PublicGallery, PublicGalleryPhoto } from "@/lib/services/public-gallery-service";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

// Refonte de l'ouverture de galerie (retour d'Enzo, 2026-08-27 : "je veux
// que l'arrivée dans une galerie ressemble davantage à l'ouverture d'un
// shooting photographique [...] le nom du shooting doit avoir une vraie
// présence"). Reprend le principe de composition du hero de la home
// (home-intro.tsx) — deux zones asymétriques, kicker discret au-dessus
// du titre — plutôt que d'inventer une nouvelle direction. La première
// photo (déjà utilisable comme couverture) sert d'image d'ouverture,
// volontairement AUSSI présente dans la grille plus bas : une répétition
// normale dans un lookbook, pas un bug.
export function GalleryHeader({
  gallery,
  coverPhoto,
}: {
  gallery: PublicGallery;
  coverPhoto: PublicGalleryPhoto | null;
}) {
  return (
    <motion.header
      className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="order-2 lg:order-1">
          <p className="text-sm tracking-wide text-muted uppercase">
            {gallery.shootingDate ? dateFormatter.format(gallery.shootingDate) : "Votre galerie privée"}
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] font-bold text-ink sm:text-6xl lg:text-7xl">
            {gallery.title}
          </h1>
          {gallery.description && (
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              {gallery.description}
            </p>
          )}
        </div>

        {coverPhoto?.previewUrl && (
          <motion.div
            className="order-1 overflow-hidden rounded-md lg:order-2"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
            <img
              src={coverPhoto.previewUrl}
              alt=""
              style={
                coverPhoto.width && coverPhoto.height
                  ? { aspectRatio: `${coverPhoto.width} / ${coverPhoto.height}` }
                  : undefined
              }
              className="h-auto w-full object-cover"
            />
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
