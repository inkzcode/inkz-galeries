import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { decryptSession, readSessionCookie } from "./session";

// Data Access Layer — point de passage unique pour vérifier l'authentification
// admin (voir node_modules/next/dist/docs/01-app/02-guides/authentication.md
// et PROJECT_CONTEXT.md §4). À appeler dans chaque page ET chaque Server
// Action protégée, jamais uniquement au niveau d'un layout.
export const verifySession = cache(async () => {
  const cookie = await readSessionCookie();
  const session = await decryptSession(cookie);

  if (!session?.adminId) {
    redirect("/admin/login");
  }

  return { isAuth: true as const, adminId: session.adminId };
});

// Comme verifySession(), mais retourne null au lieu de rediriger — utile
// dans le layout pour distinguer la page de login des pages protégées.
export const getOptionalSession = cache(async () => {
  const cookie = await readSessionCookie();
  return decryptSession(cookie);
});

export const getCurrentAdmin = cache(async () => {
  const session = await verifySession();
  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, name: true },
  });

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
});
