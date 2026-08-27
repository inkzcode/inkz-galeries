"use server";

import { hasGalleryAccess } from "@/lib/gallery-access/session";
import { createOrReusePaymentIntent } from "@/lib/services/stripe-service";

export async function createOrReusePaymentIntentAction(gallerySlug: string) {
  const authorized = await hasGalleryAccess(gallerySlug);
  if (!authorized) {
    return { error: "Accès non autorisé." } as const;
  }

  return createOrReusePaymentIntent(gallerySlug);
}
