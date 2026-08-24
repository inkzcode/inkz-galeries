"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { getStorageAdapter } from "@/lib/storage/client";
import { buildPhotoObjectKey } from "@/lib/storage/keys";
import { importFinalPhoto } from "@/lib/services/final-delivery-service";

// Dépôt DIRECT vers le stockage (même raison que photos-actions.ts —
// Vercel plafonne à 4,5 Mo le corps d'une requête, un final HD dépasse
// facilement ça) : le navigateur envoie directement via une URL signée,
// puis une action légère finalise (mise à jour de la base uniquement —
// contrairement à un original, un final n'est jamais retraité, donc pas
// besoin de relire ses octets ici).

function extensionOf(contentType: string): string {
  return contentType.includes("png") ? "png" : "jpg";
}

export type PrepareFinalUploadResult = { uploadUrl: string } | { error: string };

export async function prepareFinalUploadAction(
  galleryId: string,
  photoId: string,
  contentType: string,
): Promise<PrepareFinalUploadResult> {
  await verifySession();

  const key = buildPhotoObjectKey({
    galleryId,
    photoId,
    kind: "final",
    extension: extensionOf(contentType),
  });
  const storage = getStorageAdapter();
  const uploadUrl = await storage.getUploadUrl("previews", key, contentType);

  return { uploadUrl };
}

export type FinalizeFinalImportResult = { success: true } | { error: string };

export async function finalizeFinalImportAction(
  galleryId: string,
  photoId: string,
  contentType: string,
): Promise<FinalizeFinalImportResult> {
  await verifySession();

  const finalKey = buildPhotoObjectKey({
    galleryId,
    photoId,
    kind: "final",
    extension: extensionOf(contentType),
  });

  const result = await importFinalPhoto(galleryId, photoId, finalKey);
  if (!result) {
    return { error: "Import impossible." };
  }

  revalidatePath(`/admin/galleries/${galleryId}`);
  return { success: true };
}
