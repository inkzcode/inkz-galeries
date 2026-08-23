import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/client";
import { buildPhotoObjectKey } from "@/lib/storage/keys";
import { generatePreview } from "@/lib/imaging/generate-preview";
import { onFirstPhotoImported } from "@/lib/domain/gallery-status-machine";

// Orchestration complète de l'import d'une photo (brief §12) :
//   original (RAW ou autre) → stocké tel quel, strictement privé
//   preview-source (JPEG déjà exporté localement par Enzo, voir
//     PROJECT_CONTEXT.md §2 — pas de décodage RAW côté serveur)
//     → redimensionnée + watermark rendu dans les pixels (lib/imaging)
//     → stockée séparément (bucket "previews")
// La première photo importée devient couverture par défaut (brief §3).

export type ImportPhotoInput = {
  galleryId: string;
  filename: string;
  originalBuffer: Buffer;
  originalExtension: string;
  originalContentType: string;
  previewSourceBuffer: Buffer;
};

export async function importPhoto(input: ImportPhotoInput) {
  const gallery = await prisma.gallery.findUniqueOrThrow({
    where: { id: input.galleryId },
  });

  const photoId = randomUUID();
  const storage = getStorageAdapter();

  const originalKey = buildPhotoObjectKey({
    galleryId: gallery.id,
    photoId,
    kind: "original",
    extension: input.originalExtension,
  });
  await storage.putObject(
    "originals",
    originalKey,
    input.originalBuffer,
    input.originalContentType,
  );

  const preview = await generatePreview(input.previewSourceBuffer, {
    watermarkLevel: gallery.watermarkLevel,
    watermarkText: `INKZ · ${gallery.title}`,
    seed: photoId,
  });
  const previewKey = buildPhotoObjectKey({
    galleryId: gallery.id,
    photoId,
    kind: "preview",
    extension: "jpg",
  });
  await storage.putObject("previews", previewKey, preview.buffer, "image/jpeg");

  const photo = await prisma.photo.create({
    data: {
      id: photoId,
      galleryId: gallery.id,
      filename: input.filename,
      originalKey,
      previewKey,
      width: preview.width,
      height: preview.height,
    },
  });

  const nextStatus = onFirstPhotoImported(gallery.status);
  const isFirstPhoto = !gallery.coverPhotoId;

  if (isFirstPhoto || nextStatus !== gallery.status) {
    await prisma.gallery.update({
      where: { id: gallery.id },
      data: {
        ...(isFirstPhoto ? { coverPhotoId: photo.id } : {}),
        ...(nextStatus !== gallery.status ? { status: nextStatus } : {}),
      },
    });
  }

  if (nextStatus !== gallery.status) {
    await prisma.statusHistory.create({
      data: {
        galleryId: gallery.id,
        fromStatus: gallery.status,
        toStatus: nextStatus,
        changedBy: "SYSTEM",
        note: "Première photo importée",
      },
    });
  }

  return photo;
}
