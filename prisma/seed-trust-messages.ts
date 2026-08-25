// Script à lancer pour (re)peupler la bibliothèque de messages sur
// l'image de soi (Gallery.selfImageMessagesEnabled → un message tiré
// parmi ceux actifs, voir lib/services/trust-message-service.ts).
// Contenu définitif rédigé par Enzo le 2026-08-25 — remplace le premier
// jet du 2026-08-22. Réexécuter ce script REMPLACE tout le contenu
// existant (delete + recreate) plutôt qu'un simple upsert : contrairement
// au premier jet, cette liste n'est pas censée coexister avec d'autres
// messages, elle les remplace entièrement.
//
//   npm run db:seed-trust-messages
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

config({ path: ".env.local" });

const MESSAGES: string[] = [
  "Votre reflet n'est pas plus « vrai » que votre photo. Il est simplement plus familier.",
  "Une expérience de Mita, Dermer & Knight (1977) a montré que les participants préféraient généralement leur visage en miroir, tandis que leurs proches préféraient davantage leur visage tel qu'il apparaît réellement aux autres.",
  "Une photo fige une fraction de seconde d'un visage que vous voyez habituellement en mouvement. Il est normal que la sensation soit différente.",
  "Votre visage n'est pas une image fixe. Une photo n'en capture qu'une possibilité parmi des milliers.",
  "Votre cerveau n'est pas un appareil photo. L'image mentale que vous avez de votre propre visage est reconstruite par votre mémoire.",
  "Votre perception de vous-même n'est pas une mesure objective. C'est un regard façonné par votre histoire et vos habitudes.",
  "Plus vous fixez un petit détail, plus il peut finir par vous sembler important.",
  "Une photographie peut vous surprendre sans pour autant mal vous représenter.",
  "Vous connaissez extrêmement bien votre propre visage. Vous pouvez donc remarquer de minuscules différences auxquelles personne d'autre ne prêtera attention.",
  "Vous analysez probablement votre propre photo d'une manière dont vous n'analyseriez jamais celle de quelqu'un que vous aimez.",
  "Avant de chercher ce que vous voudriez corriger, cherchez une chose que vous voudriez garder exactement comme elle est.",
  "Vous avez déjà entendu quelqu'un que vous trouvez magnifique dire qu'il déteste une photo de lui ? Vous n'êtes probablement pas l'exception.",
  "Imaginez que cette photo soit celle de votre meilleur·e ami·e. Lui parleriez-vous comme vous vous parlez en la regardant ?",
  "Quelqu'un qui vous aime ne compte probablement pas les petits détails que vous êtes en train de compter.",
  "Une mauvaise photo de vous ne prouve pas que vous êtes « mauvais·e en photo ». Elle montre simplement qu'une fraction de seconde n'a pas fonctionné.",
  "Même les modèles professionnels ne gardent pas chaque photo. Le tri fait partie de la photographie.",
  "Il n'y a rien d'anormal à préférer 5 images sur 100. C'est précisément pour ça qu'on en prend 100.",
  "Vous n'avez pas raté votre shooting simplement parce que certaines photos ne vous plaisent pas.",
  "Une photo n'est jamais simplement « à quoi je ressemble ». C'est aussi l'endroit où était l'appareil, la lumière présente et l'instant précis où j'ai déclenché.",
  "Trouvez trois choses que vous aimez avant d'en chercher une que vous changeriez.",
  "Vous n'avez pas besoin d'être parfait·e pour être magnifique dans une image.",
  "Il y a des photos qu'on aime immédiatement et d'autres qu'on apprend à aimer.",
  "Parfois, la photo que vous n'auriez jamais choisie est celle que quelqu'un d'autre préfère de vous.",
  "Vous comparez peut-être cette photo non retouchée aux images finales de quelqu'un d'autre. Ce n'est pas une comparaison très équitable.",
  "Soyez sympa avec la personne sur cette photo. Vous la connaissez bien.",
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

  await prisma.trustMessage.deleteMany({});
  await prisma.trustMessage.createMany({
    data: MESSAGES.map((body, index) => ({ theme: `message-${index + 1}`, body })),
  });

  console.log(`${MESSAGES.length} messages remplacés.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
