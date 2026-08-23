import "server-only";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// Hash statique valide mais correspondant à aucun mot de passe réel — sert à
// égaliser le temps de réponse du login quand l'email n'existe pas, pour ne
// pas laisser un minuscule écart de timing révéler si un compte existe.
const DUMMY_HASH =
  "$2b$12$OqyjU.UTVQazlZySxbip3.g5VFzbui411GcSiQ7Lowx5TuEdS.sva";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash?: string | null) {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
