import "server-only";
import { prisma } from "@/lib/db";
import { generateAccessCodePlaintext, hashAccessCode } from "@/lib/domain/access-code";

// Émet un nouveau code d'accès pour une galerie. Le texte en clair n'est
// JAMAIS stocké — retourné une seule fois pour que l'admin puisse le
// transmettre au client (email, SMS...), voir brief §4/§21.
export async function issueAccessCode(galleryId: string, expiresAt?: Date) {
  const plaintext = generateAccessCodePlaintext();
  const codeHash = hashAccessCode(plaintext);
  await prisma.accessCode.create({
    data: { galleryId, codeHash, expiresAt },
  });
  return plaintext;
}

// Métadonnées seulement (jamais codeHash) — voir la règle DAL/DTO en §4 de
// PROJECT_CONTEXT.md : ne jamais faire transiter un champ sensible vers un
// composant qui pourrait l'exposer au client.
export function listAccessCodes(galleryId: string) {
  return prisma.accessCode.findMany({
    where: { galleryId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
}

// Retrouve la galerie propriétaire d'un code, sans connaître son slug au
// préalable — c'est ce qui permet le parcours "PIN seul" sur `/g` (pas de
// lien à transmettre, brief §4 : "aucun compte à créer", et retour d'Enzo
// du 2026-08-21 : le parcours "lien + code" ne correspondait pas à l'usage
// prévu). Rendu possible par le hachage déterministe de `hashAccessCode`
// (`WHERE codeHash = ?`, indexé) — voir `lib/domain/access-code.ts`.
export async function findGalleryByAccessCode(submittedCode: string) {
  const codeHash = hashAccessCode(submittedCode);
  const accessCode = await prisma.accessCode.findUnique({
    where: { codeHash },
    include: { gallery: true },
  });
  if (!accessCode) return null;
  if (accessCode.expiresAt && accessCode.expiresAt < new Date()) return null;

  await prisma.accessCode.update({
    where: { id: accessCode.id },
    data: { lastUsedAt: new Date() },
  });
  return accessCode.gallery;
}

// Variante utilisée par `/g/<slug>` (lien direct optionnel, encore
// supporté) : mêmes vérifications que `findGalleryByAccessCode`, plus la
// confirmation que le code appartient bien à LA galerie de l'URL — ne
// distingue jamais "galerie inconnue"/"code d'une autre galerie" de "code
// incorrect" dans la réponse (évite de confirmer l'existence d'un slug par
// timing/énumération).
export async function verifyGalleryAccessCode(gallerySlug: string, submittedCode: string) {
  const gallery = await findGalleryByAccessCode(submittedCode);
  if (!gallery || gallery.slug !== gallerySlug) return null;
  return gallery;
}
