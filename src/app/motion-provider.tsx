"use client";

import { MotionConfig } from "motion/react";

// Respecte prefers-reduced-motion pour TOUTE animation motion/react de
// l'app, automatiquement — pas besoin de le revérifier dans chaque
// composant animé.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
