import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/client";

// Éléments de portfolio autonomes (brief §1, retour d'Enzo 2026-08-25 :
// "je veux pouvoir ajouter des trucs dans mon portfolio sans passer par
// inkz.fr ni par un shooting quelconque"). Toujours déjà finalisés (pas
// de RAW, pas de watermark, pas de sélection client) — stockés tels quels
// dans le bucket "previews" (mêmes besoins d'URL signée qu'une preview ou
// un final, voir lib/storage/README.md), jamais retraités.
export function listPortfolioItemsAdmin() {
  return prisma.portfolioItem.findMany({ orderBy: { createdAt: "desc" } });
}

export function createPortfolioItem(params: {
  title: string;
  description: string | null;
  category: string | null;
  imageKey: string;
}) {
  return prisma.portfolioItem.create({ data: params });
}

export async function deletePortfolioItem(id: string): Promise<void> {
  const item = await prisma.portfolioItem.findUniqueOrThrow({ where: { id } });
  const storage = getStorageAdapter();
  await storage.deleteObject("previews", item.imageKey).catch(() => {
    // Best-effort, comme deleteGallery() — un objet orphelin est un coût
    // de stockage négligeable, jamais un risque de sécurité.
  });
  await prisma.portfolioItem.delete({ where: { id } });
}
