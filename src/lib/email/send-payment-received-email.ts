import "server-only";
import { buildEmailHtml, sendTransactionalEmail } from "./shared";

// Notification "paiement reçu" (brief §30) — vers le client, déclenchée
// dans payment-service.ts quand Enzo marque un paiement comme reçu
// (virement, espèces... pas d'intégration Stripe réelle, voir
// payment-service.ts). Confirme le montant et que la retouche démarre.
export async function sendPaymentReceivedEmail(params: {
  clientEmail: string;
  galleryTitle: string;
  gallerySlug: string;
  amountCents: number;
  currency: string;
}): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const galleryUrl = `${siteUrl}/g/${params.gallerySlug}`;

  await sendTransactionalEmail({
    to: params.clientEmail,
    subject: `${params.galleryTitle} — paiement reçu`,
    html: buildEmailHtml({
      eyebrow: params.galleryTitle,
      heading: "Paiement bien reçu",
      paragraphs: [
        `${(params.amountCents / 100).toFixed(2)} ${params.currency} reçus, merci !`,
        "La retouche de tes photos sélectionnées commence — tu seras prévenu·e dès qu'elles seront prêtes.",
      ],
      ctaLabel: "Voir ma galerie",
      ctaUrl: galleryUrl,
    }),
  });
}
