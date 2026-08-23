import "server-only";
import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const TOKEN_TYPE = "gallery_access";

function cookieNameFor(gallerySlug: string): string {
  return `ga_${gallerySlug}`;
}

// Dérive une clé distincte de celle utilisée pour signer la session admin
// (lib/auth/session.ts), plutôt que de réutiliser SESSION_SECRET tel quel.
// Aucune des deux ne peut alors, en cas de compromission, être utilisée
// pour forger un jeton de l'autre — même s'il existe déjà une seconde
// barrière (le payload admin exige `adminId`, le payload galerie exige
// `typ`/`gallerySlug`, donc un jeton de l'un est de toute façon rejeté par
// le vérificateur de l'autre). Pas de nouvelle variable d'environnement à
// gérer : dérivée du même secret via HMAC (revue de sécurité, 2026-08-21).
function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET est manquant. Générer avec `openssl rand -base64 32` et le placer dans .env.local.",
    );
  }
  return createHmac("sha256", secret).update("gallery-access-v1").digest();
}

export async function grantGalleryAccess(gallerySlug: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = await new SignJWT({ typ: TOKEN_TYPE, gallerySlug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(cookieNameFor(gallerySlug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    // Scopé au chemin de CETTE galerie : le navigateur n'envoie même pas ce
    // cookie sur les autres galeries déverrouillées par le même client.
    path: `/g/${gallerySlug}`,
  });
}

export async function hasGalleryAccess(gallerySlug: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieNameFor(gallerySlug))?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload.typ === TOKEN_TYPE && payload.gallerySlug === gallerySlug;
  } catch {
    return false;
  }
}
