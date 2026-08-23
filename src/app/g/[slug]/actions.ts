"use server";

import { redirect } from "next/navigation";
import { verifyGalleryAccessCode } from "@/lib/services/access-code-service";
import { grantGalleryAccess } from "@/lib/gallery-access/session";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rate-limit";

export type UnlockGalleryState = { error?: string } | undefined;

export async function unlockGalleryAction(
  gallerySlug: string,
  _prevState: UnlockGalleryState,
  formData: FormData,
): Promise<UnlockGalleryState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    return { error: "Merci de saisir le code reçu." };
  }

  const attemptKey = `gallery:${gallerySlug}:${await getClientIp()}`;
  if (isRateLimited(attemptKey)) {
    return { error: "Trop de tentatives — réessayer dans quelques minutes." };
  }

  const gallery = await verifyGalleryAccessCode(gallerySlug, code);
  if (!gallery) {
    recordFailedAttempt(attemptKey);
    return { error: "Code incorrect." };
  }

  clearAttempts(attemptKey);
  await grantGalleryAccess(gallerySlug);
  redirect(`/g/${gallerySlug}`);
}
