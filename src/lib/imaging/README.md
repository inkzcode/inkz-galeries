# `lib/imaging`

Transformation d'images pure (buffer → buffer), via `sharp`. Ne touche ni à
Prisma ni au stockage — reçoit un buffer JPEG déjà décodé (voir
PROJECT_CONTEXT.md §2 : les previews sont générées à partir d'un export
JPEG fourni par le photographe, pas d'un décodage RAW côté serveur) et
retourne un buffer traité.

Pipeline (brief §12-13) : `resize → (watermark rendu dans les pixels) →
ré-encodage JPEG`. Les paramètres concrets (résolution, qualité, opacité,
répétition) viennent de `lib/domain/watermark-policy.ts` — ce dossier ne
fait qu'exécuter le plan, il ne décide pas des valeurs.

Fichiers :

- `generate-preview.ts` — `generatePreview(sourceBuffer, options)`. Le
  filigrane est rendu en superposant un SVG (texte) sur l'image avant
  ré-encodage : il fait donc partie des pixels de sortie, pas d'une couche
  CSS/HTML (voir brief §12, exigence explicite). Une légère variation
  aléatoire mais déterministe (`seed`, typiquement l'id de la photo) est
  appliquée à la position/rotation du texte pour rendre une suppression
  automatisée en masse un peu plus difficile — jamais présenté comme une
  protection infranchissable (voir `WATERMARK_DISCLAIMER` dans
  `lib/domain/watermark-policy.ts`).

Testé avec de vraies images générées à la volée par `sharp` lui-même (voir
`generate-preview.test.ts`) — aucune dépendance à un service externe,
fonctionne dans n'importe quel environnement avec Node.
