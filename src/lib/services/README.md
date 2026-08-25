# `lib/services`

Orchestration : combine `lib/domain` (règles métier), `lib/storage` (fichiers)
et l'accès aux données (Prisma) pour réaliser une action complète.

Fichiers existants :

- `gallery-service.ts` (Milestone 1) — `createGallery`, `updateGallery`,
  `listGalleries` (exclut `ARCHIVED`), `listArchivedGalleries`,
  `getGalleryById`, `listGalleryPhotos`, `deleteGallery` (définitif),
  `archiveGallery`/`unarchiveGallery` (brief §32 — réversible, purement
  organisationnel, ne touche jamais le stockage objet ; seul un shooting
  `DELIVERED` peut être archivé, et désarchiver y revient toujours),
  `setPortfolioCoverPhoto` (brief §1 — refuse toute photo sans `finalKey`,
  voir `portfolio-service.ts` côté lecture publique). Reçoit une entrée
  déjà validée par `lib/domain/gallery-form.ts` et fait les
  écritures/lectures Prisma.
- `import-photo.ts` (Milestone 2) — `importPhoto()` : stocke l'original
  (bucket `originals`), génère une preview watermarkée via
  `lib/imaging/generate-preview.ts` selon `lib/domain/watermark-policy.ts`,
  la stocke (bucket `previews`), crée la ligne `Photo`, et définit
  automatiquement la première photo importée comme couverture (brief §3).
  Branché à une UI d'upload sur `/admin/galleries/[id]`.
- `access-code-service.ts` (Milestone 3) — `issueAccessCode()` (génère +
  hache + stocke, retourne le texte en clair une seule fois),
  `verifyGalleryAccessCode()` (vérifie un code saisi côté client contre les
  codes d'UNE galerie précise, identifiée par son slug — voir §6quater
  point 1 de PROJECT_CONTEXT.md pour pourquoi ce n'est pas "code seul,
  n'importe quelle galerie"), `listAccessCodes()` (métadonnées uniquement,
  jamais `codeHash`). Branché des deux côtés : émission dans l'admin,
  vérification sur `/g/[slug]`.
- `public-gallery-service.ts` (Milestone 3) — `getPublicGalleryBySlug()` :
  DTO explicite pour la vue client, ne sélectionne que les champs sûrs
  (jamais `originalKey`, `clientEmail`, etc. — voir la Data Access
  Layer/DTO au §4 de PROJECT_CONTEXT.md).
- `selection-service.ts` (Milestone 3) — `toggleSelection()` : revérifie
  que la photo appartient bien à la galerie de la session (protection
  contre les accès entre galeries, brief §21), respecte
  `selectionLockedAt`.
- `photo-note-service.ts` (Milestone 3) — `addClientPhotoNote()` (même
  garde-fou d'appartenance galerie/photo que `selection-service.ts`),
  `listPhotoNotes()`, `listGalleryPhotoNotes()` (vue admin, une requête
  pour toute la galerie plutôt qu'une par photo).
- `confirm-selection-service.ts` (Milestone 4) — `confirmSelection()`
  (verrouille, calcule le montant dû via `lib/domain/pricing.ts`, fait
  avancer le statut via `lib/domain/gallery-status-machine.ts`, idempotent),
  `unlockSelection()` (déverrouillage manuel admin, brief §15),
  `getSelectedPhotos()` (pour l'export Lightroom admin).
- `final-delivery-service.ts` (Milestone 5) — `importFinalPhoto()` (stocke
  le fichier final tel quel, sans retraitement ni watermark, refuse toute
  photo non sélectionnée, fait avancer le statut jusqu'à
  `READY_TO_DELIVER` une fois tous les finaux importés),
  `markDeliveredOnClientView()` (`READY_TO_DELIVER → DELIVERED`, déclenché
  par la simple consultation client, idempotent), `listDeliverablePhotos()`
  (renvoie `viewUrl` ET `downloadUrl` séparément par photo — voir
  `lib/storage/README.md`), `listDeliverableFinalKeys()` (juste
  `filename`/`finalKey`, pour `g/[slug]/download-all/route.ts` — pas d'URL
  signée à générer pour un fichier qui va être lu côté serveur puis
  streamé dans un zip, pas transmis tel quel au client).
- `payment-service.ts` — `markPaymentReceived()` : pas de Stripe réel
  (brief §16), enregistre juste qu'un paiement a été constaté par un autre
  moyen (`Payment.provider = null`) et fait avancer le statut
  `PAYMENT_PENDING → TO_RETOUCH`. Sans ce fichier, une galerie payante
  restait bloquée indéfiniment après confirmation — voir
  PROJECT_CONTEXT.md §6octies point 1.
- `portfolio-service.ts` — `listPortfolioEntries()` : DTO explicite pour la
  page publique `/portfolio` (même principe que
  `public-gallery-service.ts`), un shooting n'y apparaît que si
  `portfolioEnabled` ET `portfolioCoverPhotoId` sont renseignés — deux
  gestes admin distincts, voir `gallery-service.ts`.

Pas de tests automatisés sur ce dossier (nécessiterait un mock Prisma) —
vérifié par la compilation (`tsc`, `next build`) et par un test manuel de
bout en bout contre la vraie base Neon pour chaque jalon (voir
PROJECT_CONTEXT.md §6quinquies à §6octies).

Ce dossier peut être appelé depuis des Server Actions ou des Route Handlers,
mais ne doit pas contenir de JSX.
