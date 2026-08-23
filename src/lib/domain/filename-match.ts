// Associe un fichier déposé en lot à une entrée candidate par son nom de
// fichier — utilisé à deux endroits : import groupé des finaux retouchés
// (`retouch-workspace.tsx`, associe un fichier à la bonne photo
// sélectionnée) et import groupé des photos originales (`photo-upload-form.tsx`,
// associe un aperçu JPEG exporté à son fichier RAW d'origine). Un même
// besoin dans les deux cas : "quel fichier va avec quel autre", jamais
// deviné en cas d'ambiguïté.
//
// Un export Lightroom renomme souvent le fichier (suffixe "-Edit",
// "_retouche", etc.) — une correspondance stricte sur le nom complet ne
// suffit donc pas. Stratégie : nom complet exact d'abord, puis "radical"
// (nom sans extension, sans espaces/tirets/underscores) contenu dans
// l'autre. En cas d'ambiguïté (plusieurs candidats possibles), on renvoie
// `null` plutôt que de deviner — mieux vaut laisser Enzo résoudre à la main
// qu'importer un fichier sur la mauvaise photo.
function stem(filename: string): string {
  return filename
    .replace(/\.[^./]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function matchFilename(
  candidates: readonly { id: string; filename: string }[],
  uploadedFilename: string,
): string | null {
  const exact = candidates.find(
    (c) => c.filename.toLowerCase() === uploadedFilename.toLowerCase(),
  );
  if (exact) return exact.id;

  const uploadedStem = stem(uploadedFilename);
  if (!uploadedStem) return null;

  const partial = candidates.filter((c) => {
    const candidateStem = stem(c.filename);
    return (
      candidateStem.length > 0 &&
      (uploadedStem.startsWith(candidateStem) || candidateStem.startsWith(uploadedStem))
    );
  });

  return partial.length === 1 ? partial[0].id : null;
}
