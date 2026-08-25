"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { issueAccessCode } from "@/lib/services/access-code-service";

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
    return { plaintextCode };
  } catch (error) {
    console.error("Échec de génération du code d'accès :", error);
    return { error: "La génération a échoué." };
  }
}
