"use server";

import { revalidatePath } from "next/cache";
import { hasGalleryAccess } from "@/lib/gallery-access/session";
import { confirmSelection } from "@/lib/services/confirm-selection-service";

export async function confirmSelectionAction(gallerySlug: string) {
  const authorized = await hasGalleryAccess(gallerySlug);
  if (!authorized) {
    return { error: "Accès non autorisé." } as const;
  }

  const result = await confirmSelection(gallerySlug);
  if (!result) {
    return { error: "Action impossible." } as const;
  }

  revalidatePath(`/g/${gallerySlug}`);
  return { success: true, pricing: result.pricing } as const;
}
