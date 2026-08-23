import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { MotionProvider } from "./motion-provider";
import "./globals.css";

// Typographie réelle (2026-08-21) — remplace les piles système temporaires
// du Milestone 0. Auto-hébergées par Next (next/font/google télécharge au
// build et sert depuis le domaine du site, aucune requête vers Google
// Fonts au runtime — voir PROJECT_CONTEXT.md §6bis/6dixies pour le
// contexte de cette décision).
// Fraunces (2026-08-22) remplace Bricolage Grotesque — retour d'Enzo :
// "j'aime pas la typo". Serif éditoriale à forte personnalité (souvent
// utilisée par des marques créatives/photo), plus posée que la rondeur
// bubblegum de Bricolage Grotesque. Le nom de variable `--font-serif-app`
// vient du scaffold d'origine — gardé pour ne pas devoir toucher tous les
// composants qui utilisent déjà `font-serif` pour les titres (Fraunces
// EST une vraie serif cette fois, contrairement à Bricolage Grotesque).
const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif-app",
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
