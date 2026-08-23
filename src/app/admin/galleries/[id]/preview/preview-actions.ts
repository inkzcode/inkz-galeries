"use server";

import { verifySession } from "@/lib/auth/dal";
import { getGalleryById } from "@/lib/services/gallery-service";
import { grantGalleryAccess } from "@/lib/gallery-access/session";

// Pont entre la session admin et l'accès galerie "client" (cookie signé
// par code PIN, voir lib/gallery-access/session.ts). Sans ça, les actions
// serveur de la galerie (sélection, remarques, confirmation) rejettent
// silencieusement l'admin dans l'aperçu tant qu'il n'a jamais entré le
// code PIN lui-même pour CETTE galerie précise (`hasGalleryAccess` ne
// connaît rien de la session admin) — bug découvert en testant l'aperçu
// rendu interactif en §6sexvicies : les clics semblaient ne rien faire.
// Déclenché au montage réel de l'aperçu (preview-chrome.tsx), jamais
// pendant le rendu serveur de la page : les cookies ne peuvent être
// modifiés que dans une Server Action/Route Handler.
export async function grantPreviewAccessAction(galleryAdminId: string): Promise<void> {
  await verifySession();
  const gallery = await getGalleryById(galleryAdminId);
  if (!gallery) return;
  await grantGalleryAccess(gallery.slug);
}
