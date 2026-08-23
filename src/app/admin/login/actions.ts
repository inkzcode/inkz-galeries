"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { LoginFormSchema, type LoginFormState } from "@/lib/auth/definitions";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rate-limit";

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validated = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: "Adresse email ou mot de passe manquant." };
  }

  const { email, password } = validated.data;

  // Limitation des tentatives (brief §21) — un seul compte admin, mais rien
  // n'empêchait auparavant un brute-force illimité sur son mot de passe.
  const attemptKey = `admin-login:${await getClientIp()}`;
  if (isRateLimited(attemptKey)) {
    return { error: "Trop de tentatives — réessayer dans quelques minutes." };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const isValid = await verifyPassword(password, admin?.passwordHash);

  if (!admin || !isValid) {
    recordFailedAttempt(attemptKey);
    return { error: "Identifiants incorrects." };
  }

  clearAttempts(attemptKey);
  await createSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
