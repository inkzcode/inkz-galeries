import type { Metadata } from "next";
import { Parkinsans, Plus_Jakarta_Sans } from "next/font/google";
import { MotionProvider } from "./motion-provider";
import "./globals.css";

// Typographie réelle (2026-08-21) — remplace les piles système temporaires
// du Milestone 0. Auto-hébergées par Next, aucune requête externe au
// runtime — voir PROJECT_CONTEXT.md §6bis/6dixies pour le contexte de
// cette décision.
// Parkinsans (2026-08-25) remplace Geomanist — retour d'Enzo : chargée
// via next/font/local (Geomanist n'existe pas sur Google Fonts), seuls
// les fichiers Regular/Regular-Italic reçus n'offraient aucun poids gras.
// Un premier correctif a figé le poids sur 700 (une seule @font-face,
// donc chaque `font-serif` rendait gras sans classe dédiée) — mais ça
// aplatit toute la hiérarchie : le même 700 sur un h1 de page ET un
// numéro d'étape ET une légende, "le titre est trop gras, la hiérarchie
// est très mauvaise" (retour d'Enzo, même jour). Chargée en variable
// complète (300–800) à la place : chaque composant choisit maintenant
// explicitement son poids via les classes Tailwind `font-bold`/
// `font-semibold`/`font-medium` selon son rôle (titre principal, sous-
// titre, texte décoratif) — voir globals.css pour le mapping des poids
// disponibles sur `font-serif`.
const displayFont = Parkinsans({
  weight: "variable",
  subsets: ["latin"],
  variable: "--font-serif-app",
  display: "swap",
});
const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-app",
});

export const metadata: Metadata = {
  title: {
    default: "Inkz — Photographe | Galeries clients privées",
    template: "%s — Inkz",
  },
  description:
    "Enzo (Inkz), photographe. Retrouvez votre galerie privée, sélectionnez vos photos et recevez vos fichiers finaux — sans compte à créer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased">
        {/* Bandeau de marque (retour d'Enzo, 2026-08-27) — présent sur
            TOUTES les pages, pas seulement les pages de garde. */}
        <div aria-hidden className="brand-band h-1 w-full" />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
