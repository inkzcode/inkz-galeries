// Deux buckets strictement séparés (voir README.md et brief §12-13).
export type StorageBucket = "originals" | "previews";

// Remarque volontaire sur la forme de cette interface : il n'existe AUCUNE
// méthode qui retourne une URL pour le bucket "originals". C'est structurel,
// pas seulement documentaire — un appelant ne peut physiquement pas obtenir
// d'URL vers un original via cette abstraction ; le seul accès possible est
// getObjectBuffer(), côté serveur uniquement, jamais transmis tel quel au
// client (voir brief §21 : "ne jamais considérer une simple couche
// CSS/HTML comme une protection suffisante" — ici la contrainte est dans
// le typage lui-même).
export type StorageAdapter = {
  putObject(
    bucket: StorageBucket,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void>;
  getObjectBuffer(bucket: StorageBucket, key: string): Promise<Buffer>;
  /** URL (signée ou statique selon l'adapter) pour une preview uniquement. */
  getPreviewUrl(key: string): Promise<string>;
  /**
   * URL pour un téléchargement forcé (brief §18, fichiers finaux). Diffère
   * de getPreviewUrl : sur R2, une URL signée cross-origin sans en-tête
   * dédié laisse le navigateur ignorer l'attribut `download` d'un `<a>` et
   * ouvrir l'image au lieu de la télécharger — cette méthode fixe
   * `Content-Disposition: attachment` côté S3 pour forcer le téléchargement
   * même cross-origin.
   */
  getDownloadUrl(key: string, filename: string): Promise<string>;
  deleteObject(bucket: StorageBucket, key: string): Promise<void>;
};
