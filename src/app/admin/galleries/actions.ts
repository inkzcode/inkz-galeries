"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { GalleryFormSchema } from "@/lib/domain/gallery-form";
import {
  createGallery,
  updateGallery,
  deleteGallery,
  getGalleryById,
  archiveGallery,
  unarchiveGallery,
} from "@/lib/services/gallery-service";

export type GalleryFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

function parseGalleryFormData(formData: FormData) {
  return GalleryFormSchema.safeParse({
    title: formData.get("title"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    description: formData.get("description"),
    shootingType: formData.get("shootingType"),
    shootingDate: formData.get("shootingDate"),
    watermarkLevel: formData.get("watermarkLevel"),
    pricingMode: formData.get("pricingMode"),
    includedPhotosCount: formData.get("includedPhotosCount"),
    extraPhotoPriceEuros: formData.get("extraPhotoPriceEuros"),
    retouchPhilosophyEnabled: formData.get("retouchPhilosophyEnabled") === "on",
    selfImageMessagesEnabled: formData.get("selfImageMessagesEnabled") === "on",
    beforeAfterEnabled: formData.get("beforeAfterEnabled") === "on",
    portfolioEnabled: formData.get("portfolioEnabled") === "on",
  });
}

export async function createGalleryAction(
  _prevState: GalleryFormState,
  formData: FormData,
): Promise<GalleryFormState> {
  // Chaque Server Action revérifie sa propre autorisation — voir
  // node_modules/next/dist/docs/.../authentication.md ("Server Actions").
  await verifySession();

  const validated = parseGalleryFormData(formData);
  if (!validated.success) {
    return {
      error: "Certains champs sont invalides.",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const gallery = await createGallery(validated.data);
  redirect(`/admin/galleries/${gallery.id}`);
}

export async function updateGalleryAction(
  id: string,
  _prevState: GalleryFormState,
  formData: FormData,
): Promise<GalleryFormState> {
  await verifySession();

  const validated = parseGalleryFormData(formData);
  if (!validated.success) {
    return {
      error: "Certains champs sont invalides.",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  await updateGallery(id, validated.data);
  redirect(`/admin/galleries/${id}`);
}

export type DeleteGalleryState = { error?: string } | undefined;

const DELETE_CONFIRMATION_WORD = "SUPPRIMER";

// Suppression définitive — tape un mot fixe pour confirmer (revérifié
// ici, pas seulement côté client). Retaper le titre exact du shooting
// était trop pénible en pratique (retour d'Enzo, 2026-08-25 : "je trouve
// ça trop compliqué [...] à la limite demande-moi de marquer ok") — un
// mot fixe court reste un vrai second geste volontaire (pas une boîte de
// dialogue qui se ferme d'un clic distrait), sans la charge de retaper
// un titre au caractère près.
export async function deleteGalleryAction(
  galleryId: string,
  _prevState: DeleteGalleryState,
  formData: FormData,
): Promise<DeleteGalleryState> {
  await verifySession();

  const gallery = await getGalleryById(galleryId);
  if (!gallery) {
    return { error: "Shooting introuvable." };
  }

  const confirmation = formData.get("confirmation");
  if (typeof confirmation !== "string" || confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION_WORD) {
    return { error: `Tapez "${DELETE_CONFIRMATION_WORD}" pour confirmer — suppression annulée.` };
  }

  await deleteGallery(galleryId);
  redirect("/admin");
}

// Archivage (brief §32) — purement organisationnel, réversible,
// contrairement à la suppression. Pas de confirmation lourde : rien n'est
// perdu (voir gallery-service.ts).
export async function archiveGalleryAction(galleryId: string): Promise<void> {
  await verifySession();
  await archiveGallery(galleryId);
  revalidatePath(`/admin/galleries/${galleryId}`);
  revalidatePath("/admin");
}

export async function unarchiveGalleryAction(galleryId: string): Promise<void> {
  await verifySession();
  await unarchiveGallery(galleryId);
  revalidatePath(`/admin/galleries/${galleryId}`);
  revalidatePath("/admin");
}
