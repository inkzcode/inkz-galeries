# `lib/storage`

Tout ce qui parle au stockage objet (Cloudflare R2, compatible S3).

Deux préfixes/buckets strictement séparés, dès la conception :

- `originals/` — fichiers RAW, jamais exposés publiquement, jamais servis
  directement au navigateur.
- `previews/` — JPEG/WebP générés, avec ou sans watermark selon la galerie.

Exemples à venir :

- `client.ts` — client S3 configuré pour R2 (credentials via variables
  d'environnement, jamais en dur).
- `signed-url.ts` — génération d'URLs signées temporaires (upload et
  téléchargement).
- `keys.ts` — convention de nommage des clés objet (par galerie / par photo)
  pour éviter toute collision ou fuite entre galeries.

Règle : aucune route publique ne doit jamais retourner un chemin ou une URL
pointant directement vers `originals/`.
