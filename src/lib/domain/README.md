# `lib/domain`

Logique métier pure, indépendante de Next.js, de la base de données ou de
l'UI. Doit rester testable sans serveur HTTP ni framework.

Exemples de ce qui vivra ici, au fil des jalons :

- `pricing.ts` — calcul du montant dû (photos incluses, prix au-delà, forfaits
  gratuits) à partir d'une configuration de galerie et d'une sélection.
- `gallery-status.ts` — machine à états des statuts de galerie (Brouillon →
  … → Livré → Archivé) et règles de transition automatique.
- `watermark-policy.ts` — traduction d'un niveau de protection
  (Aucune/Légère/Standard/Renforcée) en paramètres concrets de génération
  (résolution, qualité, opacité, répétition).

Règle : ce dossier ne doit importer ni `next/*`, ni le client Prisma, ni de
SDK de stockage. Il reçoit des données déjà chargées et retourne des
résultats ou des décisions.
