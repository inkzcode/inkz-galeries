"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { getStorageAdapter } from "@/lib/storage/client";
import { buildPhotoObjectKey } from "@/lib/storage/keys";
import { importPhoto } from "@/lib/services/import-photo";
import { extractEmbeddedRawPreview } from "@/lib/imaging/extract-raw-preview";

const DISPLAYABLE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

// Import de photos originales en dépôt DIRECT vers le stockage (retour
// d'Enzo, 2026-08-24 : import d'un shooting de 119 photos en échec sur
// Vercel — voir PROJECT_CONTEXT.md §6novovicies). Vercel plafonne à
// 4,5 Mo le corps d'une requête vers une fonction serveur ; un RAW
// dépasse souvent ça à lui seul, et un lot de plusieurs photos toujours.
// Plus aucun octet de fichier ne transite par le serveur Next à l'envoi :
// le navigateur envoie directement au stockage via une URL signée
// (prepare*UploadAction), puis une action légère (finalize*ImportAction)
// va chercher les octets déjà déposés pour finir le traitement (aperçu +
// watermark), avec un payload de quelques octets seulement.

function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Import du 2026-08-25 (119 RAW) : ~10% ont échoué avec "fichier
// introuvable" juste après un dépôt direct pourtant réussi (PUT signé
// confirmé 200 côté navigateur) — cohérent avec un court délai de
// cohérence lecture-après-écriture chez Backblaze sous forte charge
// concurrente, pas une vraie perte de fichier. Quelques nouvelles
// tentatives espacées suffisent dans la plupart des cas, avant d'obliger
// Enzo à relancer l'import pour ces photos.
async function getObjectBufferWithRetry(
  storage: ReturnType<typeof getStorageAdapter>,
  bucket: Parameters<ReturnType<typeof getStorageAdapter>["getObjectBuffer"]>[0],
  key: string,
): Promise<Buffer> {
  const delaysMs = [300, 800, 1500];
  let lastError: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt += 1) {
    try {
      return await storage.getObjectBuffer(bucket, key);
    } catch (error) {
      lastError = error;
      if (attempt < delaysMs.length) await wait(delaysMs[attempt]);
    }
  }
  throw lastError;
}

export type PrepareUploadResult = { photoId: string; uploadUrl: string } | { error: string };

export async function prepareOriginalUploadAction(
  galleryId: string,
  filename: string,
  contentType: string,
): Promise<PrepareUploadResult> {
  await verifySession();

  const photoId = randomUUID();
  const extension = extensionOf(filename) || "raw";
  const key = buildPhotoObjectKey({ galleryId, photoId, kind: "original", extension });

  const storage = getStorageAdapter();
  const uploadUrl = await storage.getUploadUrl(
    "originals",
    key,
    contentType || "application/octet-stream",
  );

  return { photoId, uploadUrl };
}

export type PreparePreviewSourceResult = { uploadUrl: string } | { error: string };

// Pour un RAW : l'aperçu JPEG exporté par Enzo est lui aussi envoyé
// directement (même raison — peut dépasser 4,5 Mo), à une clé temporaire
// dans le bucket "originals" (jamais référencée dans un Photo, supprimée
// juste après avoir servi à générer le vrai aperçu — voir
// finalizeOriginalImportAction).
export async function preparePreviewSourceUploadAction(
  galleryId: string,
  photoId: string,
): Promise<PreparePreviewSourceResult> {
  await verifySession();

  const key = buildPhotoObjectKey({ galleryId, photoId, kind: "preview-source", extension: "jpg" });
  const storage = getStorageAdapter();
  const uploadUrl = await storage.getUploadUrl("originals", key, "image/jpeg");

  return { uploadUrl };
}

export type FinalizeImportResult = { success: true } | { error: string };

export async function finalizeOriginalImportAction(
  galleryId: string,
  photoId: string,
  filename: string,
  hasPreviewSource: boolean,
): Promise<FinalizeImportResult> {
  await verifySession();

  const extension = extensionOf(filename) || "raw";
  const isDisplayable = DISPLAYABLE_EXTENSIONS.has(extension);
  const storage = getStorageAdapter();
  const originalKey = buildPhotoObjectKey({ galleryId, photoId, kind: "original", extension });
  const previewSourceKey = hasPreviewSource
    ? buildPhotoObjectKey({ galleryId, photoId, kind: "preview-source", extension: "jpg" })
    : null;

  let previewSourceBuffer: Buffer;
  if (previewSourceKey) {
    // Aperçu JPEG fourni manuellement (retour d'Enzo) — prioritaire sur
    // l'extraction automatique, utile si celle-ci donne un mauvais résultat.
    try {
      previewSourceBuffer = await getObjectBufferWithRetry(storage, "originals", previewSourceKey);
    } catch (error) {
      console.error("Échec de lecture du fichier envoyé :", error);
      return { error: "Le fichier envoyé est introuvable — réessayer l'import." };
    }
  } else if (isDisplayable) {
    try {
      previewSourceBuffer = await getObjectBufferWithRetry(storage, "originals", originalKey);
    } catch (error) {
      console.error("Échec de lecture du fichier envoyé :", error);
      return { error: "Le fichier envoyé est introuvable — réessayer l'import." };
    }
  } else {
    // RAW sans aperçu fourni : extraction automatique de l'aperçu JPEG
    // intégré par l'appareil photo (retour d'Enzo, 2026-08-25 : "je veux
    // pas avoir à le faire [...] avant [la retouche] ça doit être en RAW").
    let rawBuffer: Buffer;
    try {
      rawBuffer = await getObjectBufferWithRetry(storage, "originals", originalKey);
    } catch (error) {
      console.error("Échec de lecture du fichier envoyé :", error);
      return { error: "Le fichier envoyé est introuvable — réessayer l'import." };
    }
    const extracted = await extractEmbeddedRawPreview(rawBuffer);
    if (!extracted) {
      return {
        error:
          "Aucun aperçu intégré trouvé dans ce RAW — fournissez un aperçu JPEG manuellement (zone dédiée).",
      };
    }
    previewSourceBuffer = extracted;
  }

  try {
    await importPhoto({ galleryId, photoId, filename, originalKey, previewSourceBuffer });
  } catch (error) {
    console.error("Échec de la finalisation de l'import :", error);
    return { error: "L'import a échoué." };
  }

  if (previewSourceKey) {
    await storage.deleteObject("originals", previewSourceKey).catch(() => {
      // Best-effort : un aperçu source non nettoyé n'est jamais exposé
      // (bucket "originals", jamais référencé dans un Photo) — pas grave.
    });
  }

  revalidatePath(`/admin/galleries/${galleryId}`);
  return { success: true };
}
