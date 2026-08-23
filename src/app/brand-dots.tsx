"use client";

import { motion } from "motion/react";

// Repère de marque réutilisable (les deux points rouge/or du logo Inkz) —
// en attendant le vrai fichier logo, voir PROJECT_CONTEXT.md
// §6dixies/§6undecies. `size` en pixels pour s'adapter au contexte
// (en-tête discret vs. accueil publique plus visible).
export function BrandDots({ size = 12 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      <motion.span
        className="rounded-full bg-accent"
        style={{ width: size, height: size }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="rounded-full bg-accent-tint"
        style={{ width: size, height: size }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
    </span>
  );
}
