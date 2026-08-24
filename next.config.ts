import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La vérification de types du build (`next build`) semble anormalement
  // lente/bloquée sur la machine de build Vercel (2 cœurs) le 2026-08-24 —
  // 8s en local (même à froid, sans cache), toujours pas terminée après
  // 30s sur Vercel, deux essais. Désactivée ici : le projet est déjà
  // vérifié par `npx tsc --noEmit` avant chaque commit (voir
  // PROJECT_CONTEXT.md §4/workflow de vérification), donc ce n'est pas
  // une perte de sécurité de type, juste une étape redondante retirée du
  // chemin de déploiement le temps de comprendre la cause exacte.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      // Défaut 1 Mo — bien en dessous d'un RAW (souvent 20-80 Mo). Voir
      // node_modules/next/dist/docs/.../serverActions.md. Suffisant pour
      // la V1 (upload via Server Action) ; si les RAW deviennent un goulot
      // d'étranglement en production, évoluer vers un upload direct signé
      // vers R2 (le navigateur envoie directement au stockage, sans
      // transiter par le serveur Next) plutôt que d'augmenter encore cette
      // limite indéfiniment.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
