import "server-only";
import { prisma } from "@/lib/db";
import { generateGallerySlug } from "@/lib/domain/slug";
import { eurosToCents, type GalleryFormInput } from "@/lib/domain/gallery-form";
import { getStorageAdapter } from "@/lib/storage/client";

// Orchestration Prisma pour un shooting — voir README.md de ce dossier.
// La validation des données vit dans lib/domain/gallery-form.ts, ce fichier
// se contente de traduire une entrée déjà validée en écritures Prisma.

function buildGalleryFields(input: GalleryFormInput) {
  return {
    title: input.title,
    clientName: input.clientName ?? null,
    clientEmail: input.clientEmail ?? null,
    description: input.description ?? null,
    shootingType: input.shootingType ?? null,
    shootingDate: input.shootingDate ? new Date(input.shootingDate) : null,
    watermarkLevel: input.watermarkLevel,
    pricingMode: input.pricingMode,
    includedPhotosCount: input.includedPhotosCount
      ? Number(input.includedPhotosCount)
      : null,
    extraPhotoPriceCents: eurosToCents(input.extraPhotoPriceEuros) ?? null,
    retouchPhilosophyEnabled: input.retouchPhilosophyEnabled,
    selfImageMessagesEnabled: input.selfImageMessagesEnabled,
    beforeAfterEnabled: input.beforeAfterEnabled,
    portfolioEnabled: input.portfolioEnabled,
  };
}

export async function createGallery(input: GalleryFormInput) {
  const slug = generateGallerySlug(input.title);
  return prisma.gallery.create({
    data: {
      ...buildGalleryFields(input),
      slug,
      status: "DRAFT",
      statusHistory: {
        create: { toStatus: "DRAFT", changedBy: "ADMIN" },
      },
    },
  });
}

export async function updateGallery(id: string, input: GalleryFormInput) {
  return prisma.gallery.update({
    where: { id },
    data: buildGalleryFields(input),
  });
}

const GALLERY_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  clientName: true,
  status: true,
  shootingDate: true,
  createdAt: true,
  _count: { select: { photos: true } },
} as const;

// Les archivées sont exclues par défaut (voir `listArchivedGalleries()`) —
// l'archivage (brief §32) sert justement à désencombrer ce tableau de bord
// des vieux shootings déjà livrés depuis longtemps.
export function listGalleries() {
  return prisma.gallery.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    select: GALLERY_LIST_SELECT,
  });
}

export function listArchivedGalleries() {
  return prisma.gallery.findMany({
    where: { status: "ARCHIVED" },
    orderBy: { createdAt: "desc" },
    select: GALLERY_LIST_SELECT,
  });
}

// L'archivage est toujours manuel (voir
// lib/domain/gallery-status-machine.ts, dernière note) et purement un
// marqueur d'organisation — n'affecte jamais le stockage objet (§12 de
// PROJECT_CONTEXT.md : aucune suppression automatique). Réversible,
// contrairement à la suppression : seul un shooting déjà `DELIVERED` peut
// être archivé, et on revient toujours à `DELIVERED` en désarchivant —
// c'est le seul état d'où l'archivage part.
export async function archiveGallery(galleryId: string): Promise<void> {
  const gallery = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });
  if (gallery.status !== "DELIVERED") return;

  await prisma.$transaction([
    prisma.gallery.update({ where: { id: galleryId }, data: { status: "ARCHIVED" } }),
    prisma.statusHistory.create({
      data: {
        galleryId,
        fromStatus: gallery.status,
        toStatus: "ARCHIVED",
        changedBy: "ADMIN",
        note: "Archivé manuellement",
      },
    }),
  ]);
}

// Couverture du portfolio public (brief §1) — DOIT pointer vers un
// fichier final (retouché, sans watermark) : jamais une preview privée.
// Le champ `portfolioEnabled` (formulaire de création/édition) et ce
// choix de couverture sont deux gestes séparés à dessein — la couverture
// ne peut exister qu'une fois un final importé, bien après la création
// du shooting.
export async function setPortfolioCoverPhoto(
  galleryId: string,
  photoId: string | null,
): Promise<void> {
  if (photoId === null) {
    await prisma.gallery.update({
      where: { id: galleryId },
      data: { portfolioCoverPhotoId: null },
    });
    return;
  }

  const photo = await prisma.photo.findUniqueOrThrow({ where: { id: photoId } });
  if (photo.galleryId !== galleryId || !photo.finalKey) {
    throw new Error("Cette photo ne peut pas servir de couverture au portfolio.");
  }

  await prisma.gallery.update({
    where: { id: galleryId },
    data: { portfolioCoverPhotoId: photoId },
  });
}

export async function unarchiveGallery(galleryId: string): Promise<void> {
  const gallery = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });
  if (gallery.status !== "ARCHIVED") return;

  await prisma.$transaction([
    prisma.gallery.update({ where: { id: galleryId }, data: { status: "DELIVERED" } }),
    prisma.statusHistory.create({
      data: {
        galleryId,
        fromStatus: gallery.status,
        toStatus: "DELIVERED",
        changedBy: "ADMIN",
        note: "Désarchivé manuellement",
      },
    }),
  ]);
}

export function getGalleryById(id: string) {
  return prisma.gallery.findUnique({ where: { id } });
}

// Suppression définitive (retour d'Enzo, 2026-08-25 : "je veux pouvoir
// supprimer mes shooting si je veux"). Toutes les tables liées ont
// `onDelete: Cascade` (voir prisma/schema.prisma) — un seul
// `gallery.delete()` suffit côté base. Le stockage objet n'est PAS
// couvert par ce cascade (R2/B2 n'a aucune notion de clé étrangère) :
// nettoyé explicitement d'abord, au mieux — un objet orphelin qui
// survit à un échec de suppression ponctuel est un coût de stockage
// négligeable, jamais un risque de sécurité ou une donnée fantôme dans
// l'app (plus aucune ligne ne référence sa clé après ce point).
export async function deleteGallery(galleryId: string): Promise<void> {
  const photos = await prisma.photo.findMany({
    where: { galleryId },
    select: { originalKey: true, previewKey: true, finalKey: true },
  });

  const storage = getStorageAdapter();
  await Promise.all(
    photos.flatMap((photo) => {
      const deletions = [storage.deleteObject("originals", photo.originalKey)];
      if (photo.previewKey) deletions.push(storage.deleteObject("previews", photo.previewKey));
      if (photo.finalKey) deletions.push(storage.deleteObject("previews", photo.finalKey));
      return deletions.map((p) => p.catch(() => {}));
    }),
  );

  await prisma.gallery.delete({ where: { id: galleryId } });
}

export function listGalleryPhotos(galleryId: string) {
  return prisma.photo.findMany({
    where: { galleryId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      filename: true,
      previewKey: true,
      width: true,
      height: true,
      createdAt: true,
    },
  });
}
