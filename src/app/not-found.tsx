"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BrandDots } from "./brand-dots";

// Page 404 personnalisée — jusqu'ici la page générique de Next.js
// (aucune identité de marque, aucun moyen de revenir sans le bouton
// "précédent" du navigateur).
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <BrandDots />
        <p className="font-serif text-6xl font-bold text-ink">404</p>
        <h1 className="font-serif text-2xl font-semibold text-ink">Page introuvable</h1>
        <p className="text-ink-soft">
          Ce lien n&apos;existe pas ou n&apos;existe plus — vérifiez l&apos;adresse
          ou revenez à l&apos;accueil.
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-paper shadow-sm hover:shadow-md"
        >
          Retour à l&apos;accueil
        </Link>
      </motion.div>
    </main>
  );
}
