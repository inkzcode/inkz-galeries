"use client";

import { AnimatePresence, motion } from "motion/react";

// Anime un petit signal qui "s'envole" vers le photographe (retour
// d'Enzo, 2026-08-25 : "quand on enregistre mes remarques je veux une
// animation comme quoi la remarque s'en va vers moi le photographe —
// pareil pour confirmer ma sélection"). Purement décoratif — se rejoue
// à chaque fois que `triggerKey` change (l'appelant incrémente un
// compteur à chaque envoi réussi ; `key={triggerKey}` fait remonter un
// nouvel élément dans AnimatePresence, donc l'animation d'entrée se
// rejoue sans logique de show/hide côté appelant). Le parent doit être
// `position: relative`.
export function SendBurst({ triggerKey }: { triggerKey: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <AnimatePresence>
        {triggerKey > 0 && (
          <motion.span
            key={triggerKey}
            aria-hidden
            className="absolute top-1/2 left-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs text-paper shadow-md"
            initial={{ x: "-50%", y: "-50%", opacity: 1, scale: 0.85 }}
            animate={{ x: "160%", y: "-260%", opacity: 0, scale: 0.4, rotate: 20 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.7, 0.3, 1] }}
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
