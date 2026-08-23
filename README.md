# inkz-galeries

Plateforme personnelle de galeries clients pour un photographe : sélection,
retouche, paiement éventuel et livraison des photographies. Voir
[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) pour la vision du produit,
l'architecture, les décisions prises et la feuille de route — à lire avant
toute contribution.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner les vraies valeurs
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Base de données

Le schéma Prisma se trouve dans `prisma/schema.prisma`. Une fois
`DATABASE_URL` renseignée dans `.env.local` :

```bash
npm run db:generate   # génère le client Prisma
npm run db:migrate    # applique le schéma (dev)
npm run db:studio     # explorateur de données
```

## Compte admin

Il n'y a pas de formulaire d'inscription : un seul compte photographe,
provisionné via un script (voir `prisma/seed-admin.ts`) :

```bash
ADMIN_EMAIL="vous@example.com" ADMIN_PASSWORD="un-mot-de-passe-solide" npm run db:seed-admin
```

## Stockage des photos

Sans les variables `R2_*` dans `.env.local`, le stockage bascule
automatiquement sur un adapter de dev qui écrit sur le disque local
(`.local-storage/` pour les originaux, `public/dev-previews/` pour les
previews) — permet de tester tout le pipeline d'import/preview/watermark
sans compte Cloudflare. Voir `src/lib/storage/README.md`.

## Tests

```bash
npm run test         # une passe
npm run test:watch   # mode watch
```

Couvre `lib/domain`, `lib/storage` et `lib/imaging` (logique pure et
traitement d'image — pas de dépendance à une base de données réelle).

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind CSS v4, Prisma / PostgreSQL
(Neon), Cloudflare R2 pour le stockage objet. Détail et justifications dans
`PROJECT_CONTEXT.md`.
