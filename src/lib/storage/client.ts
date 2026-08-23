import "server-only";
import { createLocalStorageAdapter } from "./local-adapter";
import { createS3StorageAdapter } from "./s3-adapter";
import type { StorageAdapter } from "./types";

// Sélection automatique de l'implémentation : stockage objet compatible S3
// (Backblaze B2, Cloudflare R2, ...) si les variables d'environnement sont
// renseignées, sinon un stockage local de dev (voir local-adapter.ts) —
// permet de développer/tester tout le pipeline (import → preview →
// watermark → galerie) sans compte cloud, cohérent avec l'objectif de coût
// quasi nul (PROJECT_CONTEXT.md §12). Générique depuis le 2026-08-23 (voir
// s3-adapter.ts) : n'importe quel fournisseur compatible S3 fonctionne, pas
// seulement R2.
let cached: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;

  const {
    STORAGE_ENDPOINT,
    STORAGE_REGION,
    STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY,
    STORAGE_BUCKET_ORIGINALS,
    STORAGE_BUCKET_PREVIEWS,
  } = process.env;

  const hasFullStorageConfig =
    STORAGE_ENDPOINT &&
    STORAGE_REGION &&
    STORAGE_ACCESS_KEY_ID &&
    STORAGE_SECRET_ACCESS_KEY &&
    STORAGE_BUCKET_ORIGINALS &&
    STORAGE_BUCKET_PREVIEWS;

  if (hasFullStorageConfig) {
    cached = createS3StorageAdapter({
      endpoint: STORAGE_ENDPOINT,
      region: STORAGE_REGION,
      accessKeyId: STORAGE_ACCESS_KEY_ID,
      secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
      bucketOriginals: STORAGE_BUCKET_ORIGINALS,
      bucketPreviews: STORAGE_BUCKET_PREVIEWS,
    });
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Stockage objet non configuré (variables STORAGE_* manquantes) — obligatoire en production, voir .env.example.",
    );
  }

  console.warn(
    "[storage] Variables STORAGE_* absentes : utilisation du stockage local de développement " +
      "(.local-storage/ et public/dev-previews/, jamais en production).",
  );
  cached = createLocalStorageAdapter();
  return cached;
}
