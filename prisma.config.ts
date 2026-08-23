// Configuration du CLI Prisma 7 — remplace le `datasource { url }` qui
// vivait auparavant dans schema.prisma (voir PROJECT_CONTEXT.md §4bis).
// Ce fichier ne concerne que les commandes `prisma generate|migrate|studio`,
// pas le runtime de l'application (voir src/lib/db.ts pour le client utilisé
// par Next.js, qui passe par l'adapter Neon).
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
