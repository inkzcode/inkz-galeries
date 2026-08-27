import { matchFilename } from "@/lib/domain/filename-match";
import { putDirect, runWithConcurrency } from "@/lib/upload/direct-upload";
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

// `file` conservé (pas juste son nom) pour permettre un vrai bouton
// "Réessayer" qui relance l'envoi directement, sans qu'Enzo ait à
// rechercher et resélectionner chaque photo échouée à la main (retour
// d'Enzo, 2026-08-25 : "je dois aller les chercher une par une").
export type UploadFailure = { filename: string; reason: string; file: File };

async function uploadOnePhoto(
  galleryId: string,
  original: File,
  previewCandidates: File[],
): Promise<{ ok: true } | { ok: false; filename: string; reason: string; capExceeded?: true }> {
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
    if ("error" in result) {
      return {
        ok: false,
        filename: original.name,
        reason: result.error,
        capExceeded: result.capExceeded,
      };
    }
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Erreur inconnue.";
    return { ok: false, filename: original.name, reason };
  }
}

export type UploadProgress = { done: number; total: number; imported: number; failed: number };

export async function uploadPhotosDirectly(
  galleryId: string,
  originals: File[],
  previews: File[],
  onProgress: (progress: UploadProgress) => void,
): Promise<{ imported: number; unmatched: UploadFailure[]; capExceeded: boolean }> {
  let imported = 0;
  let done = 0;
  // Retour d'Enzo, 2026-08-27 : "ça me bloque tout de suite au lieu de
  // tester toutes les photos et donc échouer toutes" — dès qu'UNE photo
  // signale le quota B2 dépassé, plus aucune nouvelle photo ne démarre
  // (voir `shouldStop` passé à runWithConcurrency). Avec 5 envois en
  // parallèle, quelques photos déjà en vol au moment de la détection
  // échoueront quand même individuellement — inévitable avec du
  // parallélisme, mais un lot de 100+ ne finit plus par échouer en
  // entier un par un.
  let capExceeded = false;
  const unmatched: UploadFailure[] = [];
  const attempted = new Set<string>();

  // 5 envois simultanés (retour d'Enzo, 2026-08-25 : "j'aimerais que ce
  // soit plus rapide") — la vitesse réelle reste surtout bornée par le
  // débit montant de sa connexion (des RAW de 20-80 Mo chacun), mais un
  // peu plus de parallélisme aide sans risquer de saturer le navigateur.
  await runWithConcurrency(
    originals,
    5,
    async (file) => {
      attempted.add(file.name);
      const result = await uploadOnePhoto(galleryId, file, previews);
      if (result.ok) {
        imported += 1;
      } else {
        unmatched.push({ filename: result.filename, reason: result.reason, file });
        if (result.capExceeded) capExceeded = true;
      }
      done += 1;
      onProgress({ done, total: originals.length, imported, failed: unmatched.length });
    },
    () => capExceeded,
  );

  // Photos jamais même tentées, arrêtées avant de commencer (voir
  // `shouldStop` ci-dessus) — regroupées avec les échecs plutôt qu'un
  // concept séparé : "Réessayer" (photo-upload-form.tsx) les couvre déjà
  // puisqu'il ré-envoie tout `unmatched`, sans code en plus.
  for (const file of originals) {
    if (!attempted.has(file.name)) {
      unmatched.push({
        filename: file.name,
        reason: "Pas tentée — import arrêté après le quota B2 dépassé.",
        file,
      });
    }
  }

  return { imported, unmatched, capExceeded };
}
