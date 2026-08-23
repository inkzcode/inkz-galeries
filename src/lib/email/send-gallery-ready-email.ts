import "server-only";
import { Resend } from "resend";

// Notification "galerie prête" (retour d'Enzo, 2026-08-22 : le client
// n'a aucun moyen de savoir que ses photos sont prêtes sans revenir de
// lui-même sur son lien). Via Resend (resend.com), offre gratuite (100
// emails/jour, aucune carte requise) — cohérent avec la politique de
// coût quasi nul du projet (voir PROJECT_CONTEXT.md §12).
//
// Dégradation volontaire : sans `RESEND_API_KEY`, on ne fait qu'avertir
// en log et on continue — l'import du dernier fichier final (le
// déclencheur de cet email) ne doit jamais échouer à cause d'un email
// non configuré. Même principe que le stockage local de secours
// (lib/storage/client.ts) quand R2 n'est pas configuré.
export async function sendGalleryReadyEmail(params: {
  clientEmail: string;
  galleryTitle: string;
  gallerySlug: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY manquant — email de notification 'galerie prête' non envoyé (voir .env.example).",
    );
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "Inkz <onboarding@resend.dev>";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const galleryUrl = `${siteUrl}/g/${params.gallerySlug}`;

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to: params.clientEmail,
      subject: `${params.galleryTitle} — tes photos sont prêtes ✨`,
      html: buildEmailHtml({ galleryTitle: params.galleryTitle, galleryUrl }),
    });
  } catch (error) {
    // Ne jamais faire échouer l'import du final à cause d'un email —
    // l'essentiel (le fichier livré) a déjà réussi à ce stade.
    console.error("Échec de l'envoi de l'email 'galerie prête' :", error);
  }
}

function buildEmailHtml({
  galleryTitle,
  galleryUrl,
}: {
  galleryTitle: string;
  galleryUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:32px 16px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#141414;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;">
      <tr>
        <td>
          <p style="font-size:13px;letter-spacing:0.05em;text-transform:uppercase;color:#767676;margin:0 0 8px;">
            ${escapeHtml(galleryTitle)}
          </p>
          <h1 style="font-size:24px;margin:0 0 16px;">Tes photos sont prêtes ✨</h1>
          <p style="font-size:15px;line-height:1.6;color:#3a3a3a;margin:0 0 24px;">
            Tes photographies finales, en haute définition et sans filigrane,
            t'attendent sur ta galerie privée.
          </p>
          <a href="${galleryUrl}" style="display:inline-block;background:#b3413e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600;">
            Voir mes photos
          </a>
          <p style="font-size:13px;color:#767676;margin:24px 0 0;">
            Le code d'accès reçu précédemment reste valable.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
