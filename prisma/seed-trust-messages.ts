// Script à lancer une fois pour peupler la bibliothèque de messages sur
// l'image de soi (Gallery.selfImageMessagesEnabled → un message tiré au
// hasard parmi ceux actifs, voir lib/services/trust-message-service.ts).
// Contenu jamais rédigé jusqu'ici (schéma prêt, brief le mentionne comme
// "à rédiger séparément") — rédigé par défaut le 2026-08-22 à la demande
// d'Enzo. DESTINÉ À ÊTRE MODIFIÉ/COMPLÉTÉ PAR ENZO — premier jet, pas
// définitif. Réexécuter ce script est sans risque : upsert par `theme`
// (pas de doublons).
//
//   npm run db:seed-trust-messages
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

config({ path: ".env.local" });

const MESSAGES: { theme: string; body: string }[] = [
  {
    theme: "confiance",
    body: "Vous n'avez pas besoin d'être parfait·e devant l'objectif — juste vous-même. C'est souvent ce qu'on retient le plus sur une photo.",
  },
  {
    theme: "regard",
    body: "On est rarement objectif sur sa propre image. Faites-moi confiance : ce que vous voyez comme un défaut est souvent ce qui rend la photo vivante.",
  },
  {
    theme: "retouche",
    body: "La retouche sert à sublimer la lumière et les couleurs, pas à changer qui vous êtes. Votre visage, vos formes, vos traits restent les vôtres.",
  },
  {
    theme: "authenticité",
    body: "Une belle photo n'est pas une photo sans défaut — c'est une photo où on vous reconnaît, sourire compris.",
  },
  {
    theme: "confort",
    body: "Si une pose ou une expression vous met mal à l'aise en la revoyant, ne la sélectionnez pas. Cette galerie est faite pour que vous choisissiez librement.",
  },
  {
    theme: "temps",
    body: "Il est normal de ne pas s'aimer sur toutes les photos d'une séance. Prenez le temps de les revoir à tête reposée avant de choisir.",
  },
  {
    theme: "lumière",
    body: "La même personne peut sembler complètement différente selon la lumière et l'angle — ça ne dit rien sur vous, juste sur la photo.",
  },
  {
    theme: "bienveillance",
    body: "Mon objectif n'est pas de vous rendre parfait·e, mais de capturer un moment où vous vous sentez bien.",
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL est manquant (voir .env.local).");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });

  for (const { theme, body } of MESSAGES) {
    const existing = await prisma.trustMessage.findFirst({ where: { theme } });
    if (existing) {
      await prisma.trustMessage.update({ where: { id: existing.id }, data: { body } });
    } else {
      await prisma.trustMessage.create({ data: { theme, body } });
    }
  }

  console.log(`${MESSAGES.length} messages prêts (créés ou mis à jour par thème).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
