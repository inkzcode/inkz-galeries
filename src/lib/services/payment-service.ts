import "server-only";
import { prisma } from "@/lib/db";
import { calculateAmountDue } from "@/lib/domain/pricing";
import { onReadyForRetouch } from "@/lib/domain/gallery-status-machine";
import { sendPaymentReceivedEmail } from "@/lib/email/send-payment-received-email";

// Pas d'intégration Stripe réelle (brief §16 — explicitement hors
// périmètre pour l'instant). Ce que ce fichier fait : enregistrer qu'Enzo
// a constaté un paiement reçu par un autre moyen (virement, espèces,
// remise en main propre...) et faire avancer le statut en conséquence.
// `Payment.provider` reste `null` tant qu'aucun prestataire n'est branché
// — voir schema.prisma, le champ existe précisément pour ce cas.
export async function markPaymentReceived(galleryId: string): Promise<void> {
  const gallery = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });
  if (gallery.status !== "PAYMENT_PENDING") return; // idempotent, garde-fou

  const selectedCount = await prisma.selectionItem.count({
    where: { photo: { galleryId } },
  });
  const pricing = calculateAmountDue(
    {
      pricingMode: gallery.pricingMode,
      includedPhotosCount: gallery.includedPhotosCount,
      extraPhotoPriceCents: gallery.extraPhotoPriceCents,
      currency: gallery.currency,
    },
    selectedCount,
  );

  const nextStatus = onReadyForRetouch(gallery.status);

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        galleryId,
        amountCents: pricing.amountDueCents,
        currency: pricing.currency,
        status: "PAID",
        paidAt: new Date(),
      },
    }),
    prisma.gallery.update({ where: { id: galleryId }, data: { status: nextStatus } }),
    prisma.statusHistory.create({
      data: {
        galleryId,
        fromStatus: gallery.status,
        toStatus: nextStatus,
        changedBy: "ADMIN",
        note: "Paiement marqué comme reçu manuellement",
      },
    }),
  ]);

  // Notifie le client (brief §30) — sans adresse renseignée, ne fait
  // simplement rien (champ facultatif). Ne bloque jamais le marquage du
  // paiement si l'envoi échoue (voir lib/email/shared.ts).
  if (gallery.clientEmail) {
    await sendPaymentReceivedEmail({
      clientEmail: gallery.clientEmail,
      galleryTitle: gallery.title,
      gallerySlug: gallery.slug,
      amountCents: pricing.amountDueCents,
      currency: pricing.currency,
    });
  }
}

export function listPayments(galleryId: string) {
  return prisma.payment.findMany({
    where: { galleryId },
    orderBy: { createdAt: "desc" },
    select: { id: true, amountCents: true, currency: true, status: true, paidAt: true, createdAt: true },
  });
}
