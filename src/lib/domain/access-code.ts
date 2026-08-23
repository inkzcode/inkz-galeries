import { createHmac, timingSafeEqual } from "node:crypto";

// Code d'accès galerie (brief §4, §21) — un secret court partagé avec le
// client, jamais un compte. `AccessCode.codeHash` en base, jamais en clair
// (voir PROJECT_CONTEXT.md §11).
//
// Hachage déterministe (HMAC-SHA256), pas bcrypt : contrairement à un mot
// de passe choisi par un humain, ce code est généré aléatoirement par le
// système avec une entropie déjà suffisante (32^6 combinaisons) — le
// ralentissement volontaire de bcrypt protège contre un brute-force
// hors-ligne de mots de passe faibles, un problème qui ne s'applique pas
// ici, mais empêche toute recherche indexée (chaque vérification aurait dû
// comparer le code contre tous les codes de toutes les galeries en base).
// Un HMAC déterministe donne le même niveau de protection pour ce cas
// d'usage tout en permettant `WHERE codeHash = ?` en O(1) — nécessaire
// pour retrouver la bonne galerie à partir du seul PIN saisi sur `/g`
// (voir PROJECT_CONTEXT.md, revu suite au retour d'Enzo : le parcours
// "lien + code" initialement construit ne correspondait pas à l'usage
// prévu, un PIN seul).

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // sans caractères ambigus (0/o, 1/l/i)

export function generateAccessCodePlaintext(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function normalize(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, "");
}

function secretKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET est manquant. Générer avec `openssl rand -base64 32` et le placer dans .env.local.",
    );
  }
  return secret;
}

export function hashAccessCode(plaintext: string): string {
  return createHmac("sha256", secretKey()).update(normalize(plaintext)).digest("hex");
}

export function verifyAccessCode(plaintext: string, hash: string): boolean {
  const candidate = Buffer.from(hashAccessCode(plaintext), "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(hash, "hex");
  } catch {
    return false;
  }
  if (candidate.length !== actual.length) return false;
  return timingSafeEqual(candidate, actual);
}
