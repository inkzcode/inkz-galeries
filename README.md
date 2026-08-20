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

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind CSS v4, Prisma / PostgreSQL
(Neon), Cloudflare R2 pour le stockage objet. Détail et justifications dans
`PROJECT_CONTEXT.md`.
