"use client";

import { motion } from "motion/react";
import { BrandDots } from "../brand-dots";
import { PinForm } from "./pin-form";
import { BackLink } from "../back-link";

export default function GalleryAccess() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-6 py-24">
      <BackLink href="/" label="Retour à l'accueil" />
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="flex items-center gap-2">
          <BrandDots size={10} />
          <p className="text-sm tracking-wide text-muted uppercase">
            Accès galerie
          </p>
        </div>
        <h1 className="font-serif text-3xl text-ink">Retrouvez votre galerie</h1>
        <p className="text-ink-soft">
          Saisissez le code d&apos;accès transmis par votre photographe —
          aucun compte à créer.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <PinForm />
      </motion.div>

      <motion.p
        className="text-sm text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        Vous ne retrouvez pas votre code ? Contactez directement votre
        photographe.
      </motion.p>
    </main>
  );
}
