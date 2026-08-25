import { matchFilename } from "@/lib/domain/filename-match";
import { putDirect, runWithConcurrency } from "./direct-upload-helpers";
import {
  prepareOriginalUploadAction,
  preparePreviewSourceUploadAction,
  finalizeOriginalImportAction,
} from "./photos-actions";

// Orchestration client du dépôt direct (voir photos-actions.ts pour le
// pourquoi) — utilisée par le formulaire groupé ET le formulaire manuel
// (single-photo-upload-form.tsx), même chemin pour les deux : plus de
// duplication entre "un fichier" et "plusieurs fichiers".

const DISPLAYABLE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

export type UploadFailure = { filename: string; reason: string };

async function uploadOnePhoto(
  galleryId: string,
  original: File,
  previewCandidates: File[],
): Promise<{ ok: true } | { ok: false; filename: string; reason: string }> {
  const extension = extensionOf(original.name) || "raw";
  const isDisplayable = DISPLAYABLE_EXTENSIONS.has(extension);

  // Pour un RAW, un aperçu JPEG déposé manuellement (matché par nom de
  // fichier) est prioritaire s'il existe, mais optionnel : à défaut, le
  // serveur tente d'extraire l'aperçu intégré au RAW lui-même (retour
  // d'Enzo, 2026-08-25 — voir finalizeOriginalImportAction).
  let matchedPreview: File | undefined;
  if (!isDisplayable) {
    const matchedName = matchFilename(
      previewCandidates.map((file) => ({ id: file.name, filename: file.name })),
      original.name,
    );
    matchedPreview = matchedName
      ? previewCandidates.find((file) => file.name === matchedName)
      : undefined;
  }

  try {
    const originalContentType = original.type || "application/octet-stream";
    const prepared = await prepareOriginalUploadAction(galleryId, original.name, originalContentType);
    if ("error" in prepared) return { ok: false, filename: original.name, reason: prepared.error };

    await putDirect(prepared.uploadUrl, original, originalContentType);

    if (matchedPreview) {
      const previewPrepared = await preparePreviewSourceUploadAction(galleryId, prepared.photoId);
      if ("error" in previewPrepared) {
        return { ok: false, filename: original.name, reason: previewPrepared.error };
      }
      // Toujours "image/jpeg" — même valeur que celle utilisée pour
      // signer l'URL côté serveur (voir preparePreviewSourceUploadAction),
      // jamais le type MIME rapporté par le navigateur pour ce fichier.
      await putDirect(previewPrepared.uploadUrl, matchedPreview, "image/jpeg");
    }

    const result = await finalizeOriginalImportAction(
      galleryId,
      prepared.photoId,
      original.name,
      Boolean(matchedPreview),
    );
    if ("error" in result) return { ok: false, filename: original.name, reason: result.error };
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Erreur inconnue.";
    return { ok: false, filename: original.name, reason };
  }
}

export async function uploadPhotosDirectly(
  galleryId: string,
  originals: File[],
  previews: File[],
  onProgress: (done: number, total: number) => void,
): Promise<{ imported: number; unmatched: UploadFailure[] }> {
  let imported = 0;
  let done = 0;
  const unmatched: UploadFailure[] = [];

  await runWithConcurrency(originals, 3, async (file) => {
    const result = await uploadOnePhoto(galleryId, file, previews);
    if (result.ok) imported += 1;
    else unmatched.push({ filename: result.filename, reason: result.reason });
    done += 1;
    onProgress(done, originals.length);
  });

  return { imported, unmatched };
}
