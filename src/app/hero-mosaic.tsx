"use client";

import { motion } from "motion/react";

const EASE = [0.2, 0.7, 0.3, 1] as const;

// Emplacements du collage — chacun accepte un `src` optionnel. Sans photo
// (aujourd'hui), le dégradé de marque + grain sert de repère visuel qui
// tient debout tout seul. Dès qu'Enzo envoie ses vraies photos de
// portfolio, il suffit de renseigner `src`/`alt` ici pour les faire
// apparaître dans ces mêmes emplacements — aucune autre modification
// nécessaire.
type MosaicSlot = {
  src?: string;
  alt?: string;
  gradient: string;
  className: string;
  rotate: number;
  delay: number;
};

const slots: MosaicSlot[] = [
  {
    gradient:
      "linear-gradient(135deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 55%, black) 100%)",
    className: "left-0 top-0 h-[62%] w-[68%]",
    rotate: -4,
    delay: 0,
  },
  {
    gradient:
      "linear-gradient(150deg, var(--color-brand-gold) 0%, color-mix(in srgb, var(--color-brand-gold) 55%, white) 100%)",
    className: "bottom-0 right-0 h-[52%] w-[52%]",
    rotate: 5,
    delay: 0.12,
  },
  {
    gradient:
      "linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 35%, var(--color-ink)) 0%, var(--color-accent) 100%)",
    className: "right-[2%] top-[4%] h-[34%] w-[32%]",
    rotate: -6,
    delay: 0.24,
  },
];

export function HeroMosaic() {
  return (
    <div className="relative h-[340px] w-full sm:h-[420px] lg:h-[460px]">
      {slots.map((slot, i) => (
        <motion.div
          key={i}
          className={`absolute overflow-hidden rounded-2xl shadow-lg ${slot.className}`}
          initial={{ opacity: 0, y: 28, rotate: slot.rotate + 8 }}
          animate={{
            opacity: 1,
            y: [0, -8, 0],
            rotate: slot.rotate,
          }}
          transition={{
            opacity: { duration: 0.6, delay: slot.delay, ease: EASE },
            rotate: { duration: 0.6, delay: slot.delay, ease: EASE },
            y: {
              duration: 5 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: slot.delay + 0.6,
            },
          }}
          whileHover={{ rotate: 0, scale: 1.04, zIndex: 10 }}
        >
          {slot.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- collage libre, pas de dimensions fixes exploitables par next/image ici.
            <img
              src={slot.src}
              alt={slot.alt ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `${slot.gradient}, radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)`,
                backgroundSize: "auto, 5px 5px",
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
