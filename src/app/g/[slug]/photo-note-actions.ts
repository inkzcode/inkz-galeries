"use server";

import { revalidatePath } from "next/cache";
import { hasGalleryAccess } from "@/lib/gallery-access/session";
import { PhotoNoteSchema, PhotoNoteMessageSchema } from "@/lib/domain/photo-note";
import {
  addClientPhotoNote,
  updateClientPhotoNote,
  deleteClientPhotoNote,
} from "@/lib/services/photo-note-service";
import type { DrawingPoint } from "@/lib/services/public-gallery-service";

export type PhotoNoteActionResult = { error?: string; success?: boolean };

// Plusieurs remarques peuvent être créées/modifiées d'un coup depuis
// photo-notes-panel.tsx (retour d'Enzo, 2026-08-22 : "je veux [...] dire
// plusieurs trucs d'un coup sans avoir à envoyer à chaque fois") — d'où
// des arguments directs plutôt qu'un FormData lié à un unique `<form>`.
export async function addPhotoNoteAction(
  gallerySlug: string,
  photoId: string,
  input: { message: string; drawingPath: DrawingPoint[]; color: string },
): Promise<PhotoNoteActionResult> {
  const authorized = await hasGalleryAccess(gallerySlug);
  if (!authorized) {
    return { error: "Accès non autorisé." };
  }

  const validated = PhotoNoteSchema.safeParse(input);
  if (!validated.success) {
    return { error: "Merci de préciser votre remarque." };
  }

  const note = await addClientPhotoNote(gallerySlug, photoId, validated.data);
  if (!note) {
    return { error: "Action impossible." };
  }

  revalidatePath(`/g/${gallerySlug}`);
  return { success: true };
}

export async function updatePhotoNoteAction(
  gallerySlug: string,
  noteId: string,
  message: string,
): Promise<PhotoNoteActionResult> {
  const authorized = await hasGalleryAccess(gallerySlug);
  if (!authorized) {
    return { error: "Accès non autorisé." };
  }

  const validated = PhotoNoteMessageSchema.safeParse({ message });
  if (!validated.success) {
    return { error: "Le message ne peut pas être vide." };
  }

  const note = await updateClientPhotoNote(gallerySlug, noteId, validated.data.message);
  if (!note) {
    return { error: "Action impossible." };
  }

  revalidatePath(`/g/${gallerySlug}`);
  return { success: true };
}

export async function deletePhotoNoteAction(
  gallerySlug: string,
  noteId: string,
): Promise<PhotoNoteActionResult> {
  const authorized = await hasGalleryAccess(gallerySlug);
  if (!authorized) {
    return { error: "Accès non autorisé." };
  }

  const ok = await deleteClientPhotoNote(gallerySlug, noteId);
  if (!ok) {
    return { error: "Action impossible." };
  }

  revalidatePath(`/g/${gallerySlug}`);
  return { success: true };
}
