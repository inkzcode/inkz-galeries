"use client";

import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "motion/react";
import { HeroMosaic } from "./hero-mosaic";

const headline = "Un espace pour découvrir, choisir et recevoir vos photographies.";

const EASE_STANDARD = [0.2, 0.7, 0.3, 1] as const;

const headlineContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const wordVariant: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_STANDARD } },
};

const steps = [
  {
    title: "Choisissez vos photos",
    text: "Une galerie privée, accessible avec un code — parcourez, mettez en favori, sans créer de compte.",
  },
  {
    title: "Je m'occupe de la retouche",
    text: "Votre sélection reçue, place à la post-production — dans mes logiciels habituels, avec soin.",
  },
  {
    title: "Recevez vos photos",
    text: "Fichiers finaux en haute définition, sans filigrane, prêts à télécharger dès qu'ils sont prêts.",
  },
];

// Bloc hero + "comment ça marche" — extrait de page.tsx (2026-08-25) pour
// que la page d'accueil elle-même puisse devenir un Server Component
// (voir page.tsx) et aller chercher le portfolio public côté serveur,
// sans convertir tout ce contenu animé (motion exige "use client").
export function HomeIntro() {
  return (
    <>
      {/* Taches de couleur animées en fond (retour d'Enzo, 2026-08-27 :
          "si il y avait 1 tache rouge et une tache or ok mais les deux
          ensemble sont pas beau") — chaque tache reste une SEULE couleur
          plate (jamais de dégradé rouge/or mélangé dans une même forme,
          essayé puis rejeté), mais amplifiée en taille/opacité par
          rapport à la toute première version. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-accent opacity-40 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/4 -left-52 h-[28rem] w-[28rem] rounded-full bg-accent-soft opacity-60 blur-3xl"
        animate={{ x: [0, 35, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-24 sm:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="order-2 flex flex-col gap-8 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src="/brand/inkz-logo.png"
                alt="Inkz Projects"
                width={1456}
                height={644}
                priority
                className="h-10 w-auto sm:h-12"
              />
            </motion.div>

            <motion.h1
              className="font-serif text-4xl leading-tight font-bold text-ink sm:text-5xl"
              variants={headlineContainer}
              initial="hidden"
              animate="show"
            >
              {headline.split(" ").map((word, i) => (
                <Fragment key={i}>
                  <motion.span variants={wordVariant} className="inline-block">
                    {word}
                  </motion.span>
                  {" "}
                </Fragment>
              ))}
            </motion.h1>

            <motion.p
              className="max-w-xl text-lg leading-relaxed text-ink-soft"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Chaque séance donne lieu à une galerie privée, accessible avec un
              code, dans laquelle vous pouvez parcourir vos photographies,
              faire votre sélection et suivre l&apos;avancement de la
              retouche.
            </motion.p>

            <motion.div
              className="flex flex-col gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
            >
              <motion.div whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/g"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-paper shadow-[0_8px_24px_-8px_rgba(179,65,62,0.55)] transition-shadow hover:shadow-[0_12px_32px_-6px_rgba(179,65,62,0.65)]"
                >
                  Accéder à ma galerie
                  <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </motion.svg>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  Espace photographe
                </Link>
              </motion.div>
            </motion.div>
          </div>

          <div className="order-1 lg:order-2">
            <HeroMosaic />
          </div>
        </div>
      </section>

      <section className="relative bg-surface px-6 py-20 sm:px-10">
        <div aria-hidden className="brand-band absolute top-0 h-[3px] w-full opacity-70" />
        <div className="mx-auto max-w-5xl">
          <motion.p
            className="text-sm tracking-wide text-muted uppercase"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            Comment ça marche
          </motion.p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                className="rounded-lg border border-border bg-paper p-6"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ y: -6, boxShadow: "0 12px 24px -8px rgba(20,20,20,0.15)" }}
              >
                <span className="font-serif text-3xl font-bold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-serif text-lg font-semibold text-ink">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
