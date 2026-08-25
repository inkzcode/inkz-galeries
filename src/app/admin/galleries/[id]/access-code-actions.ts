"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { issueAccessCode } from "@/lib/services/access-code-service";
import { getGalleryById } from "@/lib/services/gallery-service";
import { sendGalleryAvailableEmail } from "@/lib/email/send-gallery-available-email";

export type IssueAccessCodeState = { plaintextCode?: string; error?: string } | undefined;

export async function issueAccessCodeAction(
  galleryId: string,
  _prevState: IssueAccessCodeState,
  formData: FormData,
): Promise<IssueAccessCodeState> {
  await verifySession();

  const expiresAtRaw = formData.get("expiresAt");
  const expiresAt =
    typeof expiresAtRaw === "string" && expiresAtRaw !== "" ? new Date(expiresAtRaw) : undefined;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { error: "Date d'expiration invalide." };
  }

  try {
    const plaintextCode = await issueAccessCode(galleryId, expiresAt);
    revalidatePath(`/admin/galleries/${galleryId}`);

    // Notifie le client par email (brief §30) — sans adresse renseignée,
    // ne fait simplement rien (champ facultatif, voir gallery-form.tsx).
    // Ne bloque jamais la génération du code si l'envoi échoue (voir
    // lib/email/shared.ts).
    const gallery = await getGalleryById(galleryId);
    if (gallery?.clientEmail) {
      await sendGalleryAvailableEmail({
        clientEmail: gallery.clientEmail,
        galleryTitle: gallery.title,
        gallerySlug: gallery.slug,
        accessCode: plaintextCode,
      });
    }

    return { plaintextCode };
  } catch (error) {
    console.error("Échec de génération du code d'accès :", error);
    return { error: "La génération a échoué." };
  }
}
