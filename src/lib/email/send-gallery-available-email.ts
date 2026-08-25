import "server-only";
import { buildEmailHtml, escapeHtml, sendTransactionalEmail } from "./shared";

// Notification "galerie disponible" (brief §30) — déclenchée quand Enzo
// génère un code d'accès pour une galerie qui a une adresse client
// renseignée (voir access-code-actions.ts). Remplace l'envoi manuel du
// code par SMS/message qu'il faisait jusqu'ici ; le code reste
// affiché dans l'admin aussi, pour le cas où l'email n'arrive pas.
export async function sendGalleryAvailableEmail(params: {
  clientEmail: string;
  galleryTitle: string;
  gallerySlug: string;
  accessCode: string;
}): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const galleryUrl = `${siteUrl}/g/${params.gallerySlug}`;

  await sendTransactionalEmail({
    to: params.clientEmail,
    subject: `${params.galleryTitle} — ta galerie est disponible 📷`,
    html: buildEmailHtml({
      eyebrow: params.galleryTitle,
      heading: "Ta galerie t'attend",
      paragraphs: [
        "Tes photos sont en ligne : tu peux dès maintenant les parcourir et faire ta sélection.",
        `Code d'accès : <strong style="letter-spacing:2px;">${escapeHtml(params.accessCode)}</strong>`,
      ],
      ctaLabel: "Voir ma galerie",
      ctaUrl: galleryUrl,
      footerNote: "Aucun compte à créer — entre simplement ce code sur la page d'accès.",
    }),
  });
}
