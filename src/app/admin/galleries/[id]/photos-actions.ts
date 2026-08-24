"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { getStorageAdapter } from "@/lib/storage/client";
import { buildPhotoObjectKey } from "@/lib/storage/keys";
import { importPhoto } from "@/lib/services/import-photo";

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
  const storage = getStorageAdapter();
  const originalKey = buildPhotoObjectKey({ galleryId, photoId, kind: "original", extension });
  const previewSourceKey = hasPreviewSource
    ? buildPhotoObjectKey({ galleryId, photoId, kind: "preview-source", extension: "jpg" })
    : null;

  let previewSourceBuffer: Buffer;
  try {
    previewSourceBuffer = await storage.getObjectBuffer(
      "originals",
      previewSourceKey ?? originalKey,
    );
  } catch (error) {
    console.error("Échec de lecture du fichier envoyé :", error);
    return { error: "Le fichier envoyé est introuvable — réessayer l'import." };
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
