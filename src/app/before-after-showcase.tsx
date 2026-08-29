"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
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
// toutes les 5 secondes" — puis, le même jour : "rajoute un max
// d'animation comme tu sais bien faire"). Technique retenue : fondu
// enchaîné, pas un curseur à glisser — Enzo a explicitement écarté le
// glisser-déposer, et un wipe/clip-path évoquerait visuellement une
// poignée qu'on peut faire glisser, ce qui n'est pas le cas ici.
//
// Petit "aperçu" automatique au premier montage (bref passage à "après"
// puis retour) — un visiteur qui ne pense pas spontanément à survoler
// comprend quand même le principe dès l'arrivée sur la page, sans
// attendre une interaction. Ne se joue qu'une fois, jamais pendant la
// rotation automatique (qui, elle, repart toujours sur "avant").
export function BeforeAfterShowcase({ examples }: { examples: BeforeAfterPair[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  // Aperçu automatique une seule fois, au montage.
  useEffect(() => {
    if (reducedMotion) return;
    const peekIn = setTimeout(() => setRevealed(true), 900);
    const peekOut = setTimeout(() => setRevealed(false), 1700);
    return () => {
      clearTimeout(peekIn);
      clearTimeout(peekOut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois au montage, volontairement
  }, []);

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
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mx-auto w-full max-w-md sm:max-w-sm"
    >
      <motion.div
        whileHover={reducedMotion ? undefined : { scale: 1.02, y: -6 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-surface shadow-sm select-none"
        onMouseEnter={() => {
          setPaused(true);
          setRevealed(true);
          setHasInteracted(true);
        }}
        onMouseLeave={() => {
          setPaused(false);
          setRevealed(false);
        }}
        onTouchStart={() => {
          setPaused(true);
          setHasInteracted(true);
          setRevealed((value) => !value);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, ease: EASE }}
            className="absolute inset-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
            <img src={current.beforeUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <motion.img
              src={current.afterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={false}
              animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 1.03 }}
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: EASE }}
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute top-3 left-3 overflow-hidden rounded-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={revealed ? "after" : "before"}
              initial={{ y: reducedMotion ? 0 : 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: reducedMotion ? 0 : -16, opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.25, ease: EASE }}
              className="block bg-ink/70 px-3 py-1 text-xs tracking-wide text-paper uppercase backdrop-blur-sm"
            >
              {revealed ? "Après" : "Avant"}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Invite discrète à interagir, disparaît dès le premier survol/tap. */}
        <AnimatePresence>
          {!hasInteracted && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.6, times: [0, 0.25, 0.75, 1], delay: 2.2, ease: EASE }}
              className="absolute right-3 bottom-3 rounded-full border border-paper/40 bg-ink/50 px-3 py-1 text-[11px] tracking-wide text-paper/90 backdrop-blur-sm"
            >
              Survolez pour révéler
            </motion.span>
          )}
        </AnimatePresence>

        {current.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-4 pt-8 pb-3">
            <p className="text-sm text-paper/90">{current.caption}</p>
          </div>
        )}
      </motion.div>

      {examples.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {examples.map((example, exampleIndex) => (
            <motion.span
              key={example.id}
              aria-hidden
              animate={{
                width: exampleIndex === index ? 20 : 6,
                backgroundColor: exampleIndex === index ? "var(--color-accent)" : "var(--color-border)",
              }}
              transition={{ duration: 0.3, ease: EASE }}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
