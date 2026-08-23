"use server";

import { redirect } from "next/navigation";
import { findGalleryByAccessCode } from "@/lib/services/access-code-service";
import { grantGalleryAccess } from "@/lib/gallery-access/session";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rate-limit";

export type FindGalleryState = { error?: string } | undefined;

// Parcours "PIN seul" (brief §4 : aucun compte, aucun lien à retrouver) —
// contrairement à `g/[slug]/actions.ts::unlockGalleryAction`, on ne connaît
// pas encore la galerie au moment de la saisie : c'est le code qui la
// détermine (voir `findGalleryByAccessCode`). La clé de limitation ne peut
// donc porter que sur l'IP (pas de slug à inclure).
export async function findGalleryAction(
  _prevState: FindGalleryState,
  formData: FormData,
): Promise<FindGalleryState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    return { error: "Merci de saisir le code reçu." };
  }

  const attemptKey = `gallery-pin:${await getClientIp()}`;
  if (isRateLimited(attemptKey)) {
    return { error: "Trop de tentatives — réessayer dans quelques minutes." };
  }

  const gallery = await findGalleryByAccessCode(code);
  if (!gallery) {
    recordFailedAttempt(attemptKey);
    return { error: "Code incorrect." };
  }

  clearAttempts(attemptKey);
  await grantGalleryAccess(gallery.slug);
  redirect(`/g/${gallery.slug}`);
}
