import "server-only";
import { buildEmailHtml, sendTransactionalEmail } from "./shared";

// Notification "galerie prête" (retour d'Enzo, 2026-08-22 : le client
// n'a aucun moyen de savoir que ses photos sont prêtes sans revenir de
// lui-même sur son lien). Via Resend (resend.com), offre gratuite (100
// emails/jour, aucune carte requise) — cohérent avec la politique de
// coût quasi nul du projet (voir PROJECT_CONTEXT.md §12).
export async function sendGalleryReadyEmail(params: {
  clientEmail: string;
  galleryTitle: string;
  gallerySlug: string;
}): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const galleryUrl = `${siteUrl}/g/${params.gallerySlug}`;

  await sendTransactionalEmail({
    to: params.clientEmail,
    subject: `${params.galleryTitle} — tes photos sont prêtes ✨`,
    html: buildEmailHtml({
      eyebrow: params.galleryTitle,
      heading: "Tes photos sont prêtes ✨",
      paragraphs: [
        "Tes photographies finales, en haute définition et sans filigrane, t'attendent sur ta galerie privée.",
      ],
      ctaLabel: "Voir mes photos",
      ctaUrl: galleryUrl,
      footerNote: "Le code d'accès reçu précédemment reste valable.",
    }),
  });
}
