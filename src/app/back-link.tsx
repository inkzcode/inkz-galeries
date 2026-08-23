"use client";

import Link from "next/link";
import { motion } from "motion/react";

// Lien de retour réutilisable (dashboard admin, nouveau shooting,
// connexion, accès galerie) — retour d'Enzo, 2026-08-22 : "ça manque de
// raccourcis pour retourner dans les pages précédentes".
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <motion.div className="inline-block" whileHover={{ x: -3 }}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {label}
      </Link>
    </motion.div>
  );
}
