import { putDirect } from "@/lib/upload/direct-upload";
import { prepareExampleUploadAction, finalizeExampleUploadAction } from "./actions";

// Orchestration client — même principe que upload-portfolio-item.ts
// (préparer → déposer → finaliser), avec deux fichiers déposés en
// parallèle plutôt qu'un seul.
export async function uploadBeforeAfterExample(params: {
  beforeFile: File;
  afterFile: File;
  caption: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const beforeContentType = params.beforeFile.type || "image/jpeg";
  const afterContentType = params.afterFile.type || "image/jpeg";

  try {
    const prepared = await prepareExampleUploadAction({
      beforeFilename: params.beforeFile.name,
      beforeContentType,
      afterFilename: params.afterFile.name,
      afterContentType,
    });

    await Promise.all([
      putDirect(prepared.beforeUploadUrl, params.beforeFile, beforeContentType),
      putDirect(prepared.afterUploadUrl, params.afterFile, afterContentType),
    ]);

    const result = await finalizeExampleUploadAction({
      exampleId: prepared.exampleId,
      beforeFilename: params.beforeFile.name,
      afterFilename: params.afterFile.name,
      caption: params.caption,
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
