"use server";

import { revalidatePath } from "next/cache";
import { hasGalleryAccess } from "@/lib/gallery-access/session";
import { toggleSelection } from "@/lib/services/selection-service";

export async function toggleSelectionAction(gallerySlug: string, photoId: string) {
  const authorized = await hasGalleryAccess(gallerySlug);
  if (!authorized) {
    return { error: "Accès non autorisé." } as const;
  }

  const result = await toggleSelection(gallerySlug, photoId);
  if (!result) {
    return { error: "Action impossible." } as const;
  }

  revalidatePath(`/g/${gallerySlug}`);
  return result;
}
