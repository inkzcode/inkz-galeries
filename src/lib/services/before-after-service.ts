import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/client";

// Vitrine avant/après publique (retour d'Enzo, 2026-08-29 : "dans le
// portfolio public / la home", pas dans les galeries privées des clients —
// il a explicitement écarté l'interprétation "par shooting" que
// `Gallery.beforeAfterEnabled` avait anticipée). Utilise le même modèle
// `BeforeAfterExample` que ce champ-là aurait utilisé, mais toujours avec
// `galleryId: null` — des exemples autonomes, exactement comme
// `PortfolioItem`. Ne jamais toucher aux lignes qui auraient un
// `galleryId` : cette fonctionnalité-ci reste hors périmètre.
export function listBeforeAfterExamplesAdmin() {
  return prisma.beforeAfterExample.findMany({
    where: { galleryId: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export function createBeforeAfterExample(params: {
  beforeKey: string;
  afterKey: string;
  caption: string | null;
}) {
  return prisma.beforeAfterExample.create({ data: { ...params, galleryId: null } });
}

export async function deleteBeforeAfterExample(id: string): Promise<void> {
  const example = await prisma.beforeAfterExample.findUniqueOrThrow({ where: { id } });
  const storage = getStorageAdapter();
  await Promise.all([
    storage.deleteObject("previews", example.beforeKey).catch(() => {}),
    storage.deleteObject("previews", example.afterKey).catch(() => {}),
  ]);
  await prisma.beforeAfterExample.delete({ where: { id } });
}

export type BeforeAfterPair = {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  caption: string | null;
};

// Lecture publique (page d'accueil + /portfolio) — toujours déjà
// finalisées (pas de RAW, pas de watermark), stockées dans le bucket
// "previews" comme les autres visuels de portfolio.
export async function listBeforeAfterExamples(): Promise<BeforeAfterPair[]> {
  const storage = getStorageAdapter();
  const examples = await prisma.beforeAfterExample.findMany({
    where: { galleryId: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return Promise.all(
    examples.map(async (example) => ({
      id: example.id,
      beforeUrl: await storage.getPreviewUrl(example.beforeKey),
      afterUrl: await storage.getPreviewUrl(example.afterKey),
      caption: example.caption,
    })),
  );
}
