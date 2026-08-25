"use client";

import { motion } from "motion/react";
import { LoginForm } from "./login-form";
import { BrandDots } from "../../brand-dots";
import { BackLink } from "../../back-link";

export default function AdminLoginPage() {
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
            Espace photographe
          </p>
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">Connexion</h1>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <LoginForm />
      </motion.div>
    </main>
  );
}
