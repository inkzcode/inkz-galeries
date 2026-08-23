import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Singleton Prisma — évite d'ouvrir une nouvelle connexion à chaque rechargement
// à chaud en développement (patron standard Next.js + Prisma).
declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est manquant. Copier .env.example vers .env.local et renseigner la chaîne de connexion Neon.",
    );
  }
  // `PrismaNeon` (pool WebSocket), pas `PrismaNeonHttp` : essayé le
  // 2026-08-21 pour éviter les connexions qui deviennent obsolètes quand
  // le compute Neon (offre gratuite) se met en veille après une période
  // d'inactivité — mais `PrismaNeonHttp` ne supporte AUCUNE forme de
  // `$transaction` (même la forme tableau/batch, utilisée par
  // `confirm-selection-service.ts`, `payment-service.ts` et
  // `final-delivery-service.ts` pour garder statut + historique
  // cohérents) : `Error: Transactions are not supported in HTTP mode`,
  // confirmé en conditions réelles — casse la confirmation de sélection
  // côté client à 100%, un bug bien plus grave que le confort d'un
  // message d'erreur plus clair en cas de coupure réseau. Revenu sur
  // `PrismaNeon` en conséquence (voir PROJECT_CONTEXT.md).
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
