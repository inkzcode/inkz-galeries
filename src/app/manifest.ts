import type { MetadataRoute } from "next";

// Manifest PWA (brief §37 : "app-like", nom/splash/icône propres à
// l'ajout sur l'écran d'accueil). Réutilise l'icône déjà en place
// (src/app/icon.png, 512x512) plutôt que d'en générer une nouvelle —
// mêmes couleurs de marque que globals.css (--color-brand-red /
// --color-paper).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inkz — Galeries clients",
    short_name: "Inkz",
    description:
      "Retrouvez votre galerie privée, sélectionnez vos photos et recevez vos fichiers finaux.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b3413e",
    lang: "fr",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
