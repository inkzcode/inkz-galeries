"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { getStorageAdapter } from "@/lib/storage/client";
import { buildPortfolioItemObjectKey } from "@/lib/storage/keys";
import { createPortfolioItem, deletePortfolioItem } from "@/lib/services/portfolio-item-service";

function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "jpg").toLowerCase();
}

function revalidatePortfolioPaths(): void {
  revalidatePath("/admin/portfolio");
  revalidatePath("/");
  revalidatePath("/portfolio");
}

export type PrepareItemUploadResult = { itemId: string; uploadUrl: string };

// Même principe de dépôt direct que les photos de shooting (voir
// photos-actions.ts) — même si un visuel de portfolio dépasse rarement
// 4,5 Mo, autant rester cohérent avec le reste de l'admin plutôt que
// d'avoir deux façons différentes d'envoyer un fichier.
export async function prepareItemUploadAction(
  filename: string,
  contentType: string,
): Promise<PrepareItemUploadResult> {
  await verifySession();
  const itemId = randomUUID();
  const key = buildPortfolioItemObjectKey({ itemId, extension: extensionOf(filename) });
  const storage = getStorageAdapter();
  const uploadUrl = await storage.getUploadUrl("previews", key, contentType || "image/jpeg");
  return { itemId, uploadUrl };
}

export type FinalizeItemUploadResult = { success: true } | { error: string };

export async function finalizeItemUploadAction(params: {
  itemId: string;
  filename: string;
  title: string;
  description: string;
  category: string;
}): Promise<FinalizeItemUploadResult> {
  await verifySession();
  if (params.title.trim() === "") {
    return { error: "Le titre est requis." };
  }

  try {
    await createPortfolioItem({
      title: params.title.trim(),
      description: params.description.trim() || null,
      category: params.category.trim() || null,
      imageKey: buildPortfolioItemObjectKey({
        itemId: params.itemId,
        extension: extensionOf(params.filename),
      }),
    });
  } catch (error) {
    console.error("Échec de la création de l'élément de portfolio :", error);
    return { error: "L'enregistrement a échoué." };
  }

  revalidatePortfolioPaths();
  return { success: true };
}

export async function deleteItemAction(id: string): Promise<void> {
  await verifySession();
  await deletePortfolioItem(id);
  revalidatePortfolioPaths();
}
