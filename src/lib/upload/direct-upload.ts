// Utilitaires partagés par tout flux d'envoi direct navigateur → stockage
// (photos de shooting, finaux retouchés, éléments de portfolio autonomes)
// — même besoin partout : déposer un fichier sur une URL signée, en
// limitant le nombre d'envois simultanés. Déplacé le 2026-08-25 depuis
// admin/galleries/[id]/direct-upload-helpers.ts (n'était utilisé que par
// des fichiers de ce dossier jusqu'ici, mais rien ne l'y attache
// vraiment) pour être réutilisable depuis admin/portfolio aussi.

// `contentType` DOIT être exactement la même valeur que celle passée au
// moment de générer l'URL signée (voir *UploadAction) — une URL S3/B2
// présignée avec un Content-Type donné rejette (403, signature invalide)
// toute requête envoyée avec un Content-Type différent, même proche
// (ex. "image/jpg" vs "image/jpeg"). Jamais recalculé ici à partir de
// `file.type` : mieux vaut recevoir explicitement la même valeur que
// risquer une divergence silencieuse.
export async function putDirect(uploadUrl: string, file: File, contentType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!response.ok) {
    throw new Error(`Échec de l'envoi direct (HTTP ${response.status})`);
  }
}

// `shouldStop` (retour d'Enzo, 2026-08-27 : "que ça me bloque tout de
// suite au lieu de tester toutes les photos [...] et donc échouer
// toutes") — vérifié avant CHAQUE nouvel élément, pas seulement au
// démarrage : un worker qui détecte l'arrêt en cours de lot ne prend plus
// de nouvelle photo, mais celles déjà en vol se terminent normalement (on
// ne coupe jamais un envoi déjà commencé). Optionnel, jamais d'arrêt par
// défaut — n'affecte aucun appelant existant.
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
  shouldStop?: () => boolean,
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      if (shouldStop?.()) return;
      const current = items[index];
      index += 1;
      await task(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
