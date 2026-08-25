import { putDirect } from "@/lib/upload/direct-upload";
import { prepareItemUploadAction, finalizeItemUploadAction } from "./actions";

// Orchestration client du dépôt direct — même principe que
// direct-photo-upload.ts (préparer → déposer → finaliser), simplifié :
// un seul fichier, déjà fini (pas de RAW, pas de watermark).
export async function uploadPortfolioItem(params: {
  file: File;
  title: string;
  description: string;
  category: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const contentType = params.file.type || "image/jpeg";

  try {
    const prepared = await prepareItemUploadAction(params.file.name, contentType);
    await putDirect(prepared.uploadUrl, params.file, contentType);

    const result = await finalizeItemUploadAction({
      itemId: prepared.itemId,
      filename: params.file.name,
      title: params.title,
      description: params.description,
      category: params.category,
    });
    if ("error" in result) return { success: false, error: result.error };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Échec de l'envoi.",
    };
  }
}
