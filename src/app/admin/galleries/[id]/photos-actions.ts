"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { importPhoto } from "@/lib/services/import-photo";
import { matchFilename } from "@/lib/domain/filename-match";

export type UploadPhotoState = { error?: string } | undefined;

export async function uploadPhotoAction(
  galleryId: string,
  _prevState: UploadPhotoState,
  formData: FormData,
): Promise<UploadPhotoState> {
  await verifySession();

  const originalFile = formData.get("original");
  const previewSourceFile = formData.get("previewSource");

  if (!(originalFile instanceof File) || originalFile.size === 0) {
    return { error: "Fichier original manquant." };
  }
  if (!(previewSourceFile instanceof File) || previewSourceFile.size === 0) {
    return { error: "Aperçu JPEG manquant." };
  }

  const extension = originalFile.name.split(".").pop() || "raw";

  try {
    await importPhoto({
      galleryId,
      filename: originalFile.name,
      originalBuffer: Buffer.from(await originalFile.arrayBuffer()),
      originalExtension: extension,
      originalContentType: originalFile.type || "application/octet-stream",
      previewSourceBuffer: Buffer.from(await previewSourceFile.arrayBuffer()),
    });
  } catch (error) {
    console.error("Échec de l'import photo :", error);
    return { error: "L'import a échoué. Réessayer, ou vérifier la configuration du stockage." };
  }

  revalidatePath(`/admin/galleries/${galleryId}`);
  return undefined;
}

// Formats que le navigateur (et sharp) peuvent afficher/traiter tels
// quels — pas besoin d'un aperçu JPEG exporté séparément pour ceux-là,
// contrairement à un RAW (brief : aucun décodage RAW côté serveur).
const DISPLAYABLE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

export type UploadPhotosBatchState = { imported: number; unmatched: string[] } | undefined;

// Import groupé (glisser-déposer de tout un shooting d'un coup) — retour
// d'Enzo, 2026-08-22 : "le moment où je dois importer mes photos n'est
// pas logique et trop difficile à comprendre". L'ancien formulaire
// demandait systématiquement DEUX fichiers par photo (original + aperçu
// JPEG), un par un, sans expliquer pourquoi. Ici : les fichiers déjà
// affichables (JPEG/PNG) servent directement d'aperçu, sans rien demander
// de plus ; seuls les RAW ont besoin d'un aperçu à associer, retrouvé
// automatiquement par nom de fichier (voir lib/domain/filename-match.ts,
// même logique que l'import groupé des finaux retouchés).
export async function uploadPhotosBatchAction(
  galleryId: string,
  _prevState: UploadPhotosBatchState,
  formData: FormData,
): Promise<UploadPhotosBatchState> {
  await verifySession();

  const originals = formData.getAll("originals").filter((f): f is File => f instanceof File && f.size > 0);
  const previews = formData.getAll("previews").filter((f): f is File => f instanceof File && f.size > 0);

  if (originals.length === 0) {
    return { imported: 0, unmatched: [] };
  }

  const previewCandidates = previews.map((file) => ({ id: file.name, filename: file.name }));
  const unmatched: string[] = [];
  let imported = 0;

  for (const original of originals) {
    const extension = extensionOf(original.name) || "raw";
    const originalBuffer = Buffer.from(await original.arrayBuffer());
    let previewSourceBuffer: Buffer;

    if (DISPLAYABLE_EXTENSIONS.has(extension)) {
      previewSourceBuffer = originalBuffer;
    } else {
      const matchedName = matchFilename(previewCandidates, original.name);
      const matchedFile = matchedName ? previews.find((file) => file.name === matchedName) : undefined;
      if (!matchedFile) {
        unmatched.push(original.name);
        continue;
      }
      previewSourceBuffer = Buffer.from(await matchedFile.arrayBuffer());
    }

    try {
      await importPhoto({
        galleryId,
        filename: original.name,
        originalBuffer,
        originalExtension: extension,
        originalContentType: original.type || "application/octet-stream",
        previewSourceBuffer,
      });
      imported += 1;
    } catch (error) {
      console.error("Échec de l'import photo (lot) :", error);
      unmatched.push(original.name);
    }
  }

  revalidatePath(`/admin/galleries/${galleryId}`);
  return { imported, unmatched };
}
