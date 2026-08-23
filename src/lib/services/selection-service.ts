import "server-only";
import { prisma } from "@/lib/db";

// Bascule la sélection d'une photo. Vérification de sécurité critique :
// `photoId` vient du client, `gallerySlug` vient de la session déverrouillée
// (lib/gallery-access) — on revérifie ici que la photo appartient bien à
// CETTE galerie, pour qu'un client ne puisse jamais modifier la sélection
// d'une autre galerie en devinant un id (brief §21 : "protection contre les
// accès entre galeries"). L'appelant (Server Action) doit en plus avoir
// déjà vérifié hasGalleryAccess(gallerySlug) — ceci est une seconde
// vérification, pas la seule.
export async function toggleSelection(
  gallerySlug: string,
  photoId: string,
): Promise<{ selected: boolean } | null> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      gallery: { select: { slug: true, selectionLockedAt: true } },
      selection: { select: { id: true } },
    },
  });

  if (!photo || photo.gallery.slug !== gallerySlug) {
    return null;
  }
  if (photo.gallery.selectionLockedAt) {
    return null;
  }

  if (photo.selection) {
    await prisma.selectionItem.delete({ where: { photoId } });
    return { selected: false };
  }

  await prisma.selectionItem.create({ data: { photoId } });
  return { selected: true };
}
