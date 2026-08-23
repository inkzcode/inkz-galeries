import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Patron officiel Next.js pour les sessions "stateless" (voir
// node_modules/next/dist/docs/01-app/02-guides/authentication.md et
// PROJECT_CONTEXT.md §4). Cookie httpOnly signé, jamais de session côté
// base de données pour l'instant — un seul compte admin, pas besoin de
// pouvoir révoquer des sessions individuellement en V1.

export const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours — usage perso sur appareil de confiance

export type SessionPayload = {
  adminId: string;
  expiresAt: number;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET est manquant. Générer avec `openssl rand -base64 32` et le placer dans .env.local.",
    );
  }
  return new TextEncoder().encode(secret);
}

async function encryptSession(payload: SessionPayload) {
  return new SignJWT({ adminId: payload.adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(getSecretKey());
}

export async function decryptSession(
  session: string | undefined,
): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.adminId !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    return { adminId: payload.adminId, expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}

export async function createSession(adminId: string) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const session = await encryptSession({ adminId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function readSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}
