import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/client";
import type { PricingConfig } from "@/lib/domain/pricing";
import type { WatermarkLevelValue } from "@/lib/domain/watermark-policy";
import type { GalleryStatusValue } from "@/lib/domain/gallery-status";
import { parseDrawingPath, type DrawingPoint } from "@/lib/domain/photo-note";

// DTO explicite pour la vue client (brief §6, et guide Next.js sur la Data
// Access Layer — voir PROJECT_CONTEXT.md §4) : ne sélectionne QUE les
// champs sûrs à exposer. En particulier, `originalKey`, `clientEmail` et
// tout champ interne à l'admin ne transitent jamais par cette fonction.

export type { DrawingPoint };

export type PublicGalleryNote = {
  id: string;
  message: string;
  color: string | null;
  drawingPath: DrawingPoint[] | null;
  positionX: number | null;
  positionY: number | null;
};

export type PublicGalleryPhoto = {
  id: string;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
  selected: boolean;
  notes: PublicGalleryNote[];
};

export type PublicGallery = PricingConfig & {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shootingDate: Date | null;
  watermarkLevel: WatermarkLevelValue;
  status: GalleryStatusValue;
  selectionLockedAt: Date | null;
  retouchPhilosophyEnabled: boolean;
  selfImageMessagesEnabled: boolean;
  photos: PublicGalleryPhoto[];
};

export async function getPublicGalleryBySlug(slug: string): Promise<PublicGallery | null> {
  const gallery = await prisma.gallery.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      shootingDate: true,
      watermarkLevel: true,
      status: true,
      pricingMode: true,
      includedPhotosCount: true,
      extraPhotoPriceCents: true,
      currency: true,
      selectionLockedAt: true,
      retouchPhilosophyEnabled: true,
      selfImageMessagesEnabled: true,
      photos: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          previewKey: true,
          width: true,
          height: true,
          selection: { select: { id: true } },
          notes: {
            where: { author: "CLIENT" },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              message: true,
              color: true,
              drawingPath: true,
              positionX: true,
              positionY: true,
            },
          },
        },
      },
    },
  });
  if (!gallery) return null;

  const storage = getStorageAdapter();
  const photos = await Promise.all(
    gallery.photos.map(async (photo) => ({
      id: photo.id,
      previewUrl: photo.previewKey ? await storage.getPreviewUrl(photo.previewKey) : null,
      width: photo.width,
      height: photo.height,
      selected: photo.selection !== null,
      notes: photo.notes.map((note) => ({
        id: note.id,
        message: note.message,
        color: note.color,
        drawingPath: parseDrawingPath(note.drawingPath),
        positionX: note.positionX,
        positionY: note.positionY,
      })),
    })),
  );

  return {
    id: gallery.id,
    slug: gallery.slug,
    title: gallery.title,
    description: gallery.description,
    shootingDate: gallery.shootingDate,
    watermarkLevel: gallery.watermarkLevel,
    status: gallery.status,
    pricingMode: gallery.pricingMode,
    includedPhotosCount: gallery.includedPhotosCount,
    extraPhotoPriceCents: gallery.extraPhotoPriceCents,
    currency: gallery.currency,
    selectionLockedAt: gallery.selectionLockedAt,
    retouchPhilosophyEnabled: gallery.retouchPhilosophyEnabled,
    selfImageMessagesEnabled: gallery.selfImageMessagesEnabled,
    photos,
  };
}
