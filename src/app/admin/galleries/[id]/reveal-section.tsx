"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// Fine wrapper client autour d'une section admin server-rendered — anime
// seulement l'entrée au scroll, ne touche pas au contenu ni aux Server
// Actions des formulaires enfants.
export function RevealSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.section>
  );
}
