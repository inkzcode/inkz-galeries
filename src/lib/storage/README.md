# `lib/storage`

Tout ce qui parle au stockage objet (Cloudflare R2, compatible S3).

Deux préfixes/buckets strictement séparés, dès la conception :

- `originals/` — fichiers RAW, jamais exposés publiquement, jamais servis
  directement au navigateur.
- `previews/` — JPEG/WebP générés, avec ou sans watermark selon la galerie
  (clé `preview.*`), **et aussi les fichiers finaux livrés au client** (clé
  `final.*`, jamais retraités/watermarkés — voir
  `lib/services/final-delivery-service.ts`, Milestone 5). Pas de troisième
  bucket séparé pour les finaux : même besoin d'URL signée/temporaire que
  les previews, contrairement aux originaux.

Fichiers existants (Milestone 2) :

- `types.ts` — interface `StorageAdapter`. Volontairement dépourvue de toute
  méthode retournant une URL pour `originals` : seul `getObjectBuffer()`
  (côté serveur) permet d'y accéder. C'est une contrainte structurelle, pas
  juste une convention. `getPreviewUrl()` (aperçu inline) et
  `getDownloadUrl()` (Milestone 5, téléchargement forcé même cross-origin
  via `Content-Disposition`) sont deux méthodes distinctes exprès — les
  confondre casse soit l'aperçu `<img>`, soit le téléchargement.
- `keys.ts` — `buildPhotoObjectKey()`, convention de nommage
  `galleryId/photoId/kind.ext`.
- `local-adapter.ts` — implémentation de secours pour le développement,
  zéro coût, aucun compte externe requis. Écrit sous `.local-storage/`
  (originals, jamais dans `public/`) et `public/dev-previews/` (previews,
  servies statiquement par Next). Les deux dossiers sont gitignored.
- `r2-adapter.ts` — vrai client S3 pour Cloudflare R2 (`@aws-sdk/client-s3`),
  URLs de preview signées et temporaires (1h) via
  `@aws-sdk/s3-request-presigner`. **Pas encore testé contre un vrai
  compte R2** (aucun compte provisionné dans cet environnement) — écrit
  structurellement comme `src/lib/db.ts`/Prisma, à vérifier dès qu'un
  compte existe.
- `client.ts` — `getStorageAdapter()` choisit automatiquement R2 (si les
  variables `R2_*` sont présentes) ou le stockage local de dev sinon. Lève
  une erreur si R2 est absent en production (`NODE_ENV === "production"`).

Règle : aucune route publique ne doit jamais retourner un chemin ou une URL
pointant directement vers `originals/` — et avec `types.ts` tel qu'écrit,
ce n'est même pas possible par accident.
