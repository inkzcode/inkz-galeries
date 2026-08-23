import "server-only";
import { prisma } from "@/lib/db";
import type { PhotoNoteInput } from "@/lib/domain/photo-note";

// Même garde-fou que selection-service.ts : revérifie que la photo
// appartient bien à la galerie de la session avant d'écrire quoi que ce
// soit (brief §21 — protection contre les accès entre galeries).
export async function addClientPhotoNote(
  gallerySlug: string,
  photoId: string,
  input: PhotoNoteInput,
) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, gallery: { select: { slug: true } } },
  });

  if (!photo || photo.gallery.slug !== gallerySlug) {
    return null;
  }

  return prisma.photoNote.create({
    data: {
      photoId,
      author: "CLIENT",
      message: input.message,
      positionX: input.positionX,
      positionY: input.positionY,
      drawingPath: input.drawingPath,
      color: input.color,
    },
  });
}

// Autorise uniquement la modification/suppression d'une remarque CLIENT de
// CETTE galerie — jamais une remarque du photographe (`author: "ADMIN"`),
// même si l'appelant connaît son id (même garde-fou que addClientPhotoNote).
async function findEditableClientNote(gallerySlug: string, noteId: string) {
  const note = await prisma.photoNote.findUnique({
    where: { id: noteId },
    select: { id: true, author: true, photo: { select: { gallery: { select: { slug: true } } } } },
  });
  if (!note || note.author !== "CLIENT" || note.photo.gallery.slug !== gallerySlug) {
    return null;
  }
  return note;
}

export async function updateClientPhotoNote(gallerySlug: string, noteId: string, message: string) {
  const note = await findEditableClientNote(gallerySlug, noteId);
  if (!note) return null;
  return prisma.photoNote.update({ where: { id: noteId }, data: { message } });
}

export async function deleteClientPhotoNote(gallerySlug: string, noteId: string): Promise<boolean> {
  const note = await findEditableClientNote(gallerySlug, noteId);
  if (!note) return false;
  await prisma.photoNote.delete({ where: { id: noteId } });
  return true;
}

const noteSelect = {
  id: true,
  author: true,
  message: true,
  positionX: true,
  positionY: true,
  drawingPath: true,
  color: true,
  resolved: true,
  createdAt: true,
} as const;

export function listPhotoNotes(photoId: string) {
  return prisma.photoNote.findMany({
    where: { photoId },
    orderBy: { createdAt: "asc" },
    select: noteSelect,
  });
}

// Vue admin : notes de TOUTES les photos d'une galerie en un aller, plutôt
// qu'une requête par photo (évite le N+1 sur la page de détail galerie).
export function listGalleryPhotoNotes(galleryId: string) {
  return prisma.photoNote.findMany({
    where: { photo: { galleryId } },
    orderBy: { createdAt: "asc" },
    select: { ...noteSelect, photoId: true },
  });
}
