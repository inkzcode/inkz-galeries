import { matchFilename } from "@/lib/domain/filename-match";
import { putDirect, runWithConcurrency } from "@/lib/upload/direct-upload";
import { prepareFinalUploadAction, finalizeFinalImportAction } from "./final-upload-actions";

// Orchestration client du dépôt direct d'un fichier final retouché (voir
// final-upload-actions.ts) — utilisée par le formulaire groupé
// (retouch-workspace.tsx) ET le formulaire manuel (final-upload-form.tsx).

export type UploadFailure = { filename: string; reason: string };

async function uploadOneFinal(
  galleryId: string,
  photoId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const contentType = file.type || "image/jpeg";
    const prepared = await prepareFinalUploadAction(galleryId, photoId, contentType);
    if ("error" in prepared) return { ok: false, reason: prepared.error };

    await putDirect(prepared.uploadUrl, file, contentType);

    const result = await finalizeFinalImportAction(galleryId, photoId, contentType);
    if ("error" in result) return { ok: false, reason: result.error };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Erreur inconnue." };
  }
}

export async function uploadFinalDirectly(
  galleryId: string,
  photoId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return uploadOneFinal(galleryId, photoId, file);
}

// Import groupé : chaque fichier déposé est associé à une photo
// sélectionnée par son nom (voir lib/domain/filename-match.ts).
export async function uploadFinalsDirectlyBatch(
  galleryId: string,
  candidates: { id: string; filename: string }[],
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<{ matched: number; unmatched: UploadFailure[] }> {
  let matched = 0;
  let done = 0;
  const unmatched: UploadFailure[] = [];

  await runWithConcurrency(files, 3, async (file) => {
    const photoId = matchFilename(candidates, file.name);
    if (!photoId) {
      unmatched.push({ filename: file.name, reason: "Aucune photo sélectionnée ne correspond." });
      done += 1;
      onProgress(done, files.length);
      return;
    }
    const result = await uploadOneFinal(galleryId, photoId, file);
    if (result.ok) matched += 1;
    else unmatched.push({ filename: file.name, reason: result.reason });
    done += 1;
    onProgress(done, files.length);
  });

  return { matched, unmatched };
}
