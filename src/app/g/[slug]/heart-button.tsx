"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// Confettis + petite vibration à la sélection (retour d'Enzo, 2026-08-25 :
// "quand on met une photo dans la grille galerie en cœur je veux une
// animation un peu plus poussée comme des mini confettis autour ou une
// vibration du cœur") — les deux à la fois plutôt qu'un choix : le cœur
// vibre (keyframes scale/rotate) PENDANT que les particules partent
// autour. Jamais au retrait de la sélection — seulement au moment où on
// choisit une photo, l'instant qui mérite d'être fêté.
const PARTICLES = [
  { dx: -18, dy: -22, color: "var(--color-brand-gold)" },
  { dx: 4, dy: -28, color: "var(--color-accent)" },
  { dx: 22, dy: -18, color: "var(--color-brand-gold)" },
  { dx: 24, dy: 8, color: "var(--color-accent)" },
  { dx: -22, dy: 6, color: "var(--color-brand-gold)" },
  { dx: -4, dy: 26, color: "var(--color-accent)" },
];

export function HeartButton({
  selected,
  locked,
  onToggle,
  variant = "chip",
}: {
  selected: boolean;
  locked: boolean;
  onToggle: () => void;
  /** "chip" = pastille claire posée sur une photo (grille) ; "panel" =
   * fond sombre du panneau de remarques (lightbox). */
  variant?: "chip" | "panel";
}) {
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!burst) return;
    const timeout = setTimeout(() => setBurst(false), 650);
    return () => clearTimeout(timeout);
  }, [burst]);

  if (locked) return null;

  function handleClick() {
    if (!selected) setBurst(true);
    onToggle();
  }

  return (
    <span className="relative inline-flex">
      <AnimatePresence>
        {burst && (
          <span aria-hidden className="pointer-events-none absolute inset-0">
            {PARTICLES.map((particle, index) => (
              <motion.span
                key={index}
                className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: particle.color }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: particle.dx, y: particle.dy, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1], delay: index * 0.02 }}
              />
            ))}
          </span>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={handleClick}
        whileTap={{ scale: 0.85 }}
        animate={burst ? { scale: [1, 1.35, 0.9, 1.15, 1], rotate: [0, -12, 10, -6, 0] } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-label={selected ? "Retirer de la sélection" : "Ajouter à la sélection"}
        aria-pressed={selected}
        className={
          variant === "chip"
            ? `flex h-9 w-9 items-center justify-center rounded-full text-lg shadow-sm transition-colors ${
                selected
                  ? "bg-accent text-paper"
                  : "bg-paper/80 text-ink backdrop-blur-sm hover:bg-paper"
              }`
            : `flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors ${
                selected ? "bg-accent text-paper" : "bg-paper/10 text-paper hover:bg-paper/20"
              }`
        }
      >
        {selected ? "♥" : "♡"}
      </motion.button>
    </span>
  );
}
