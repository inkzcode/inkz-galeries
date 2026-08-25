// Convention de nommage des clés objet — une clé par galerie/photo/nature
// de fichier, pour éviter toute collision ou fuite entre galeries (brief
// §12). Logique pure, testable sans stockage réel.

export type PhotoObjectKind = "original" | "preview" | "final" | "preview-source";

// L'extension vient in fine d'un nom de fichier fourni par l'utilisateur
// (upload). Ne garder que [a-z0-9] : une extension "jpg/../../etc" ne doit
// jamais pouvoir influencer le chemin final, en particulier pour
// local-adapter.ts qui fait un vrai path.join() sur cette clé (brief §21 —
// "validation des fichiers uploadés").
function sanitizeExtension(extension: string): string {
  const cleaned = extension
    .toLowerCase()
    .replace(/^\.+/, "")
    .replace(/[^a-z0-9]/g, "");
  return cleaned || "bin";
}

export function buildPhotoObjectKey(params: {
  galleryId: string;
  photoId: string;
  kind: PhotoObjectKind;
  extension: string;
}): string {
  const { galleryId, photoId, kind, extension } = params;
  return `${galleryId}/${photoId}/${kind}.${sanitizeExtension(extension)}`;
}

// Éléments de portfolio autonomes (pas de galerie/shooting associé, voir
// PortfolioItem dans schema.prisma) — préfixe distinct pour ne jamais
// pouvoir collisionner avec une clé `{galleryId}/...` existante.
export function buildPortfolioItemObjectKey(params: {
  itemId: string;
  extension: string;
}): string {
  return `portfolio/${params.itemId}/image.${sanitizeExtension(params.extension)}`;
}
