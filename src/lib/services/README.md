# `lib/services`

Orchestration : combine `lib/domain` (règles métier), `lib/storage` (fichiers)
et l'accès aux données (Prisma) pour réaliser une action complète.

Exemples à venir :

- `import-photo.ts` — enregistrer un original + une preview déjà générée
  localement, créer les entrées `Photo` correspondantes.
- `confirm-selection.ts` — verrouiller une sélection, calculer le montant dû
  via `lib/domain/pricing.ts`, déclencher (ou non) l'étape de paiement.
- `generate-access-code.ts` — créer/renouveler le code d'accès d'une galerie.

Ce dossier peut être appelé depuis des Server Actions ou des Route Handlers,
mais ne doit pas contenir de JSX.
