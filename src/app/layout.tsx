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
// les fichiers Regular/Regular-Italic reçus n'offraient aucun poids gras,
// et les titres (aucun ne pose de classe `font-bold`/`font-semibold`
// dessus, voir grep sur `font-serif` dans les composants) rendaient donc
// toujours en 400 — "encore en light" malgré le changement de police.
// Parkinsans EST sur Google Fonts (variable 300–800) : chargée directement
// via next/font/google, en figeant le poids sur 700 plutôt qu'en laissant
// la variable ouverte, pour que CHAQUE usage de `font-serif` rende gras
// par défaut sans devoir toucher chacun des ~20 titres du site un par un.
// Le nom de variable `--font-serif-app` vient du scaffold d'origine —
// gardé pour ne pas devoir toucher tous les composants qui utilisent déjà
// `font-serif`, même si Parkinsans est une sans-serif géométrique.
const displayFont = Parkinsans({
  weight: "700",
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
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
