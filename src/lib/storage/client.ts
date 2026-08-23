import "server-only";
import { createLocalStorageAdapter } from "./local-adapter";
import { createR2StorageAdapter } from "./r2-adapter";
import type { StorageAdapter } from "./types";

// Sélection automatique de l'implémentation : R2 si les variables
// d'environnement sont renseignées, sinon un stockage local de dev
// (voir local-adapter.ts) — permet de développer/tester tout le pipeline
// (import → preview → watermark → galerie) sans compte cloud, cohérent
// avec l'objectif de coût quasi nul (PROJECT_CONTEXT.md §12).
let cached: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;

  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_ORIGINALS,
    R2_BUCKET_PREVIEWS,
  } = process.env;

  const hasFullR2Config =
    R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_ORIGINALS && R2_BUCKET_PREVIEWS;

  if (hasFullR2Config) {
    cached = createR2StorageAdapter({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucketOriginals: R2_BUCKET_ORIGINALS,
      bucketPreviews: R2_BUCKET_PREVIEWS,
    });
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Stockage R2 non configuré (variables R2_* manquantes) — obligatoire en production, voir .env.example.",
    );
  }

  console.warn(
    "[storage] Variables R2_* absentes : utilisation du stockage local de développement " +
      "(.local-storage/ et public/dev-previews/, jamais en production).",
  );
  cached = createLocalStorageAdapter();
  return cached;
}
