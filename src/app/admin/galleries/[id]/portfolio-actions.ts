"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { setPortfolioCoverPhoto } from "@/lib/services/gallery-service";

export type SetPortfolioCoverState = { error?: string } | undefined;

export async function setPortfolioCoverAction(
  galleryId: string,
  _prevState: SetPortfolioCoverState,
  formData: FormData,
): Promise<SetPortfolioCoverState> {
  await verifySession();

  const photoId = formData.get("photoId");

  try {
    await setPortfolioCoverPhoto(galleryId, typeof photoId === "string" && photoId !== "" ? photoId : null);
  } catch (error) {
    console.error("Échec du choix de la couverture du portfolio :", error);
    return { error: "Cette photo ne peut pas être utilisée comme couverture." };
  }

  revalidatePath(`/admin/galleries/${galleryId}`);
}
