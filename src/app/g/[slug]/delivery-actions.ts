"use server";

import { hasGalleryAccess } from "@/lib/gallery-access/session";
import { markDeliveredOnClientView } from "@/lib/services/final-delivery-service";

// Volontairement déclenché par une action explicite côté client (voir
// delivery-view.tsx, useEffect au montage) plutôt qu'exécuté pendant le
// rendu serveur de la page — une mutation ne doit jamais dépendre d'une
// simple requête GET/rendu de page, qui peut être déclenchée par un
// pré-chargement de <Link>, un crawler, ou un outil d'aperçu, sans qu'un
// client n'ait réellement consulté la page (revue de sécurité, 2026-08-21).
export async function markDeliveredAction(gallerySlug: string, galleryId: string) {
  const authorized = await hasGalleryAccess(gallerySlug);
  if (!authorized) return;
  await markDeliveredOnClientView(galleryId);
}
