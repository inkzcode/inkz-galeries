"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { getStorageAdapter } from "@/lib/storage/client";
import { buildBeforeAfterObjectKey } from "@/lib/storage/keys";
import { createBeforeAfterExample, deleteBeforeAfterExample } from "@/lib/services/before-after-service";

function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "jpg").toLowerCase();
}

function revalidateBeforeAfterPaths(): void {
  revalidatePath("/admin/before-after");
  revalidatePath("/");
  revalidatePath("/portfolio");
}

export type PrepareExampleUploadResult = {
  exampleId: string;
  beforeUploadUrl: string;
  afterUploadUrl: string;
};

// Un exemple = une paire — les deux URLs signées sont préparées en un
// seul aller-retour (pas deux appels séparés) : l'id est créé côté
// serveur ici, jamais fait confiance à un id généré côté client.
export async function prepareExampleUploadAction(params: {
  beforeFilename: string;
  beforeContentType: string;
  afterFilename: string;
  afterContentType: string;
}): Promise<PrepareExampleUploadResult> {
  await verifySession();
  const exampleId = randomUUID();
  const storage = getStorageAdapter();
  const [beforeUploadUrl, afterUploadUrl] = await Promise.all([
    storage.getUploadUrl(
      "previews",
      buildBeforeAfterObjectKey({
        exampleId,
        side: "before",
        extension: extensionOf(params.beforeFilename),
      }),
      params.beforeContentType || "image/jpeg",
    ),
    storage.getUploadUrl(
      "previews",
      buildBeforeAfterObjectKey({
        exampleId,
        side: "after",
        extension: extensionOf(params.afterFilename),
      }),
      params.afterContentType || "image/jpeg",
    ),
  ]);
  return { exampleId, beforeUploadUrl, afterUploadUrl };
}

export type FinalizeExampleUploadResult = { success: true } | { error: string };

export async function finalizeExampleUploadAction(params: {
  exampleId: string;
  beforeFilename: string;
  afterFilename: string;
  caption: string;
}): Promise<FinalizeExampleUploadResult> {
  await verifySession();

  try {
    await createBeforeAfterExample({
      beforeKey: buildBeforeAfterObjectKey({
        exampleId: params.exampleId,
        side: "before",
        extension: extensionOf(params.beforeFilename),
      }),
      afterKey: buildBeforeAfterObjectKey({
        exampleId: params.exampleId,
        side: "after",
        extension: extensionOf(params.afterFilename),
      }),
      caption: params.caption.trim() || null,
    });
  } catch (error) {
    console.error("Échec de la création de l'exemple avant/après :", error);
    return { error: "L'enregistrement a échoué." };
  }

  revalidateBeforeAfterPaths();
  return { success: true };
}

export async function deleteExampleAction(id: string): Promise<void> {
  await verifySession();
  await deleteBeforeAfterExample(id);
  revalidateBeforeAfterPaths();
}
