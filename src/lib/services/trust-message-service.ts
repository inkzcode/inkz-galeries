import "server-only";
import { prisma } from "@/lib/db";

// Un message choisi parmi ceux actifs — affiché sur la galerie client
// quand Gallery.selfImageMessagesEnabled est activé (voir
// prisma/seed-trust-messages.ts pour le contenu). `null` si la
// bibliothèque est vide (galerie créée avant le seed, ou toujours pas
// exécuté) — l'appelant doit gérer ce cas sans planter.
//
// Le choix est déterministe (galerie + jour), pas vraiment aléatoire à
// chaque appel : la page `/g/[slug]` est un Server Component, donc tout
// rafraîchissement (aperçu admin en direct, revalidation) ré-exécute
// cette fonction — un vrai tirage aléatoire ferait changer le message
// visible en pleine lecture (retour d'Enzo, 2026-08-22 : "je ne veux pas
// que les petits conseils changent toutes les x secondes"). Il tourne
// quand même naturellement d'une visite à l'autre sur plusieurs jours.
export async function getRandomActiveTrustMessage(gallerySeed: string): Promise<string | null> {
  const count = await prisma.trustMessage.count({ where: { active: true } });
  if (count === 0) return null;

  const dayKey = new Date().toISOString().slice(0, 10);
  const skip = hashToIndex(`${gallerySeed}:${dayKey}`, count);
  const [message] = await prisma.trustMessage.findMany({
    where: { active: true },
    select: { body: true },
    skip,
    take: 1,
  });
  return message?.body ?? null;
}

function hashToIndex(input: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % count;
}
