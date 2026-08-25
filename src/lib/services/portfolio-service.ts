import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/client";

// Portfolio public (brief §1) — DTO explicite, même principe que
// public-gallery-service.ts : ne sélectionner que des champs sûrs pour
// une page sans authentification (jamais clientName/clientEmail, jamais
// originalKey/previewKey). Fusionne DEUX sources, triées ensemble par
// date :
// - les shootings publiés (Gallery.portfolioEnabled + une couverture
//   choisie parmi les fichiers finaux, voir gallery-service.ts) ;
// - les éléments autonomes ajoutés directement depuis l'admin, sans
//   shooting (PortfolioItem, voir portfolio-item-service.ts).
// Le lecteur public ne voit jamais la différence entre les deux — un seul
// type de sortie, une seule grille (portfolio-grid.tsx).
export type PortfolioEntry = {
  id: string;
  title: string;
  description: string | null;
  shootingType: string | null;
  coverUrl: string;
  createdAt: Date;
};

export async function listPortfolioEntries(): Promise<PortfolioEntry[]> {
  const storage = getStorageAdapter();

  const [galleries, items] = await Promise.all([
    prisma.gallery.findMany({
      where: { portfolioEnabled: true, portfolioCoverPhotoId: { not: null } },
      select: {
        id: true,
        title: true,
        description: true,
        shootingType: true,
        createdAt: true,
        portfolioCoverPhoto: { select: { finalKey: true } },
      },
    }),
    prisma.portfolioItem.findMany(),
  ]);

  const fromGalleries = await Promise.all(
    galleries.map(async (gallery) => ({
      id: gallery.id,
      title: gallery.title,
      description: gallery.description,
      shootingType: gallery.shootingType,
      createdAt: gallery.createdAt,
      // finalKey ne peut pas être null ici : setPortfolioCoverPhoto()
      // refuse toute photo sans fichier final avant de l'accepter comme
      // couverture (voir gallery-service.ts).
      coverUrl: await storage.getPreviewUrl(gallery.portfolioCoverPhoto!.finalKey!),
    })),
  );

  const fromItems = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      shootingType: item.category,
      createdAt: item.createdAt,
      coverUrl: await storage.getPreviewUrl(item.imageKey),
    })),
  );

  return [...fromGalleries, ...fromItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
