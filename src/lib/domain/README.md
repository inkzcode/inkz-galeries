# `lib/domain`

Logique métier pure, indépendante de Next.js, de la base de données ou de
l'UI. Doit rester testable sans serveur HTTP ni framework.

Fichiers existants :

- `gallery-form.ts` (Milestone 1) — schéma de validation zod du formulaire
  de shooting (création/modification), conversion euros → centimes.
- `gallery-status.ts` (Milestone 1) — libellés français des statuts de
  galerie (Brouillon → … → Livré → Archivé).
- `gallery-status-machine.ts` (Milestone 3) — transitions automatiques
  (une fonction pure par évènement du cycle de vie). Branchées :
  `onFirstPhotoImported` (`lib/services/import-photo.ts`),
  `onSelectionConfirmed`/`onPaymentRequired`/`onReadyForRetouch`
  (`lib/services/confirm-selection-service.ts`, Milestone 4). Le reste du
  cycle (post-production, livraison) reste à brancher.
- `slug.ts` (Milestone 1) — génération d'un slug lisible + suffixe
  aléatoire pour l'URL publique d'une galerie (`/g/<slug>`).
- `pricing.ts` (Milestone 2) — `calculateAmountDue()`, les 4 modes de
  tarification du brief §14, testé avec l'exemple exact du brief (5
  incluses, 9 sélectionnées, 7€/photo ⇒ 28€).
- `watermark-policy.ts` (Milestone 2) — traduction d'un niveau de
  protection (Aucune/Légère/Standard/Renforcée) en paramètres concrets
  (résolution plafond, qualité, opacité, mosaïque). Le rendu réel
  (composition des pixels) vit dans `lib/imaging`, pas ici — ce fichier ne
  fait que décider des valeurs.
- `access-code.ts` (Milestone 3, hachage revu le 2026-08-22) — génération
  d'un code d'accès galerie lisible (sans caractères ambigus) et
  hachage/vérification via HMAC-SHA256 (déterministe, pas bcrypt — permet
  une recherche indexée `WHERE codeHash = ?` pour retrouver la galerie à
  partir du seul PIN, voir commentaire en tête du fichier). Volontairement
  ici et non dans `lib/auth` : ce n'est pas une authentification (pas de
  session, pas de rôle), voir `lib/auth/README.md`. **Seule exception à la
  règle ci-dessous** : lit `SESSION_SECRET` (clé du HMAC) — nécessaire pour
  le hachage. Pas de `server-only` ici volontairement (casserait les tests
  `vitest`, qui tournent en Node pur) — la garde vit une couche au-dessus,
  dans `lib/services/access-code-service.ts` (le seul appelant), qui lui
  est bien marqué `server-only`.
- `selection-summary.ts` (Milestone 3) — habillage d'affichage au-dessus de
  `pricing.ts` ("N sélectionnées — M incluses", brief §6).
- `lightroom-export.ts` (Milestone 3) — liste de noms de fichiers + export
  CSV (brief §17). Branché à l'admin (Milestone 4,
  `selection-export.tsx` — copier/télécharger).
- `photo-note.ts` (Milestone 3, position branchée en UI depuis §6octies) —
  validation d'une demande de retouche (message + position optionnelle
  0..1 sur l'image, brief §7). Un clic dans le lightbox client pose le
  point ; le préprocesseur zod gère explicitement le cas où le champ
  caché n'existe pas dans le DOM (`null`, pas `""`) — même leçon que
  `gallery-form.ts`, testée avec un vrai `FormData`.

- `filename-match.ts` (2026-08-22, généralisé le 2026-08-22) — associe un
  fichier déposé en lot au bon candidat par son nom de fichier (avec repli
  "radical" pour absorber un suffixe d'export Lightroom type `-Edit`) ;
  renvoie `null` plutôt que deviner en cas d'ambiguïté. Utilisé à deux
  endroits : `retouch-workspace.tsx` (finaux retouchés → photo
  sélectionnée) et `photo-upload-form.tsx` (aperçus JPEG → fichiers RAW
  d'origine, import groupé initial).

Tous les fichiers ci-dessus ont des tests (`*.test.ts` colocalisé,
`npm run test`).

Règle : ce dossier ne doit importer ni `next/*`, ni le client Prisma, ni de
SDK de stockage. Il reçoit des données déjà chargées et retourne des
résultats ou des décisions.
