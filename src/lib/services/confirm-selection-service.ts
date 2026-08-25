import "server-only";
import { prisma } from "@/lib/db";
import { calculateAmountDue, type PricingResult } from "@/lib/domain/pricing";
import {
  onPaymentRequired,
  onReadyForRetouch,
  onSelectionConfirmed,
} from "@/lib/domain/gallery-status-machine";
import { sendSelectionReceivedEmail } from "@/lib/email/send-selection-received-email";

// Verrouille la sélection d'une galerie et fait avancer son statut (brief
// §15 : "sélection → récapitulatif → confirmation → paiement si
// nécessaire → post-production"). Idempotent : reconfirmer une sélection
// déjà verrouillée ne fait rien (pas de double transition de statut).
export async function confirmSelection(
  gallerySlug: string,
): Promise<{ pricing: PricingResult } | null> {
  const gallery = await prisma.gallery.findUnique({
    where: { slug: gallerySlug },
    include: { _count: { select: { photos: { where: { selection: { isNot: null } } } } } },
  });
  if (!gallery) return null;

  const pricing = calculateAmountDue(
    {
      pricingMode: gallery.pricingMode,
      includedPhotosCount: gallery.includedPhotosCount,
      extraPhotoPriceCents: gallery.extraPhotoPriceCents,
      currency: gallery.currency,
    },
    gallery._count.photos,
  );

  if (gallery.selectionLockedAt) {
    // Déjà confirmée — on renvoie juste le récapitulatif, pas de nouvelle
    // écriture (évite de rejouer les transitions de statut).
    return { pricing };
  }

  const afterConfirm = onSelectionConfirmed(gallery.status);
  // Montant nul (brief §16) : aucune étape de paiement inutile, on passe
  // directement à la retouche. Sinon, on marque le paiement en attente —
  // pas de faux système de paiement, juste le statut (brief §16 : "ne
  // développe pas un faux système de paiement artisanal").
  const finalStatus = pricing.requiresPayment
    ? onPaymentRequired(afterConfirm)
    : onReadyForRetouch(afterConfirm);

  await prisma.$transaction([
    prisma.gallery.update({
      where: { id: gallery.id },
      data: { selectionLockedAt: new Date(), status: finalStatus },
    }),
    prisma.statusHistory.create({
      data: {
        galleryId: gallery.id,
        fromStatus: gallery.status,
        toStatus: finalStatus,
        changedBy: "SYSTEM",
        note: pricing.requiresPayment
          ? "Sélection confirmée par le client — paiement requis"
          : "Sélection confirmée par le client",
      },
    }),
  ]);

  // Notifie Enzo (pas le client — c'est lui qui doit agir ensuite), brief
  // §30. Un seul compte admin dans ce projet (voir AdminUser.email) : pas
  // de nouvelle variable d'environnement à configurer. Ne bloque jamais
  // la confirmation si l'envoi échoue (voir lib/email/shared.ts).
  const admin = await prisma.adminUser.findFirst({ select: { email: true } });
  if (admin) {
    await sendSelectionReceivedEmail({
      adminEmail: admin.email,
      galleryId: gallery.id,
      galleryTitle: gallery.title,
      selectedCount: gallery._count.photos,
      amountDueCents: pricing.amountDueCents,
      currency: pricing.currency,
    });
  }

  return { pricing };
}

// Déverrouillage manuel depuis l'admin (brief §15 : "je dois pouvoir la
// déverrouiller manuellement en cas de besoin"). Ne rétrograde PAS le
// statut automatiquement — l'admin garde le contrôle de la suite.
export async function unlockSelection(galleryId: string): Promise<void> {
  const gallery = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });

  await prisma.$transaction([
    prisma.gallery.update({
      where: { id: galleryId },
      data: { selectionLockedAt: null },
    }),
    prisma.statusHistory.create({
      data: {
        galleryId,
        fromStatus: gallery.status,
        toStatus: gallery.status,
        changedBy: "ADMIN",
        note: "Sélection déverrouillée manuellement",
      },
    }),
  ]);
}

export async function getSelectedPhotos(galleryId: string) {
  return prisma.photo.findMany({
    where: { galleryId, selection: { isNot: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, filename: true, finalReadyAt: true },
  });
}
