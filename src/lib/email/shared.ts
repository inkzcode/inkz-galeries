import "server-only";
import { Resend } from "resend";

// Commun aux emails transactionnels (brief §30 — 4 emails au total,
// voir README de ce dossier). Chacun dégrade de la même façon sans
// `RESEND_API_KEY` (log d'avertissement, envoi ignoré) et ne fait jamais
// échouer l'action qui le déclenche — l'email est une notification, pas
// une étape critique du parcours.
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY manquant — email "${params.subject}" non envoyé (voir .env.example).`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "Inkz <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({ from, to: params.to, subject: params.subject, html: params.html });
  } catch (error) {
    console.error(`Échec de l'envoi de l'email "${params.subject}" :`, error);
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Gabarit visuel partagé — mêmes couleurs de marque que globals.css
// (--color-brand-red / --color-ink), dupliquées en dur ici puisque les
// emails sont rendus hors de l'app (pas d'accès aux variables CSS chez
// le client de messagerie).
export function buildEmailHtml(params: {
  eyebrow: string;
  heading: string;
  /** Paragraphes déjà prêts à insérer (échapper params.escapeHtml en amont si besoin). */
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const paragraphsHtml = params.paragraphs
    .map((p) => `<p style="font-size:15px;line-height:1.6;color:#3a3a3a;margin:0 0 16px;">${p}</p>`)
    .join("");
  const ctaHtml =
    params.ctaLabel && params.ctaUrl
      ? `<a href="${params.ctaUrl}" style="display:inline-block;background:#b3413e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600;margin-top:8px;">${escapeHtml(params.ctaLabel)}</a>`
      : "";
  const footerHtml = params.footerNote
    ? `<p style="font-size:13px;color:#767676;margin:24px 0 0;">${params.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:32px 16px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#141414;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;">
      <tr>
        <td>
          <p style="font-size:13px;letter-spacing:0.05em;text-transform:uppercase;color:#767676;margin:0 0 8px;">
            ${escapeHtml(params.eyebrow)}
          </p>
          <h1 style="font-size:24px;margin:0 0 16px;">${escapeHtml(params.heading)}</h1>
          ${paragraphsHtml}
          ${ctaHtml}
          ${footerHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
