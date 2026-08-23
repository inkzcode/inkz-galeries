import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
