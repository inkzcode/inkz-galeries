"use client";

import { motion } from "motion/react";
import { BrandDots } from "./brand-dots";

// Extrait de page.tsx (2026-08-25) — voir home-intro.tsx pour le contexte
// de cette extraction.
export function HomeFooter() {
  return (
    <footer className="relative border-t border-border px-6 py-12 sm:px-10">
      <motion.div
        className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <BrandDots size={8} />
          <span className="text-sm text-muted">Inkz — galeries clients</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-soft">
          <a href="mailto:enzo.ac111@gmail.com" className="transition-colors hover:text-ink">
            enzo.ac111@gmail.com
          </a>
          <a href="tel:+33660586205" className="transition-colors hover:text-ink">
            06 60 58 62 05
          </a>
          <a
            href="https://instagram.com/inkz.raw"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            @Inkz.raw
          </a>
        </div>
      </motion.div>
    </footer>
  );
}
