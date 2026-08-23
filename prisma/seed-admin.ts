// Script à lancer une fois (ou après un changement de mot de passe) pour
// créer/mettre à jour le compte photographe. Il n'existe volontairement
// aucun formulaire d'inscription public — un seul admin, provisionné ici.
//
//   ADMIN_EMAIL=dav@example.com ADMIN_PASSWORD=... npm run db:seed-admin
//
// Ne JAMAIS committer de mot de passe réel : les variables sont lues depuis
// l'environnement au moment de l'exécution, jamais stockées en clair.
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "ADMIN_EMAIL et ADMIN_PASSWORD sont requis (variables d'environnement, pas de valeur en dur).",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD doit contenir au moins 8 caractères.");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL est manquant (voir .env.local).");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Compte admin prêt : ${admin.email} (id: ${admin.id})`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
