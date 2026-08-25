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
  // Le binaire WebAssembly de @colorhythm/libraw-wasm (extraction d'aperçu
  // RAW, voir lib/imaging/extract-raw-preview.ts) n'était pas inclus dans
  // le paquet serveur déployé sur Vercel — erreur réelle en production :
  // "ENOENT: no such file or directory, open '.../libraw.[hash].wasm'".
  // Cause connue et documentée par Next.js lui-même
  // (node_modules/next/dist/docs/.../output.md, "Common include patterns
  // for native/runtime assets") : le traçage automatique des fichiers
  // nécessaires par route peut rater un fichier chargé dynamiquement.
  outputFileTracingIncludes: {
    "/*": ["node_modules/@colorhythm/libraw-wasm/**/*"],
  },
  experimental: {
    serverActions: {
      // Défaut 1 Mo — resté élevé même après le passage au dépôt direct
      // navigateur→stockage (voir photos-actions.ts/final-upload-actions.ts,
      // PROJECT_CONTEXT.md §6novovicies) : les Server Actions restantes
      // (remarques photo, formulaires admin) n'envoient plus jamais de
      // fichier volumineux, cette limite n'a donc plus d'effet pratique —
      // pas retirée pour ne rien casser d'inattendu.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
