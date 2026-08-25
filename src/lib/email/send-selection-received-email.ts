import "server-only";
import { buildEmailHtml, sendTransactionalEmail } from "./shared";

// Notification "sélection reçue" (brief §30) — vers ENZO, pas le client :
// c'est lui qui doit agir (retoucher, ou attendre le paiement). Déclenchée
// dans confirm-selection-service.ts quand le client verrouille sa
// sélection.
export async function sendSelectionReceivedEmail(params: {
  adminEmail: string;
  galleryId: string;
  galleryTitle: string;
  selectedCount: number;
  amountDueCents: number;
  currency: string;
}): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const adminUrl = `${siteUrl}/admin/galleries/${params.galleryId}`;
  const requiresPayment = params.amountDueCents > 0;

  await sendTransactionalEmail({
    to: params.adminEmail,
    subject: `${params.galleryTitle} — sélection reçue`,
    html: buildEmailHtml({
      eyebrow: params.galleryTitle,
      heading: "Sélection reçue",
      paragraphs: [
        `${params.selectedCount} photo${params.selectedCount > 1 ? "s" : ""} sélectionnée${params.selectedCount > 1 ? "s" : ""}.`,
        requiresPayment
          ? `Paiement en attente : ${(params.amountDueCents / 100).toFixed(2)} ${params.currency}.`
          : "Aucun paiement requis — prêt pour la retouche.",
      ],
      ctaLabel: "Voir le shooting",
      ctaUrl: adminUrl,
    }),
  });
}
