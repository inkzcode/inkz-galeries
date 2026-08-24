import { matchFilename } from "@/lib/domain/filename-match";
import { putDirect, runWithConcurrency } from "./direct-upload-helpers";
import { prepareFinalUploadAction, finalizeFinalImportAction } from "./final-upload-actions";

// Orchestration client du dépôt direct d'un fichier final retouché (voir
// final-upload-actions.ts) — utilisée par le formulaire groupé
// (retouch-workspace.tsx) ET le formulaire manuel (final-upload-form.tsx).

async function uploadOneFinal(galleryId: string, photoId: string, file: File): Promise<boolean> {
  try {
    const contentType = file.type || "image/jpeg";
    const prepared = await prepareFinalUploadAction(galleryId, photoId, contentType);
    if ("error" in prepared) return false;

    await putDirect(prepared.uploadUrl, file, contentType);

    const result = await finalizeFinalImportAction(galleryId, photoId, contentType);
    return !("error" in result);
  } catch {
    return false;
  }
}

export async function uploadFinalDirectly(
  galleryId: string,
  photoId: string,
  file: File,
): Promise<boolean> {
  return uploadOneFinal(galleryId, photoId, file);
}

// Import groupé : chaque fichier déposé est associé à une photo
// sélectionnée par son nom (voir lib/domain/filename-match.ts).
export async function uploadFinalsDirectlyBatch(
  galleryId: string,
  candidates: { id: string; filename: string }[],
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<{ matched: number; unmatched: string[] }> {
  let matched = 0;
  let done = 0;
  const unmatched: string[] = [];

  await runWithConcurrency(files, 3, async (file) => {
    const photoId = matchFilename(candidates, file.name);
    const ok = photoId ? await uploadOneFinal(galleryId, photoId, file) : false;
    if (ok) matched += 1;
    else unmatched.push(file.name);
    done += 1;
    onProgress(done, files.length);
  });

  return { matched, unmatched };
}
