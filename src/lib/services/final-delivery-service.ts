import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/client";
import { buildPhotoObjectKey } from "@/lib/storage/keys";
import {
  onDelivered,
  onFinalFilesImported,
  onPostProductionStarted,
} from "@/lib/domain/gallery-status-machine";
import { sendGalleryReadyEmail } from "@/lib/email/send-gallery-ready-email";

// Import d'un fichier final retouché pour UNE photo sélectionnée (brief
// §18). Contrairement aux previews, le fichier final n'est JAMAIS
// retraité (pas de resize, pas de watermark — brief : "absence de
// watermark lorsque les conditions de livraison sont remplies") : stocké
// tel quel, dans le bucket "previews" sous une clé `final.*` distincte
// (voir lib/storage/keys.ts) — pas de bucket R2 séparé pour rester simple,
// les finaux ont le même besoin d'URL signée/temporaire que les previews,
// contrairement aux originaux qui ne doivent JAMAIS avoir d'URL du tout.
export async function importFinalPhoto(
  galleryId: string,
  photoId: string,
  finalBuffer: Buffer,
  contentType: string,
): Promise<{ galleryReady: boolean } | null> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, galleryId: true, selection: { select: { id: true } } },
  });
  if (!photo || photo.galleryId !== galleryId || !photo.selection) {
    // Seules les photos sélectionnées reçoivent un fichier final — livrer
    // une photo jamais choisie par le client n'a pas de sens.
    return null;
  }

  const gallery = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });

  const storage = getStorageAdapter();
  const extension = contentType.includes("png") ? "png" : "jpg";
  const finalKey = buildPhotoObjectKey({ galleryId, photoId, kind: "final", extension });
  await storage.putObject("previews", finalKey, finalBuffer, contentType);

  await prisma.photo.update({
    where: { id: photoId },
    data: { finalKey, finalReadyAt: new Date() },
  });

  // Premier fichier final importé : la galerie passe en post-production.
  if (gallery.status === "TO_RETOUCH") {
    const next = onPostProductionStarted(gallery.status);
    await prisma.$transaction([
      prisma.gallery.update({ where: { id: galleryId }, data: { status: next } }),
      prisma.statusHistory.create({
        data: {
          galleryId,
          fromStatus: gallery.status,
          toStatus: next,
          changedBy: "ADMIN",
          note: "Premier fichier final importé",
        },
      }),
    ]);
  }

  // Toutes les photos sélectionnées ont-elles maintenant un final ? Si
  // oui, la galerie est prête à livrer.
  const [selectedCount, deliveredCount] = await Promise.all([
    prisma.selectionItem.count({ where: { photo: { galleryId } } }),
    prisma.photo.count({ where: { galleryId, selection: { isNot: null }, finalKey: { not: null } } }),
  ]);

  let galleryReady = false;
  if (selectedCount > 0 && selectedCount === deliveredCount) {
    const current = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });
    const next = onFinalFilesImported(current.status);
    if (next !== current.status) {
      await prisma.$transaction([
        prisma.gallery.update({ where: { id: galleryId }, data: { status: next } }),
        prisma.statusHistory.create({
          data: {
            galleryId,
            fromStatus: current.status,
            toStatus: next,
            changedBy: "SYSTEM",
            note: "Tous les fichiers finaux importés",
          },
        }),
      ]);

      // Notifie le client par email (retour d'Enzo, 2026-08-22) — sans
      // adresse renseignée, ne fait simplement rien (champ facultatif,
      // voir gallery-form.tsx). Ne bloque jamais l'import si l'envoi
      // échoue (voir send-gallery-ready-email.ts).
      if (current.clientEmail) {
        await sendGalleryReadyEmail({
          clientEmail: current.clientEmail,
          galleryTitle: current.title,
          gallerySlug: current.slug,
        });
      }
    }
    galleryReady = true;
  }

  return { galleryReady };
}

// Appelé quand le client consulte sa galerie une fois prête (brief §18 :
// "lorsqu'elles sont prêtes, le client retrouve les photographies
// finales") — idempotent, ne fait rien si déjà livré ou pas encore prêt.
export async function markDeliveredOnClientView(galleryId: string): Promise<void> {
  const gallery = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });
  if (gallery.status !== "READY_TO_DELIVER") return;

  const next = onDelivered(gallery.status);
  await prisma.$transaction([
    prisma.gallery.update({ where: { id: galleryId }, data: { status: next } }),
    prisma.statusHistory.create({
      data: {
        galleryId,
        fromStatus: gallery.status,
        toStatus: next,
        changedBy: "SYSTEM",
        note: "Consultée par le client",
      },
    }),
  ]);
}

export async function listDeliverablePhotos(galleryId: string) {
  const photos = await prisma.photo.findMany({
    where: { galleryId, selection: { isNot: null }, finalKey: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, filename: true, finalKey: true, width: true, height: true },
  });

  const storage = getStorageAdapter();
  return Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      filename: photo.filename,
      // Dimensions de l'original/preview au moment de l'import — le final
      // exporté peut différer légèrement (recadrage en post-production),
      // utilisé uniquement comme indication de mise en page (mosaïque),
      // jamais comme valeur exacte garantie.
      width: photo.width,
      height: photo.height,
      // Deux URLs distinctes : viewUrl (sans Content-Disposition, pour
      // l'aperçu <img>) et downloadUrl (avec, pour forcer le
      // téléchargement même cross-origin sur R2 — voir types.ts). Les
      // réutiliser l'une pour l'autre casserait soit l'aperçu, soit le
      // téléchargement.
      viewUrl: await storage.getPreviewUrl(photo.finalKey!),
      downloadUrl: await storage.getDownloadUrl(photo.finalKey!, photo.filename),
    })),
  );
}
