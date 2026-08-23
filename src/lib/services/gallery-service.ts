import "server-only";
import { prisma } from "@/lib/db";
import { generateGallerySlug } from "@/lib/domain/slug";
import { eurosToCents, type GalleryFormInput } from "@/lib/domain/gallery-form";

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

export function listGalleries() {
  return prisma.gallery.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      status: true,
      shootingDate: true,
      createdAt: true,
      _count: { select: { photos: true } },
    },
  });
}

export function getGalleryById(id: string) {
  return prisma.gallery.findUnique({ where: { id } });
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
