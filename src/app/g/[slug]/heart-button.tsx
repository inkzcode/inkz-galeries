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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path
        d="M12 21s-6.7-4.35-9.3-8.36C1.1 9.9 2 6.4 5.2 5.2c2-.75 4 .2 6.8 3 2.8-2.8 4.8-3.75 6.8-3 3.2 1.2 4.1 4.7 2.5 7.44C18.7 16.65 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartButton({
  selected,
  locked,
  onToggle,
  label,
}: {
  selected: boolean;
  locked: boolean;
  onToggle: () => void;
  /** Rend un grand bouton pleine largeur (icône + texte) plutôt que la
   * pastille circulaire — utilisé en bas de photo-notes-panel.tsx (mockup
   * d'Enzo, 2026-08-27 : "Ajouter à mes favoris" en pleine largeur). */
  label?: string;
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

  if (label) {
    return (
      <span className="relative block">
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
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          animate={burst ? { scale: [1, 1.04, 0.98, 1.02, 1] } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          aria-pressed={selected}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-paper shadow-sm transition-opacity hover:opacity-90"
        >
          <HeartIcon filled={selected} />
          {selected ? "Dans mes favoris" : label}
        </motion.button>
      </span>
    );
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
        className={`flex h-9 w-9 items-center justify-center rounded-full text-lg shadow-sm transition-colors ${
          selected
            ? "bg-accent text-paper"
            : "border border-border bg-paper/80 text-ink backdrop-blur-sm hover:bg-paper"
        }`}
      >
        {selected ? "♥" : "♡"}
      </motion.button>
    </span>
  );
}
