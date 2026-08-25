import "server-only";
import { prisma } from "@/lib/db";

// Toute la bibliothèque de messages actifs sur l'image de soi (voir
// prisma/seed-trust-messages.ts pour le contenu) — affichée sur la
// galerie client quand Gallery.selfImageMessagesEnabled est activé.
// Tableau vide si la bibliothèque n'a jamais été peuplée — l'appelant
// doit gérer ce cas sans planter.
//
// Un SEUL message tiré au hasard côté serveur a été essayé (2026-08-22),
// puis rendu déterministe par jour pour éviter qu'il ne change en pleine
// lecture à chaque rafraîchissement de l'aperçu admin. Mais le vrai
// besoin (retour d'Enzo, 2026-08-25) est différent : le message doit
// changer À CHAQUE NAVIGATION entre photos (flèches ou clic sur une
// image), pas par intervalle de temps. Retourner toute la bibliothèque
// ici et choisir CÔTÉ CLIENT selon la photo ouverte (voir
// gallery-view.tsx) répond aux deux à la fois : la liste elle-même ne
// change jamais entre deux rafraîchissements du serveur (rien à
// re-tirer au hasard), et l'affichage change bien avec la navigation
// puisqu'il dépend de l'index de la photo, pas du temps.
export async function getActiveTrustMessages(): Promise<string[]> {
  const messages = await prisma.trustMessage.findMany({
    where: { active: true },
    select: { body: true },
    orderBy: { createdAt: "asc" },
  });
  return messages.map((message) => message.body);
}
