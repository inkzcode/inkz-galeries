"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { unlockSelection } from "@/lib/services/confirm-selection-service";

export async function unlockSelectionAction(galleryId: string) {
  await verifySession();
  await unlockSelection(galleryId);
  revalidatePath(`/admin/galleries/${galleryId}`);
}
