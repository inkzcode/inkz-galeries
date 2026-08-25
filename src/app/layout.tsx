import type { Metadata } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";
import { MotionProvider } from "./motion-provider";
import "./globals.css";

// Typographie réelle (2026-08-21) — remplace les piles système temporaires
// du Milestone 0. Auto-hébergées par Next, aucune requête externe au
// runtime — voir PROJECT_CONTEXT.md §6bis/6dixies pour le contexte de
// cette décision.
// Geomanist (2026-08-25) remplace Fraunces — retour d'Enzo : "cette
// affreuse typo avec empattement light". Police fournie par Enzo
// (licence perso), chargée en local via next/font/local plutôt que
// next/font/google puisqu'elle n'y est pas distribuée. Seuls les fichiers
// Regular/Regular-Italic étaient fournis (pas de gras) — suffisant pour
// les titres actuels, qui ne s'appuient pas sur un poids gras dédié. Le
// nom de variable `--font-serif-app` vient du scaffold d'origine — gardé
// pour ne pas devoir toucher tous les composants qui utilisent déjà
// `font-serif` pour les titres, même si Geomanist est une sans-serif.
const displayFont = localFont({
  src: [
    { path: "./fonts/geomanist/geomanist-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/geomanist/geomanist-regular-italic.woff2", weight: "400", style: "italic" },
  ],
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
