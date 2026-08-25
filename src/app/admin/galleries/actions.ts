"use server";

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { GalleryFormSchema } from "@/lib/domain/gallery-form";
import { createGallery, updateGallery, deleteGallery, getGalleryById } from "@/lib/services/gallery-service";

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

// Suppression définitive — retape le titre exact du shooting pour
// confirmer (revérifié ici, pas seulement côté client) : au-delà du
// nombre de photos qu'un shooting peut représenter, une simple boîte de
// confirmation se ferme d'un clic distrait, retaper le titre non.
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
  if (typeof confirmation !== "string" || confirmation.trim() !== gallery.title) {
    return { error: "Le titre tapé ne correspond pas — suppression annulée." };
  }

  await deleteGallery(galleryId);
  redirect("/admin");
}
