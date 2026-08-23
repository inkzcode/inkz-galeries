"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { importFinalPhoto } from "@/lib/services/final-delivery-service";
import { getSelectedPhotos } from "@/lib/services/confirm-selection-service";
import { matchFilename } from "@/lib/domain/filename-match";

export type UploadFinalState = { error?: string; success?: boolean } | undefined;

export async function uploadFinalPhotoAction(
  galleryId: string,
  photoId: string,
  _prevState: UploadFinalState,
  formData: FormData,
): Promise<UploadFinalState> {
  await verifySession();

  const file = formData.get("final");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Fichier manquant." };
  }

  const result = await importFinalPhoto(
    galleryId,
    photoId,
    Buffer.from(await file.arrayBuffer()),
    file.type || "image/jpeg",
  );
  if (!result) {
    return { error: "Import impossible." };
  }

  revalidatePath(`/admin/galleries/${galleryId}`);
  return { success: true };
}

export type UploadFinalBatchState = { matched: number; unmatched: string[] } | undefined;

// Import groupé (glisser-déposer de tous les fichiers exportés depuis
// Lightroom d'un coup) — chaque fichier est associé à une photo
// sélectionnée par son nom (voir lib/domain/final-filename-match.ts).
// Les fichiers non reconnus sont listés plutôt que rejetés silencieusement
// — Enzo peut alors les importer à la main (repli conservé sur chaque
// carte de `retouch-workspace.tsx`).
export async function uploadFinalPhotosBatchAction(
  galleryId: string,
  _prevState: UploadFinalBatchState,
  formData: FormData,
): Promise<UploadFinalBatchState> {
  await verifySession();

  const files = formData.getAll("finals").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { matched: 0, unmatched: [] };
  }

  const candidates = await getSelectedPhotos(galleryId);
  const unmatched: string[] = [];
  let matched = 0;

  for (const file of files) {
    const photoId = matchFilename(candidates, file.name);
    const result = photoId
      ? await importFinalPhoto(galleryId, photoId, Buffer.from(await file.arrayBuffer()), file.type || "image/jpeg")
      : null;

    if (result) {
      matched += 1;
    } else {
      unmatched.push(file.name);
    }
  }

  revalidatePath(`/admin/galleries/${galleryId}`);
  return { matched, unmatched };
}
