import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/client";

// Portfolio public (brief §1) — DTO explicite, même principe que
// public-gallery-service.ts : ne sélectionner que des champs sûrs pour
// une page sans authentification (jamais clientName/clientEmail, jamais
// originalKey/previewKey). Un shooting n'apparaît ici que si Enzo l'a
// explicitement activé ET a choisi une couverture (voir
// gallery-service.ts, setPortfolioCoverPhoto) — les deux gestes sont
// séparés, donc les deux conditions sont nécessaires.
export type PortfolioEntry = {
  slug: string;
  title: string;
  description: string | null;
  shootingType: string | null;
  coverUrl: string;
};

export async function listPortfolioEntries(): Promise<PortfolioEntry[]> {
  const galleries = await prisma.gallery.findMany({
    where: { portfolioEnabled: true, portfolioCoverPhotoId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      description: true,
      shootingType: true,
      portfolioCoverPhoto: { select: { finalKey: true } },
    },
  });

  const storage = getStorageAdapter();
  return Promise.all(
    galleries.map(async (gallery) => ({
      slug: gallery.slug,
      title: gallery.title,
      description: gallery.description,
      shootingType: gallery.shootingType,
      // finalKey ne peut pas être null ici : setPortfolioCoverPhoto()
      // refuse toute photo sans fichier final avant de l'accepter comme
      // couverture (voir gallery-service.ts).
      coverUrl: await storage.getPreviewUrl(gallery.portfolioCoverPhoto!.finalKey!),
    })),
  );
}
