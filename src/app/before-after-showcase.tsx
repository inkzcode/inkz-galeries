"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import type { BeforeAfterPair } from "@/lib/services/before-after-service";

const EASE = [0.2, 0.7, 0.3, 1] as const;
const ROTATE_INTERVAL_MS = 5000;

// Abonnement à prefers-reduced-motion via useSyncExternalStore — le
// pattern recommandé par React pour lire une API navigateur externe qui
// peut changer, plutôt qu'un useEffect + setState (qui déclenche le lint
// react-hooks/set-state-in-effect pour un rendu en cascade évitable).
function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

// Vitrine avant/après publique (retour d'Enzo, 2026-08-29 : "juste quand
// on passe la souris ça révèle le avant après [...] les photos changent
// toutes les 5 secondes pour pas qu'il y en ait qu'une seule"). Technique
// retenue : fondu enchaîné, pas un curseur à glisser — Enzo a explicitement
// écarté le glisser-déposer ("pas besoin de cliquer dessus"), et un
// wipe/clip-path évoquerait visuellement une poignée qu'on peut faire
// glisser, ce qui n'est pas le cas ici. Premier composant du site à
// utiliser un `setInterval` pour faire tourner du contenu visuel (les deux
// seuls autres existants sont du polling `router.refresh()`, pas de la
// rotation) — vérifie donc `prefers-reduced-motion` manuellement, rien à
// réutiliser tel quel.
export function BeforeAfterShowcase({ examples }: { examples: BeforeAfterPair[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    if (examples.length <= 1 || paused || reducedMotion) return;
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % examples.length);
      setRevealed(false);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [examples.length, paused, reducedMotion]);

  if (examples.length === 0) return null;

  const current = examples[index];

  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-md bg-surface select-none sm:max-w-sm"
      onMouseEnter={() => {
        setPaused(true);
        setRevealed(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
        setRevealed(false);
      }}
      onTouchStart={() => {
        setPaused(true);
        setRevealed((value) => !value);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
      <img src={current.beforeUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <motion.img
        src={current.afterUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.4, ease: EASE }}
      />
      <span className="absolute top-3 left-3 rounded-full bg-ink/70 px-3 py-1 text-xs tracking-wide text-paper uppercase backdrop-blur-sm">
        {revealed ? "Après" : "Avant"}
      </span>
      {current.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-4 pt-8 pb-3">
          <p className="text-sm text-paper/90">{current.caption}</p>
        </div>
      )}
    </div>
  );
}
