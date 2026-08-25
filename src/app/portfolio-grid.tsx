"use client";

import { motion, type Variants } from "motion/react";
import type { PortfolioEntry } from "@/lib/services/portfolio-service";

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
export function PortfolioGrid({ entries }: { entries: PortfolioEntry[] }) {
  return (
    <motion.div
      className="columns-1 gap-4 sm:columns-2 lg:columns-3"
      variants={grid}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {entries.map((entry) => (
        <motion.div
          key={entry.slug}
          variants={tile}
          whileHover={{ y: -4 }}
          className="group relative mb-4 break-inside-avoid overflow-hidden rounded-md bg-surface"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
          <img
            src={entry.coverUrl}
            alt={entry.title}
            className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent px-4 pt-10 pb-3">
            <p className="font-serif text-lg text-paper">{entry.title}</p>
            {entry.shootingType && (
              <p className="text-xs tracking-wide text-paper/70 uppercase">{entry.shootingType}</p>
            )}
            {entry.description && (
              <p className="mt-1 line-clamp-2 text-sm text-paper/85">{entry.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
