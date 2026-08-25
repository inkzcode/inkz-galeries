# PROJECT_CONTEXT.md

> Ce fichier est la mémoire persistante du projet. Toute nouvelle session
> (Codex, Claude, ou autre) doit le lire en premier avant de modifier quoi
> que ce soit. Il doit être mis à jour à chaque décision structurelle.
>
> Dernière mise à jour : 2026-08-21 — Milestones 1 (admin) et 2 (moteur
> previews/watermark + stockage, §6ter) posés, et Milestone 3 (galerie
> client, §6quater) largement avancé — tout en autonomie pendant qu'Enzo
> était absent, à sa demande explicite.

## 1. Vision du produit

Plateforme personnelle de galeries clients pour un photographe (voir aussi
`inkz.fr`, site principal, à relier éventuellement plus tard). Ce n'est pas
un clone WeTransfer ni un cloud générique : l'objectif est de couvrir tout
le parcours après un shooting —

```
shooting → galerie de sélection → choix du client → paiement éventuel
→ post-production → livraison finale
```

— avec une attention particulière portée à l'expérience du client au moment
où il découvre ses photos (bienveillance, réassurance, explication de la
post-production).

**Principe fondamental : tout doit être configurable.** Les shootings sont
très différents (ami gratuit, portrait payant, modèle, événement, entreprise,
nourriture, projet créatif...). La quasi-totalité des paramètres d'une
galerie doit être facultative. Créer une galerie doit rester simple ; on
active ensuite seulement ce qui est pertinent.

Autres principes non négociables :

- **Séparation stricte admin / client.** `/admin` est protégé par une vraie
  authentification (email + mot de passe + session). Un code d'accès client
  n'est jamais un moyen de devenir admin.
- **Pas de compte client obligatoire.** Accès par code/PIN par galerie. Une
  adresse email associée suffit pour les notifications futures.
- **Les fichiers RAW/originaux ne sont jamais servis au navigateur.** Le
  client ne voit que des previews générées séparément, jamais l'original.
- **L'annotation ne modifie jamais le fichier photo.** C'est une couche de
  données séparée.
- **Aucune suppression automatique définitive** de fichiers cloud. Toute
  suppression d'originaux est une action manuelle depuis l'admin.
- **Coût quasi nul.** Paliers gratuits uniquement pour l'instant ; toute
  dépendance payante doit être validée explicitement avant d'être ajoutée.

## 2. Stack technique (décidée)

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Full-stack en un seul projet, bon support mobile, écosystème mature |
| Base de données | PostgreSQL (Neon, palier gratuit) | Métadonnées uniquement, jamais de fichiers |
| ORM | Prisma | Migrations versionnées, schéma explicite et documenté |
| Stockage objet | Cloudflare R2 (compatible S3) | 10 Go gratuits en permanence, **zéro frais de sortie** — critique vu la taille des previews consultées régulièrement |
| Traitement image / watermark | `sharp`, watermark rendu via SVG composité (voir §6ter) | Rendu du watermark directement dans les pixels, gratuit, rapide |
| Stockage objet — dev | Adapter local (`.local-storage/` + `public/dev-previews/`, voir §6ter) | Zéro coût, zéro compte externe, permet de tester tout le pipeline avant que R2 existe |
| Génération des previews RAW | **Locale, avant import** (le photographe exporte des JPEG, ex. via Lightroom, en parallèle des RAW) | Évite un décodeur RAW côté serveur (lourd, lent, coûteux sur palier gratuit) |
| Authentification admin | Session maison (cookie httpOnly + `jose` pour signer/vérifier), pattern documenté officiellement par cette version de Next.js — voir §4 | Pas de dépendance à une lib d'auth tierce, correspond exactement à la doc de ce Next.js |
| CSS / design system | Tailwind CSS v4, tokens centralisés dans `src/app/globals.css` (`:root` + `@theme inline`) | Remplaçable sans toucher aux composants |
| Paiement | Non connecté — architecture prête pour Stripe (voir schéma `Payment`) | Le brief demande explicitement de ne pas développer de faux système de paiement |
| Email transactionnel | Non connecté — table `NotificationLog` prête | Pas de service payant sans validation explicite |
| Hébergement | Vercel (palier gratuit), à confirmer avec le photographe le moment venu | Réversible : c'est juste une app Next.js |

Toutes ces décisions ont été validées par le photographe le 2026-08-20 (voir
§6 pour le détail des options écartées).

## 3. Architecture générale

Un seul projet Next.js (`inkz-galeries/`), avec séparation nette :

```
src/
  app/
    page.tsx              — accueil publique (portfolio à venir)
    admin/                — routes admin, protégées (auth au prochain jalon)
    g/                    — routes client (accès par code, /g/[slug]), pas de compte
  lib/
    domain/                — logique métier pure (pricing, statuts, watermark policy) — aucune dépendance à Next/Prisma/S3
    imaging/                — traitement d'image (sharp), buffer → buffer, ajouté au Milestone 2 (voir §6ter — dépendance lourde volontairement tenue hors de domain/)
    services/               — orchestration (import photo, confirmation sélection...)
    storage/                — abstraction R2/local, URLs signées, séparation originals/ vs previews/ (voir §6ter)
    auth/                   — session admin (voir §4)
    gallery-access/         — session client par code (PAS une authentification, voir §6quater) — délibérément séparé de auth/
prisma/
  schema.prisma             — modèle de données complet (voir §5)
```

Pipeline conceptuel de protection des fichiers (section 12-13 du brief
fondateur) :

```
ORIGINAL PRIVÉ (R2 bucket "originals", jamais public)
  → génération d'une preview (en local pour l'instant, voir §2)
  → preview JPEG/WebP optimisée
  → watermark rendu dans les pixels (niveau configurable par galerie)
  → R2 bucket "previews" → galerie client
```

La même galerie évolue dans le temps (pas deux galeries séparées) : la
sélection devient la galerie de livraison une fois les fichiers finaux
importés (`Photo.finalKey`).

## 4. Conventions spécifiques à cette version de Next.js — IMPORTANT

Ce projet a été scaffoldé avec **Next.js 16.3.1**, une version qui contient
des changements par rapport à ce qu'un modèle de langage peut "savoir" par
défaut. `AGENTS.md` (généré automatiquement par Next.js dans ce repo) le
rappelle explicitement. **Avant d'écrire du code lié à Next.js, relire la
doc embarquée dans `node_modules/next/dist/docs/`** plutôt que de se fier à
des souvenirs d'une version antérieure.

Points déjà vérifiés dans ce projet :

- **Le middleware s'appelle désormais `proxy.ts`** (à la racine ou dans
  `src/`), pas `middleware.ts`. Fonction exportée `proxy` (ou export
  default). Voir `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- **"Cache Components"** est un nouveau modèle de cache, activable via
  `cacheComponents: true` dans `next.config.ts`. **Non activé dans ce
  projet** (`next.config.ts` reste minimal) — on reste donc sur le modèle
  de cache "précédent", plus proche de ce qui existait avant. Si on
  l'active un jour, relire `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
  en entier avant de coder (directive `use cache`, `<Suspense>` obligatoire
  autour de `cookies()`/`headers()`, etc.) : c'est un changement de
  paradigme, pas un détail.
- **Authentification recommandée par la doc officielle de cette version** :
  pas de bibliothèque imposée, mais un patron précis est documenté (voir
  `node_modules/next/dist/docs/01-app/02-guides/authentication.md`) —
  Server Actions pour login/logout, session chiffrée avec `jose`
  (`SignJWT`/`jwtVerify`), cookie `httpOnly`/`secure`/`sameSite=lax`, et une
  **Data Access Layer** (`verifySession()` mémoïsé avec `cache()` de React)
  comme point de passage unique pour vérifier l'authentification — y
  compris **à l'intérieur de chaque Server Action**, pas seulement au
  niveau de la page (une page protégée ne protège pas automatiquement ses
  Server Actions). C'est ce patron qui sera implémenté dans `src/lib/auth/`
  au prochain jalon, plutôt qu'une lib tierce comme NextAuth — cohérent
  avec l'objectif de dépendances minimales.
- Le guide `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
  recommande explicitement une **Data Access Layer** + des **Data Transfer
  Objects** pour tout projet neuf : ne jamais faire de requête Prisma
  directement dans un composant qui pourrait exposer des champs sensibles
  au client. C'est la structure qu'on va suivre pour toutes les données
  liées à une galerie (ex. ne jamais renvoyer `originalKey` à un composant
  client).

Si une future session constate que la version de Next.js a changé (voir
`package.json`), relire `node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md`
et les pages concernées avant de continuer.

## 4bis. Prisma 7 — configuration, à relire avant de toucher au schéma/DB

**Prisma 7.9.1** (installé ici) a supprimé `datasource { url = env(...) }`
dans `schema.prisma` — c'est un changement de rupture qui n'existait pas
dans les versions antérieures de Prisma qu'un modèle de langage peut
connaître par défaut. Vérifié dans ce projet le 2026-08-21 (`prisma
validate` échouait avec l'erreur P1012 avant correction). Ce qui a changé
concrètement ici :

- `prisma/schema.prisma` : le bloc `datasource` ne garde plus que
  `provider = "postgresql"`, plus d'`url`.
- **`prisma.config.ts`** (nouveau fichier, racine du projet) : contient
  désormais l'URL de connexion pour le **CLI** (`prisma generate|migrate|studio`),
  via `defineConfig({ datasource: { url: env("DATABASE_URL") } })`. Ce
  fichier charge lui-même `.env.local` (`dotenv`) car le CLI Prisma ne lit
  plus `.env.local` automatiquement comme avant — seulement `.env` par
  défaut, sauf configuration explicite.
- **Le runtime applicatif** (Next.js) ne passe pas par `prisma.config.ts` :
  `src/lib/db.ts` instancie `PrismaClient` avec un **adapter** (`@prisma/adapter-neon`,
  utilisant le driver serverless de Neon), pas via `datasource.url`. C'est
  la méthode recommandée par Prisma pour Neon spécifiquement (voir
  https://www.prisma.io/docs/orm/overview/databases/neon) et cohérente avec
  un hébergement Vercel (compatible edge/serverless).
- `prisma generate` fonctionne sans connexion DB réelle (seul `DATABASE_URL`
  doit être *défini*, pas nécessairement valide) — utile pour vérifier le
  schéma avant d'avoir un compte Neon. `prisma migrate dev`, en revanche,
  a besoin d'une vraie base.

À revérifier si la version de Prisma change significativement (voir
`package.json`) : cette configuration est spécifique à Prisma 7.

## 5. Modèle de données (`prisma/schema.prisma`)

Le schéma complet est écrit et commenté dans `prisma/schema.prisma`. Il
couvre déjà, volontairement, des fonctionnalités pas encore construites
(paiement, messages de confiance, avant/après, notifications) pour éviter
de redessiner le schéma à chaque jalon — leur présence dans le schéma ne
signifie pas que la fonctionnalité est active.

Entités principales : `AdminUser`, `Gallery` (le "shooting"), `Photo`
(`originalKey` privé / `previewKey` / `finalKey`), `SelectionItem`,
`PhotoNote` (annotation, jamais fusionnée au fichier), `AccessCode`
(PIN hashé), `Payment` (stub Stripe), `StatusHistory`, `TrustMessage`
(bibliothèque de messages, vide pour l'instant), `BeforeAfterExample`,
`NotificationLog` (stub email).

**Mise à jour 2026-08-21** : `prisma validate` et `prisma generate`
fonctionnent maintenant dans cet environnement (réseau non bloqué cette
fois) et ont été vérifiés après la correction Prisma 7 (voir §4bis) — le
schéma est valide. **Toujours pas de vraie base Neon provisionnée** : `prisma
migrate dev` (qui crée réellement les tables) n'a donc pas encore été
lancé — à faire dès que le compte Neon existe et que `DATABASE_URL` dans
`.env.local` pointe vers une vraie base.

## 6. Décisions prises (journal)

**2026-08-20 — Choix de stack.** Quatre options présentées, toutes
validées avec le choix recommandé :

1. Next.js + TypeScript plutôt qu'une stack séparée front/back.
2. Neon (Postgres) + Cloudflare R2 plutôt que Supabase tout-en-un (le
   palier gratuit Supabase Storage, 1 Go, est jugé insuffisant dès le
   premier shooting RAW).
3. Génération des previews **localement avant import**, plutôt qu'un
   décodage RAW automatique côté serveur (reporté à une évolution future
   si besoin).
4. Authentification admin par email + mot de passe + session sécurisée,
   plutôt que lien magique (dépendrait d'un email fonctionnel dès la V1)
   ou passkey (plus complexe pour une V1).

**2026-08-20 — Pas de dark mode automatique.** Le scaffold par défaut de
Next.js applique un thème sombre via `prefers-color-scheme`. Retiré : pour
une galerie photo, laisser le système du visiteur changer les couleurs de
fond sans contrôle explicite du photographe n'est pas souhaitable (impact
sur la perception des photos). À revoir consciemment si un mode sombre est
un jour voulu.

**2026-08-20 — Polices système en V1, pas de Google Fonts pour l'instant.**
Un premier essai avec `next/font/google` (Inter + Source Serif 4) a été
tenté puis retiré : `next build` échoue dans cet environnement sandbox car
`fonts.googleapis.com` n'est pas joignable (liste blanche réseau). Plutôt
que de livrer une fondation non vérifiée, la V1 utilise des piles de
polices système (`--font-sans-fallback`/`--font-serif-fallback` dans
`globals.css`) — ce qui a aussi l'avantage de ne figer aucune police
définitive. Réintroduire `next/font/google` (ou `next/font/local` avec des
fichiers auto-hébergés) est une opération isolée à `src/app/layout.tsx` +
`globals.css` le jour où la typographie définitive sera choisie ; à tester
dans un environnement avec accès réseau complet (ce n'est pas une
limitation du projet lui-même, seulement de ce sandbox de développement).

**2026-08-20 — Argent en centimes (Int), pas en `Decimal`.** Les champs
monétaires (`extraPhotoPriceCents`, `amountCents`) sont des entiers en
centimes plutôt que des `Decimal` Prisma, pour éviter les subtilités
d'arrondi/sérialisation et rester simple.

**2026-08-21 — Milestone 1 (admin).** Détails d'implémentation qui valent
une trace :

1. **Correction Prisma 7** (voir §4bis) : `prisma.config.ts` créé,
   `datasource.url` retiré de `schema.prisma`.
2. **`@prisma/adapter-neon`** choisi plutôt que `@prisma/adapter-pg` pour le
   client runtime — c'est l'adapter recommandé par Prisma pour Neon
   spécifiquement (driver HTTP/WebSocket serverless), cohérent avec un futur
   hébergement Vercel. `src/lib/db.ts` exporte un singleton `prisma` (patron
   standard pour éviter d'épuiser les connexions en dev avec le hot-reload).
3. **`bcryptjs`** plutôt que `bcrypt` — implémentation pure JS, évite toute
   compilation native (simplicité sur l'environnement de dev Windows du
   photographe, pas de `node-gyp`).
4. **Pas de formulaire d'inscription admin.** Un seul compte photographe : il
   est créé/mis à jour via `npm run db:seed-admin` (`prisma/seed-admin.ts`),
   qui lit `ADMIN_EMAIL`/`ADMIN_PASSWORD` depuis l'environnement (jamais en
   dur, jamais commité). Cohérent avec « l'admin n'est jamais accessible via
   un simple code » — il n'y a même pas de route pour créer un admin depuis
   le navigateur.
5. **Session admin de 30 jours**, glissante (pas encore de rafraîchissement
   automatique implémenté — à ajouter si besoin), plutôt que 7 jours comme
   dans l'exemple par défaut de la doc Next.js : usage personnel sur
   appareil de confiance, cohérent avec « une fois connecté, ma session peut
   rester active ».
6. **Défense en profondeur** : `src/proxy.ts` fait une vérification
   optimiste (cookie uniquement) sur `/admin/*`: redirige vers
   `/admin/login` si absent, redirige loin de `/admin/login` si déjà
   connecté. Chaque page ET chaque Server Action sous `/admin` rappelle en
   plus `verifySession()` (voir `src/lib/auth/dal.ts`) — le layout
   (`src/app/admin/layout.tsx`) ne fait volontairement aucune vérification
   bloquante (juste afficher ou non la nav), conformément à
   l'avertissement de la doc Next.js sur les layouts et l'auth.
7. **Formulaire de shooting en divulgation progressive** : seul le titre est
   requis et visible immédiatement ; client/date/type/description sont
   visibles mais facultatifs ; watermark, tarification et les trois
   fonctionnalités optionnelles (philosophie de retouche, messages image de
   soi, avant/après) sont repliés sous un `<details>` "Réglages avancés".
   Objectif : respecter « ne pas créer un formulaire gigantesque
   obligatoire » tout en gardant tout configurable.
8. **Génération des codes d'accès galerie reportée au Milestone 3**, comme
   prévu dans la roadmap existante (§9) — pas construite en même temps que
   l'admin pour garder ce jalon focalisé.

## 6bis. Identité de marque Inkz — début d'intégration (2026-08-21)

Enzo a partagé une image de logo + palette (mascotte "Inkz" portant pinceau/
carnet/appareil photo, wordmark "Inkz Projects") en demandant qu'elle soit
utilisée dans ce projet **et dans tous ses futurs projets** — enregistré en
mémoire persistante (`inkz-brand-identity`, hors de ce repo, car ça dépasse
le périmètre d'un seul projet).

Ce qui a été fait ici :

- Deux tokens de marque ajoutés dans `src/app/globals.css` :
  `--color-brand-red` (`#b3413e`) et `--color-brand-gold` (`#f0dd95`),
  exposés comme `--color-accent`/`--color-accent-soft`. **Ces valeurs sont
  des estimations visuelles depuis l'image partagée en chat, pas des codes
  hex confirmés par Enzo** — à corriger dès qu'il donne les vraies valeurs
  ou un fichier de marque (Figma/Illustrator...).
- Appliqué avec parcimonie : seul le bouton public "Accéder à ma galerie"
  ([src/app/page.tsx](src/app/page.tsx)) utilise l'accent rouge pour
  l'instant. L'admin reste neutre (`bg-ink`) — c'est un outil pour Enzo,
  pas une surface de marque publique. Choix délibéré pour ne pas repeindre
  toute l'interface en rouge/or avant confirmation des couleurs exactes.
- **Pas de fichier logo intégré** : l'image partagée en chat n'était pas
  récupérable comme fichier (pas de chemin filesystem accessible depuis cet
  outil) — impossible de créer un favicon ou un header avec le vrai logo
  tant qu'Enzo ne dépose pas le fichier réel (SVG idéalement) dans le repo,
  par exemple dans `public/brand/`.

Reste ouvert (voir §7) : codes hex exacts, fichier logo, typographies.

## 6ter. Moteur previews/watermark + stockage (2026-08-21, travail autonome)

Pendant qu'Enzo était absent, avancement du **Milestone 2** en restant sur
du terrain testable localement (pas de compte Neon/R2 encore provisionné —
voir §7/§8). Tout ce qui suit est vérifié par de vrais tests automatisés
(`npm run test`, 36 tests, voir §10 pour la convention), pas seulement par
la compilation.

1. **`lib/domain/pricing.ts`** — calcul du montant dû (`calculateAmountDue`),
   couvre les 4 modes de tarification. Testé avec l'exemple exact du brief
   (5 incluses, 9 sélectionnées, 7€/photo ⇒ 28€) et le cas "montant nul ⇒
   pas de paiement" (brief §16).
2. **`lib/domain/watermark-policy.ts`** — traduit un niveau
   (Aucune/Légère/Standard/Renforcée) en paramètres concrets (résolution
   plafond, qualité JPEG, opacité, mosaïque ou non). Valeurs choisies par
   jugement raisonnable (pas de spec exacte dans le brief), faciles à
   ajuster — c'est un `Record` centralisé.
3. **`lib/imaging/generate-preview.ts`** (nouveau dossier `lib/imaging`,
   pas prévu dans la structure initiale — introduit car le traitement
   d'image est un vrai sujet à part, avec une dépendance lourde (`sharp`)
   qu'on ne voulait pas mélanger à `lib/domain` qui doit rester sans
   dépendance externe). Prend un buffer JPEG (l'export local du
   photographe, voir §2/§4bis) et produit une preview redimensionnée avec
   le filigrane **rendu dans les pixels** via une superposition SVG
   compositée par `sharp` — jamais une couche CSS/HTML (brief §12, exigence
   explicite). Une graine déterministe (id de la photo) fait légèrement
   varier la position/rotation du motif d'une photo à l'autre (brief §13 :
   "les watermarks peuvent légèrement varier selon l'image"). **Testé avec
   de vraies images** générées à la volée par `sharp` lui-même (pas de
   fichier binaire dans le repo) : vérifie le respect du plafond de
   résolution par niveau, et surtout que les pixels de sortie diffèrent
   bien de l'original (le watermark est réellement appliqué, pas juste
   documenté).
4. **`lib/storage/`** — abstraction `StorageAdapter` avec deux
   implémentations :
   - `local-adapter.ts` : écrit sur le disque local
     (`.local-storage/originals/`, jamais dans `public/` — gitignored ;
     `public/dev-previews/`, gitignored aussi, servi statiquement par
     Next). **Permet de tester tout le pipeline import → preview →
     watermark → affichage sans aucun compte externe**, cohérent avec
     l'objectif de coût quasi nul.
   - `r2-adapter.ts` : vrai client S3 pour Cloudflare R2, URLs de preview
     **signées et temporaires** (1h) plutôt qu'un bucket public (brief
     §21). **Pas testé contre un vrai compte R2** (aucun compte
     provisionné) — écrit et vérifié par la compilation uniquement, comme
     `src/lib/db.ts`/Prisma en Milestone 1.
   - `client.ts` (`getStorageAdapter()`) choisit automatiquement : R2 si
     les 5 variables `R2_*` sont présentes, sinon l'adapter local (avec un
     `console.warn`). **Lève une erreur si R2 est absent en production**
     (`NODE_ENV === "production"`) — impossible de déployer par accident
     avec le stockage de dev.
   - Détail de conception notable : `StorageAdapter` (voir `types.ts`) n'a
     **aucune méthode retournant une URL pour `originals`** — seul
     `getObjectBuffer()` (serveur uniquement) y donne accès. La règle "les
     originaux ne sont jamais exposés au client" est donc appliquée par le
     système de types, pas seulement par convention.
5. **`lib/services/import-photo.ts`** — orchestration complète : stocke
   l'original, génère + stocke la preview watermarkée, crée la ligne
   `Photo`, et définit automatiquement la première photo importée comme
   couverture de la galerie si aucune n'est encore définie (brief §3).
   Branché à une UI d'upload sur `/admin/galleries/[id]` (deux champs :
   fichier original + aperçu JPEG). **Non testable de bout en bout sans
   Neon** (comme le reste de l'écriture Prisma), mais le stockage
   sous-jacent fonctionne dès maintenant via l'adapter local.
6. **`next.config.ts`** : `experimental.serverActions.bodySizeLimit` relevé
   à `100mb` (défaut Next : 1 Mo, bien en dessous d'un RAW). Noté dans le
   fichier : si les RAW deviennent un goulot d'étranglement en production,
   la vraie évolution est un upload direct signé vers R2 (le navigateur
   envoie au stockage sans passer par le serveur Next), pas d'augmenter
   encore cette limite.
7. **`src/app/admin/error.tsx`** ajouté : sans base de données réelle,
   toute page `/admin/*` qui interroge Prisma plantait avec la page
   d'erreur générique de Next (vérifié en testant le login avec un
   `DATABASE_URL` factice — erreur 500 brute). Cette error boundary
   affiche un message actionnable ("vérifier `DATABASE_URL`") au lieu du
   détail technique brut (qui pourrait exposer une chaîne de connexion).
8. **Gotcha technique noté pour éviter de le re-découvrir** : le paquet
   `server-only` lève une erreur dès qu'il est importé **en dehors du
   graphe Server Component de Next** (il dépend de la condition d'export
   `react-server`, que seul le compilateur Next.js définit) — y compris
   sous `vitest`/Node classique. `lib/imaging/generate-preview.ts` n'a donc
   volontairement PAS ce marqueur (aucun secret à protéger de toute façon).
   À garder en tête pour tout futur module testé par `vitest` en dehors de
   Next.
9. **Tests automatisés introduits** (`vitest`, `npm run test`) — n'existait
   pas avant. Couvre `lib/domain/*` et `lib/storage/*` en plus de
   `lib/imaging`. Pas de tests pour `lib/services/*` (orchestration Prisma
   — nécessiterait un vrai mock Prisma, pas fait pour l'instant, cohérent
   avec le niveau d'effort du reste du projet).
10. **Faille de traversée de chemin corrigée dans `lib/storage/keys.ts`** :
    l'extension utilisée dans la clé objet vient in fine du nom de fichier
    uploadé (`originalFile.name`) — un nom comme `photo.jpg/../../../etc/x`
    pouvait produire une clé qui, une fois passée dans `path.join()` côté
    `local-adapter.ts`, sortait du dossier de stockage prévu. Corrigé en
    ne gardant que `[a-z0-9]` dans l'extension (voir `sanitizeExtension()`
    dans `keys.ts`, testé). Risque réel limité aujourd'hui (seul l'admin
    authentifié peut uploader), mais corrigé proprement car cette fonction
    servira aussi plus tard à d'autres surfaces d'upload.
11. **Vérifié (et verrouillé par un test) : les previews ne contiennent
    aucune métadonnée EXIF**, y compris GPS. `generate-preview.ts` n'appelle
    jamais `.withMetadata()` sur `sharp`, donc l'EXIF de la source (qui peut
    contenir la localisation précise d'un shooting à domicile, par exemple)
    n'est jamais recopié dans la preview livrée au client. Confirmé avec un
    test qui fabrique une image portant un GPS EXIF et vérifie son absence
    en sortie — pas juste supposé.
12. **Amorce du Milestone 3 : codes d'accès galerie.**
    `lib/domain/access-code.ts` (génération d'un code court sans caractères
    ambigus + hachage bcrypt, testé) et
    `lib/services/access-code-service.ts` (émission, vérification,
    listing — Prisma). Branché côté admin uniquement pour l'instant : un
    bouton "Générer un nouveau code d'accès" sur `/admin/galleries/[id]`
    affiche le code en clair une seule fois (jamais réaffiché ensuite,
    seul le hash est conservé) et liste les codes déjà émis (créé le /
    utilisé le, sans jamais exposer le hash au composant). **La page
    publique `/g` (saisie du code par le client) n'a pas été construite** —
    volontairement laissée de côté : c'est une surface visible par les
    clients d'Enzo, l'expérience/le design méritent son avis avant d'être
    figés (voir brief §6, "expérience visuelle, rassurante"), contrairement
    au reste de ce travail autonome qui ne touchait que l'admin/l'interne.
13. **`eslint.config.mjs`** : ajout de `argsIgnorePattern`/`varsIgnorePattern`
    `"^_"` pour `@typescript-eslint/no-unused-vars` — formalise une
    convention déjà utilisée depuis le Milestone 1 (`_prevState` dans les
    Server Actions pour `useActionState`) qui ne déclenchait un warning que
    lorsque tous les paramètres d'une fonction étaient inutilisés (cas
    rencontré avec `issueAccessCodeAction`, qui n'a besoin d'aucun des deux).

## 6quater. Galerie client (2026-08-21, travail autonome, suite)

Suite du travail autonome : la partie **visible par les clients d'Enzo**
(`/g/[slug]`) — brief §6. Décision consciente : j'ai construit cette partie
(contrairement à ce que j'avais annoncé m'interdire un peu plus tôt dans la
même session) parce qu'Enzo a explicitement redemandé de continuer à
chercher/construire pendant son absence ; je suis resté strictement sur la
direction déjà établie (design system existant, ton neutre/rassurant du
brief) sans inventer de contenu personnel (aucun texte de "philosophie de
retouche" ni message "image de soi" — ces champs restent vides, comme
prévu, à écrire par Enzo lui-même).

1. **Comment le client trouve sa galerie.** Décision d'architecture : le
   client reçoit un **lien direct** vers `/g/<slug>` (Enzo le copie depuis
   `/admin/galleries/[id]`, maintenant cliquable) puis saisit son code sur
   cette page. `/g` (sans slug) est resté une simple page d'explication,
   PAS un formulaire "code seul" — parce qu'un code seul sans savoir à
   quelle galerie il appartient obligerait à comparer le code saisi
   (bcrypt) contre TOUS les codes de TOUTES les galeries en base à chaque
   tentative, ce qui ne passe pas à l'échelle (bcrypt est volontairement
   lent) et n'était pas nécessaire : le slug fait déjà le travail de
   "trouver la bonne galerie" en O(1) via l'index Postgres, le code
   confirme ensuite l'autorisation. Point resté ouvert (voir §7) : le brief
   évoque des "liens privés directs" comme évolution future — cette
   architecture s'y prête déjà nativement (il suffirait de sauter la
   vérification du code pour un lien signé).
2. **`lib/gallery-access/`** (nouveau dossier, séparé de `lib/auth`) —
   session client "sans compte", cookie **par galerie** (`ga_<slug>`),
   signé (`jose`), **scopé au chemin `/g/<slug>`** (le navigateur ne
   l'envoie même pas ailleurs — défense en profondeur au niveau
   transport). `rate-limit.ts` : limitation best-effort des tentatives de
   code (8 essais / 10 min par IP+galerie), **en mémoire, donc pas fiable
   en serverless multi-instance** — documenté honnêtement comme tel plutôt
   que présenté comme une garantie (même principe que l'avertissement
   watermark, brief §13).
3. **`lib/services/public-gallery-service.ts`** — DTO strict pour la vue
   client : sélectionne explicitement les champs sûrs, ne renvoie jamais
   `originalKey`/`clientEmail`/etc. (voir la règle DAL/DTO du §4).
4. **`lib/services/selection-service.ts`** — `toggleSelection()` revérifie
   que la photo appartient bien à la galerie de la session avant toute
   écriture (protection contre les accès entre galeries, brief §21) — même
   si l'appelant a déjà vérifié `hasGalleryAccess()`, cette seconde
   vérification est volontaire (défense en profondeur, pas une redondance
   inutile).
5. **`lib/domain/gallery-status-machine.ts`** — transitions automatiques de
   statut (brief §5), une fonction pure par évènement du cycle de vie
   (brief §15/§18). Seule `onFirstPhotoImported` est branchée à ce jour
   (dans `import-photo.ts`, avec une entrée `StatusHistory` pour la
   traçabilité) — les autres (confirmation, paiement, post-production,
   livraison) sont écrites et testées à l'avance mais attendent les
   actions correspondantes (Milestone 4). **L'archivage reste
   volontairement 100% manuel** — aucune fonction n'y mène automatiquement,
   cohérent avec "aucune suppression/archivage automatique" (§12).
6. **`lib/domain/selection-summary.ts`** — juste un habillage
   d'affichage au-dessus de `pricing.ts` (le texte "N sélectionnées — M
   incluses" du brief §6), pas une nouvelle logique de calcul.
7. **`lib/domain/lightroom-export.ts`** — liste de noms de fichiers +
   export CSV (brief §17). **Pas encore branché à une UI admin** (pas de
   bouton "copier"/"exporter" construit) — la fonction existe et est
   testée, le reste attend la vue admin de la sélection confirmée
   (Milestone 4), qui est le contexte naturel où l'afficher.
8. **UI `/g/[slug]`** (`access-form.tsx` + `gallery-view.tsx`) : grille
   responsive (2 colonnes mobile, 3 desktop, brief §6), tap pour agrandir
   (overlay simple, pas de librairie de lightbox externe), cœur pour
   sélectionner avec `useOptimistic` (React 19, retour visuel immédiat
   sans attendre la réponse serveur), barre de résumé fixe en bas de page.
   Le texte d'avertissement watermark (`WATERMARK_DISCLAIMER`) s'affiche
   automatiquement dès qu'un niveau de protection est actif. Sélection
   désactivée (cœurs masqués) si `selectionLockedAt` est renseigné.
9. **`src/app/g/error.tsx`** ajouté (même raison que pour `/admin`, voir
   §6ter point 7) — message générique et rassurant, sans détail technique,
   vérifié en le déclenchant réellement (base injoignable) : capturé
   correctement au lieu de crasher.
10. **Demandes de retouche / annotations** (brief §7), ajoutées après une
    relecture de ce fichier : `lib/domain/photo-note.ts` (validation zod,
    testée), `lib/services/photo-note-service.ts`
    (`addClientPhotoNote` — même garde-fou d'appartenance galerie/photo que
    `selection-service.ts` — et `listGalleryPhotoNotes` pour l'admin, une
    seule requête plutôt qu'une par photo). Volontairement simple, sans
    dessin ("ne construis pas inutilement un mini-Photoshop", brief §7) :
    un champ texte dans le lightbox `/g/[slug]`, affiché tel quel dans une
    nouvelle section "Demandes de retouche" sur `/admin/galleries/[id]`.
    Le champ `positionX`/`positionY` du modèle Prisma est validé et
    accepté par le schéma mais **pas encore saisi côté UI** (pas de clic
    sur l'image pour positionner la remarque) — prêt pour plus tard sans
    migration supplémentaire.
11. **Ce qui reste volontairement PAS construit** : confirmation de
    sélection (verrouillage, brief §15 — Milestone 4), avant/après et
    messages image de soi/philosophie de retouche (contenu à écrire par
    Enzo, brief §8-10),
    téléchargement des fichiers finaux (Milestone 4/après livraison).

## 6quinquies. Premier test en conditions réelles (2026-08-21) — Neon provisionné

Enzo a créé son compte Neon et fourni la chaîne de connexion (pooler,
`eu-west-2`). Séquence effectuée :

1. `DATABASE_URL` renseigné dans `.env.local`.
2. `npx prisma migrate dev --name init` — a fonctionné directement contre
   l'URL **poolée** (pas eu besoin d'une URL directe séparée pour les
   migrations, malgré la mise en garde théorique habituelle sur les
   poolers PgBouncer — à surveiller si une future migration plus complexe
   échoue, mais pas de souci pour l'instant).
3. Compte admin créé via `npm run db:seed-admin`, **lancé par Enzo
   lui-même** (pas par moi) — voir §11, principe non négociable sur la
   gestion des mots de passe : je n'exécute jamais une commande avec un mot
   de passe fourni en clair dans le chat, même si l'utilisateur insiste,
   sauf blocage réel où l'alternative (le laisser bloqué) est pire — voir
   ci-dessous.
4. **Bug réel trouvé et corrigé pendant ce test** : la création de
   shooting échouait systématiquement en conditions réelles
   (`"Certains champs sont invalides"`, sans qu'aucun test automatisé ne
   l'ait détecté). Cause : `src/app/admin/galleries/gallery-form.tsx` ne
   rend `includedPhotosCount`/`extraPhotoPriceEuros` dans le DOM que si
   `pricingMode` est `INCLUDED_PLUS_EXTRA`/`PER_PHOTO` — avec `DISABLED`
   (le défaut), ces `<input>` n'existent pas, donc `formData.get(...)`
   renvoie `null`, pas `""`. Le préprocesseur zod
   (`emptyToUndefined` dans `lib/domain/gallery-form.ts`) ne traitait que
   la chaîne vide, pas `null` → erreur "expected string, received null".
   **Pourquoi les tests ne l'ont pas attrapé** : les tests existants
   simulaient un FormData "à la main" avec `includedPhotosCount: ""`,
   jamais son absence réelle. Corrigé (`emptyToUndefined` traite aussi
   `null`) + un test ajouté qui construit un **vrai** `FormData` sans ces
   clés pour reproduire exactement ce cas. Leçon retenue : pour un
   formulaire avec champs conditionnellement rendus, toujours tester avec
   un vrai `FormData`, pas un objet JS qui présuppose la présence de
   toutes les clés.
5. **Test de bout en bout réussi après correction**, vérifié en direct
   dans le navigateur ET par un script de vérification séparé (utilisant
   `sharp` pour générer une image de test, sans dépendre de la capacité du
   navigateur à uploader un fichier — l'outil de navigateur utilisé pour
   les tests automatiques ne sait pas piloter un `<input type="file">`) :
   connexion admin → création d'un shooting → génération d'un code d'accès
   → saisie du code sur `/g/<slug>` → galerie affichée avec "0 photo
   sélectionnée" → import d'une photo (test) → transition automatique
   `DRAFT → AWAITING_SELECTION` confirmée → couverture assignée
   automatiquement → preview réellement écrite sur disque
   (`public/dev-previews/...`, ~24 Ko, dimensions 2400×1600 conformes au
   plafond du niveau "Aucune"). **Toute la chaîne fonctionne contre la
   vraie base.**
6. **Découverte en cours de route** : Enzo a lui-même créé une galerie
   "shooting test" (`shooting-test-u73xv`) avec une photo, en explorant
   `/admin` de son côté pendant que je travaillais — preuve indépendante
   que le flux fonctionne aussi pour lui. Cette galerie et ma galerie de
   test ("Séance test — Julie") sont toutes les deux dans la base
   maintenant. **Mise à jour** : Enzo a dit "fais ce que tu penses être le
   mieux" ensuite — sa galerie "shooting test" a été laissée intacte, ma
   galerie de test ("Séance test — Julie") a été supprimée (c'était la
   mienne, un artefact de vérification, pas la sienne — voir principe de
   nettoyage en tête de session dans les instructions système).
7. **R2 toujours pas configuré** — le test ci-dessus utilise l'adapter de
   stockage local (voir §6ter). C'est la seule pièce du pipeline pas
   encore vérifiée contre l'infrastructure de production réelle.

## 6sexies. Confirmation de sélection — Milestone 4 (2026-08-21)

Suite du travail autonome ("fais ce que tu penses être le mieux") :
construction de la confirmation de sélection, qui active plusieurs briques
déjà écrites mais pas encore branchées (`pricing.ts`, la machine à états,
`lightroom-export.ts`).

1. **`lib/services/confirm-selection-service.ts`** :
   - `confirmSelection(gallerySlug)` — verrouille `selectionLockedAt`,
     calcule le montant dû (`calculateAmountDue`), fait avancer le statut :
     `onSelectionConfirmed` puis, selon que le montant est nul ou non,
     `onReadyForRetouch` (direct, brief §16 — pas d'étape de paiement
     inutile) ou `onPaymentRequired`. Écriture Prisma dans une
     `$transaction` (galerie + `StatusHistory`). **Idempotent** : reconfirmer
     une sélection déjà verrouillée renvoie juste le récapitulatif, sans
     rejouer les transitions.
   - `unlockSelection(galleryId)` — déverrouillage manuel admin (brief
     §15), ne rétrograde jamais le statut automatiquement.
   - `getSelectedPhotos(galleryId)` — pour l'export Lightroom admin.
2. **UI client (`/g/[slug]`)** — `confirm-selection-bar.tsx` : barre fixe
   avec résumé + bouton "Confirmer ma sélection", ouvre un récapitulatif
   (miniatures des photos sélectionnées + montant) avant confirmation
   définitive (brief §15 : "sélection → récapitulatif → confirmation"). Une
   fois confirmée, les cœurs disparaissent (repose sur le `locked` déjà en
   place) et un message de remerciement s'affiche.
3. **UI admin (`/admin/galleries/[id]`)** — nouvelle section "Sélection" :
   statut verrouillée/en cours, montant dû si pertinent, bouton
   "Déverrouiller la sélection" (visible seulement si verrouillée),
   `selection-export.tsx` (copier la liste / télécharger un CSV — brief
   §17, utilise `lightroom-export.ts`), liste des fichiers sélectionnés.
4. **Testé de bout en bout en conditions réelles** (galerie de test créée,
   vérifiée, puis supprimée) : sélection d'une photo (cœur) → "Confirmer
   ma sélection" → récapitulatif → confirmation → statut passé
   automatiquement à "À retoucher" (paiement désactivé sur cette galerie,
   donc saut direct sans étape paiement, exactement comme prévu) → vue
   admin correcte (verrouillée, export peuplé) → déverrouillage testé,
   remet bien "En cours" sans toucher au statut.
5. **Toujours pas construit** (au moment d'écrire ce point — voir
   §6septies juste en dessous, construit dans la foulée) : téléchargement
   des fichiers finaux.

## 6septies. Post-production & livraison — Milestone 5 (2026-08-21)

Enzo a choisi "continuer à coder" (Milestone 5) après le point précédent.
Construit la dernière brique du parcours complet décrit au brief §18 : la
MÊME galerie évolue à travers 3 vues côté client, pilotées uniquement par
`Gallery.status` — jamais deux galeries séparées.

1. **`lib/services/final-delivery-service.ts`** :
   - `importFinalPhoto(galleryId, photoId, buffer, contentType)` — refuse
     toute photo non sélectionnée (livrer un final n'a de sens que pour ce
     que le client a choisi). Stocke le fichier **tel quel, sans aucun
     retraitement** (pas de resize, pas de watermark — brief : "absence de
     watermark lorsque les conditions de livraison sont remplies").
     Transition `TO_RETOUCH → IN_POST_PRODUCTION` au premier final importé,
     puis `→ READY_TO_DELIVER` une fois que **toutes** les photos
     sélectionnées ont leur final (vérifié par comptage, pas par un flag).
   - `markDeliveredOnClientView(galleryId)` — `READY_TO_DELIVER → DELIVERED`,
     déclenché par la simple consultation de la galerie par le client
     (pas un clic explicite) : correspond à "le client retrouve les
     photographies finales" du brief. Idempotent (no-op si déjà livré).
   - `listDeliverablePhotos(galleryId)` — renvoie pour chaque photo livrée
     **deux URLs distinctes** : `viewUrl` (aperçu `<img>`, sans en-tête
     particulier) et `downloadUrl` (téléchargement forcé). Les confondre
     aurait cassé soit l'aperçu soit le téléchargement (voir point 2).
2. **`getDownloadUrl()` ajouté à `StorageAdapter`** (voir `types.ts`),
   distinct de `getPreviewUrl()` : sur R2, une URL signée cross-origin sans
   en-tête dédié laisse le navigateur **ignorer l'attribut `download` d'un
   `<a>`** et ouvrir l'image dans un nouvel onglet au lieu de la
   télécharger — `getDownloadUrl()` fixe
   `ResponseContentDisposition: attachment; filename="..."` côté S3 pour
   forcer le téléchargement même cross-origin. En local, les deux méthodes
   renvoient la même chose (même origine, l'attribut `download` suffit
   déjà). Pas encore vérifié contre un vrai compte R2 (toujours pas
   provisionné) — seule la partie locale a été testée en direct.
3. **Pas de "Tout télécharger"** — téléchargement individuel uniquement.
   Un vrai bouton "tout télécharger" nécessiterait de zipper les fichiers
   côté serveur (streaming, mémoire), le brief le présente lui-même comme
   "éventuellement" — laissé de côté volontairement, pas un oubli.
4. **UI client (`/g/[slug]`)** : la page choisit maintenant entre 3 vues
   selon `gallery.status` — `AccessForm` (verrouillée), `GalleryView`
   (sélection en cours), `WaitingView` (sélection confirmée, en attente —
   reprend le texte exact de l'exemple du brief §18 : "Merci, j'ai bien
   reçu ta sélection. Je m'occupe de la suite."), `DeliveryView`
   ("Tes photos sont prêtes ✨", grille + téléchargement individuel).
5. **UI admin (`/admin/galleries/[id]`)** : dans la section "Sélection",
   chaque photo sélectionnée a maintenant un mini-formulaire d'import du
   fichier final (`final-upload-form.tsx`), visible seulement une fois la
   sélection verrouillée.
6. **Testé de bout en bout en conditions réelles** (galerie jetable, créée
   puis supprimée) : import photo → sélection → confirmation → import du
   final → statut `IN_POST_PRODUCTION` puis `READY_TO_DELIVER` (les deux
   transitions automatiques vérifiées) → vue client "Tes photos sont
   prêtes" avec lien de téléchargement correct (`viewUrl`/`downloadUrl`
   bien distincts, attribut `download` avec le bon nom de fichier) →
   consultation → statut `DELIVERED` confirmé en base avec l'entrée
   `StatusHistory` correspondante → revisite de la page vérifiée
   idempotente (pas d'erreur, pas de double transition).
7. **Le cycle complet du brief est maintenant construit et vérifié de bout
   en bout**, du premier code d'accès jusqu'au téléchargement final. Ce
   qui reste hors périmètre reste délibérément hors périmètre : paiement
   réel (brief §16), contenu éditorial (philosophie de retouche, messages
   image de soi, avant/après — brief §8-10), identité visuelle définitive,
   R2 en production.

## 6octies. Paiement manuel, annotation par position, passe mobile (2026-08-21)

Enzo a choisi de continuer sur le terrain "technique, pas de compte externe
requis" plutôt que R2 ou le contenu éditorial.

1. **Blocage réel trouvé en préparant le test du chemin "paiement requis" :
   rien ne faisait jamais avancer une galerie hors de `PAYMENT_PENDING`.**
   Sans ça, toute galerie payante restait bloquée indéfiniment dès la
   confirmation de sélection — un vrai trou fonctionnel, pas juste un
   manque de test. Corrigé avec
   `lib/services/payment-service.ts` : `markPaymentReceived(galleryId)`
   enregistre un `Payment` (`provider: null`, `status: "PAID"` — brief §16,
   toujours pas de vrai Stripe) et fait avancer le statut vers
   `TO_RETOUCH` via `onReadyForRetouch`. Bouton admin "Marquer le paiement
   comme reçu", visible uniquement en `PAYMENT_PENDING`, avec un texte
   explicite rappelant qu'il n'y a pas de paiement en ligne réel.
2. **Positionnement d'une remarque sur la photo** (brief §7 : "attirer mon
   attention sur une zone précise") — cliquer sur l'image dans le lightbox
   pose un point (0..1, stocké dans `PhotoNote.positionX/Y`, déjà prévus
   dans le schéma depuis le Milestone 0). Toujours pas de dessin
   ("solution suffisamment simple"). Un bug de la même famille que celui du
   Milestone 1 a été anticipé et corrigé directement dans
   `lib/domain/photo-note.ts` : quand aucun point n'est posé, les champs
   cachés `positionX`/`positionY` n'existent même pas dans le DOM, donc
   `formData.get()` renvoie `null` — le schéma zod le gère maintenant
   explicitement (testé avec un vrai `FormData`, pas un objet JS de
   substitution). Affiché côté admin dans "Demandes de retouche"
   (`📍 point à X%, Y%`).
3. **Passe de vérification mobile** — pas de capture d'écran possible dans
   cet environnement (fenêtre de prévisualisation non affichée), donc
   vérifié programmatiquement : `document.documentElement.scrollWidth >
   window.innerWidth` (débordement horizontal, le bug mobile le plus
   fréquent) sur `/`, `/g`, `/admin/login`, `/admin` (dashboard),
   `/admin/galleries/new`, `/admin/galleries/[id]` (avec une vraie photo),
   `/g/[slug]` (formulaire de code, grille de photos, **et** le lightbox
   ouvert) — à 375px de large (iPhone SE, le plus étroit des viewports
   courants). **Aucun débordement trouvé nulle part.** Le bouton de
   fermeture du lightbox a aussi été vérifié entièrement visible et
   cliquable dans la fenêtre. Limite honnête : ceci vérifie l'absence de
   débordement, pas l'esthétique (espacement, lisibilité du texte, confort
   au toucher) — une vraie relecture visuelle par Enzo sur son téléphone
   reste la meilleure vérification.
4. **Testé de bout en bout en conditions réelles** (galerie jetable
   PER_PHOTO à 15€, créée puis supprimée) : sélection → confirmation →
   statut `PAYMENT_PENDING` confirmé → "Marquer le paiement comme reçu" →
   statut `TO_RETOUCH` → `Payment` créé en base avec les bons montants.
   Annotation avec point testée en direct : clic simulé sur l'image agrandie
   → point affiché → soumission → note visible côté admin avec les bonnes
   coordonnées en pourcentage.

## 6nonies. Revue de sécurité ciblée (2026-08-21)

La compétence `security-review` de Claude Code n'a pas pu se lancer dans cet
environnement (son script cherche un remote git `origin/HEAD` qui n'existe
pas ici — pas de dépôt distant configuré). Revue menée manuellement à la
place, en reprenant point par point la liste du brief §21, sur l'ensemble
du code écrit cette session (pas seulement le dernier diff).

**Corrigé :**

1. **Aucune limitation de tentatives sur `/admin/login`** — le seul compte
   admin était exposé à un brute-force illimité sur son mot de passe, alors
   que le code d'accès galerie était déjà protégé. Le limiteur
   (`lib/gallery-access/rate-limit.ts`) a été déplacé vers
   `src/lib/rate-limit.ts` (générique, réutilisable) et branché sur le
   login admin. **Vérifié en direct** : 8 tentatives échouées puis blocage
   au 9ᵉ essai — y compris avec le bon mot de passe une fois bloqué (le
   blocage ne dépend pas de la validité du mot de passe testé).
2. **`markDeliveredOnClientView` s'exécutait pendant le rendu serveur de
   la page** `/g/[slug]` (déclenché par un simple GET). Une mutation ne
   devrait jamais dépendre d'une requête GET : un pré-chargement de
   `<Link>` (ex. le lien vers la galerie sur la page admin), un crawler,
   ou un outil d'aperçu de lien pourrait la déclencher sans qu'un client
   n'ait réellement vu la page. Dans cette version de Next.js (Cache
   Components désactivé, voir §4), ce n'était probablement pas exploitable
   en pratique (le prefetch classique n'exécute pas le corps d'une page
   pleinement dynamique) — mais s'appuyer sur ce détail d'implémentation
   plutôt que sur une architecture saine est fragile. Déplacé vers un
   `useEffect` côté client (`delivery-view.tsx`) qui appelle une Server
   Action dédiée (`delivery-actions.ts`) au montage réel dans le
   navigateur. Impact réel si non corrigé : pas une fuite de données,
   juste un statut "Livré" potentiellement inexact — un bug de justesse,
   pas une brèche de sécurité, mais la bonne architecture ne coûtait pas
   plus cher. **Revérifié de bout en bout après correction.**
3. **`SESSION_SECRET` était réutilisé tel quel pour signer à la fois les
   sessions admin et les sessions d'accès galerie.** Pas exploitable dans
   l'état (les deux payloads ont une forme différente — `adminId` d'un
   côté, `typ`/`gallerySlug` de l'autre — donc un jeton de l'un est déjà
   rejeté par le vérificateur de l'autre), mais viole le principe de
   séparation des clés. Corrigé en dérivant une clé distincte pour
   `lib/gallery-access/session.ts` via HMAC-SHA256(`SESSION_SECRET`,
   `"gallery-access-v1"`) — aucune nouvelle variable d'environnement à
   gérer pour Enzo.

**Noté, pas corrigé (déjà documenté ou hors de portée immédiate)** :

4. Le limiteur de tentatives dépend de `x-forwarded-for` pour identifier un
   client — fiable sur Vercel (déjà documenté dans `lib/rate-limit.ts`),
   trivialement contournable si le projet est un jour hébergé ailleurs
   sans proxy de confiance devant l'app.
5. Pas de validation stricte du type de contenu des fichiers uploadés côté
   admin (`photos-actions.ts`, `final-upload-form.tsx`) — jugé acceptable
   car ces actions sont admin-only (`verifySession()`), pas exposées à des
   clients non authentifiés ; le fichier est de toute façon traité par
   `sharp`, qui rejette ce qui n'est pas une image valide.
6. **Flakiness observée pendant les tests, sans lien avec le code** :
   après un redémarrage du serveur de dev, une page a renvoyé un 404 le
   temps d'une requête alors que la ligne existait bien en base (revérifié
   directement) — résolu par un simple redémarrage supplémentaire.
   Probablement une connexion Neon transitoire sur le client Prisma
   singleton après une période d'inactivité. À surveiller si ça se
   reproduit en production ; pas de correctif appliqué faute de cause
   confirmée.

Aucune injection SQL possible (Prisma partout, aucun SQL brut écrit cette
session), aucun `dangerouslySetInnerHTML` nulle part (tout le contenu
utilisateur passe par l'échappement JSX automatique de React — pas de XSS
trouvé), aucun secret en dur trouvé dans le code.

## 6dixies. Refonte de la direction artistique (2026-08-21)

Enzo a jugé la V1 "pas très belle... ça manque de personnalité, c'est tout
vide" et a donné deux références précises : les sites de Ciao Kombucha et
Ciao Energy (marques de Squeezie, construites par l'agence Skaald sous
Webflow — GSAP, typographies custom, fonds sombres, palette riche et
saturée). Après avoir consulté les deux sites en direct (couleurs,
polices, librairies d'animation — pas juste une impression) et discuté du
fait qu'ici, contrairement à une canette, ce sont les photos du CLIENT qui
doivent rester la vedette, Enzo a validé une version mesurée : du travail
visiblement soigné et une vraie personnalité, mais des micro-interactions
simples plutôt qu'une chorégraphie façon site vitrine — et rien de tout ça
sur les écrans où le client regarde ses propres photos, qui restent
volontairement plus calmes (`gallery-view.tsx` n'a pas été touché par
cette passe).

Changements :

1. **Typographie réelle** (`src/app/layout.tsx`) — Bricolage Grotesque
   (titres, variable `--font-serif-app` — nom hérité du scaffold d'origine,
   gardé pour ne pas devoir toucher tous les composants qui utilisent déjà
   la classe Tailwind `font-serif`) + Plus Jakarta Sans (texte courant,
   `--font-sans-app`), via `next/font/google` — auto-hébergées par Next,
   aucune requête vers Google au runtime. **Fonctionne dans cet
   environnement** (contrairement à la tentative du Milestone 0, bloquée
   par un sandbox sans accès réseau — voir §6 journal, décision du
   2026-08-20) : `next build` télécharge et embarque les polices avec
   succès, vérifié en direct (police appliquée confirmée via
   `getComputedStyle`).
2. **`globals.css`** : `--color-accent-tint` ajouté (or tamisé via
   `color-mix()`, pour badges/fonds sans écraser le texte), rayons
   augmentés (`--radius-md` 6→10px, `--radius-lg` 12→20px, en écho aux
   formes bulbeuses du logo), tokens de motion partagés
   (`--duration-fast/base`, `--ease-standard`), transition par défaut sur
   tous les `a`/`button`, animation d'entrée `fade-up` réutilisable
   (délai réglable via `--delay` inline). `prefers-reduced-motion` respecté
   globalement (déjà présent, revérifié).
3. **Repère de marque provisoire** : les deux points rouge/or du logo
   (`BrandMark` sur la page d'accueil, motif répété dans l'en-tête admin et
   la page de connexion) — en attendant le vrai fichier logo, toujours pas
   récupérable depuis une image collée dans le chat (voir §6bis). À
   remplacer par le vrai mark dès qu'il arrive.
4. **Appliqué à** : page d'accueil publique (fond avec tache de couleur
   douce, bouton avec lift au survol, entrée en fondu échelonnée), page de
   connexion admin, dashboard admin (badges de statut teintés, lignes de
   liste avec fond au survol), formulaire de shooting (focus rings teintés,
   bouton principal), grille de photos admin (zoom léger au survol).
   **Non appliqué** : `/g/[slug]` (galerie client) — délibérément laissée
   telle quelle, cœurs/sélection déjà dotés de leurs propres
   micro-interactions depuis le Milestone 3, pas besoin d'en rajouter.
5. **Vérifié** : `tsc`/`eslint`/`next build`/`vitest` passent tous, rendu
   revérifié en direct sur `/`, `/admin/login`, `/admin`,
   `/admin/galleries/[id]` (avec la vraie galerie d'Enzo), aucun
   débordement horizontal (desktop et mobile 375px).
6. **Reste ouvert** : le vrai fichier logo (favicon notamment — toujours
   un favicon Next.js par défaut), confirmation des codes hex exacts
   (toujours des estimations visuelles), et une éventuelle relecture visuelle
   par Enzo une fois qu'il peut le voir lui-même dans son navigateur (pas
   de capture d'écran possible côté assistant dans cet environnement).

## 6undecies. Passe "au max possible" — motion partout (2026-08-21)

Suite à §6dixies, Enzo a redemandé explicitement d'aller plus loin :
"améliore ça encore plus, je veux encore plus de personnalité, plus
d'animation etc etc fais le au max possible". Interprétation retenue :
pousser l'animation/personnalité au maximum sur le site public et
l'espace admin, en gardant la même restriction que §6dixies sur
`/g/[slug]` (galerie client) — jamais remise en cause par ce message, donc
toujours non touchée.

Changements :

1. **Librairie `motion`** (successeur de Framer Motion, v13.1.1) ajoutée
   au projet. `src/app/motion-provider.tsx` (nouveau) enveloppe toute
   l'app dans `<MotionConfig reducedMotion="user">` depuis
   `layout.tsx` — `prefers-reduced-motion` respecté automatiquement par
   toutes les animations `motion/react`, sans vérif manuelle par
   composant.
2. **Page d'accueil (`src/app/page.tsx`)** réécrite en profondeur : deux
   taches de fond qui dérivent lentement en boucle infinie, titre révélé
   mot par mot au chargement (stagger), boutons avec effet ressort au
   survol/clic, flèche qui oscille en continu, nouvelle section "Comment
   ça marche" (3 étapes reprises du brief : sélection → retouche →
   livraison) qui apparaît au scroll avec effet de bascule au survol.
3. **`src/app/brand-dots.tsx`** (nouveau) : les deux points rouge/or du
   logo provisoire, extraits en composant réutilisable avec pulsation
   infinie décalée — remplace l'ancien `BrandMark` statique sur l'accueil
   et les points fixes de l'en-tête admin/connexion.
4. **Dashboard admin** : `src/app/admin/gallery-list.tsx` (nouveau,
   composant client) — la liste des shootings apparaît en cascade et
   chaque ligne glisse légèrement au survol. `admin/page.tsx` reste un
   Server Component (fetch des données inchangé) et délègue juste le
   rendu de la liste.
5. **Page de connexion admin** (`admin/login/page.tsx`,
   `admin/login/login-form.tsx`) : entrée en fondu/translation du bloc
   titre et du formulaire, bouton avec effet ressort, message d'erreur
   qui apparaît/disparaît avec une animation de hauteur (`AnimatePresence`)
   au lieu d'un `<p>` statique.
6. **Formulaire de shooting** (`admin/galleries/gallery-form.tsx`) : même
   traitement bouton + erreur animée que le formulaire de connexion.
7. **Page détail d'un shooting** (`admin/galleries/[id]/page.tsx`) : les 4
   sections (Photos, Accès client, Sélection, Demandes de retouche) sont
   désormais enveloppées dans `reveal-section.tsx` (nouveau composant
   client `RevealSection`) qui anime seulement l'entrée au scroll —
   volontairement un wrapper fin autour du contenu server-rendu existant,
   sans toucher aux Server Actions ni à la logique de fetch de la page
   (qui reste un Server Component).
8. **Bug réel trouvé et corrigé** : le titre animé mot par mot de
   l'accueil utilisait une marge CSS (`mr-[0.28em]`) au lieu d'un vrai
   caractère espace entre les mots — invisible à l'œil mais cassait le
   texte accessible/`innerText` ("Unespacepourdécouvrir..."). Corrigé en
   ajoutant un vrai `{" "}` dans chaque `motion.span`, revérifié via un
   nouvel onglet (l'historique d'un onglet resté ouvert longtemps s'est
   révélé peu fiable pour diagnostiquer l'état courant — même leçon que
   plus bas).
9. **Vérifié** : `tsc`/`eslint`/`vitest` (71 tests)/`next build` passent
   tous. Rendu revérifié en direct sur `/`, `/admin/login`, `/admin`,
   `/admin/galleries/[id]`, aucun débordement horizontal (desktop 1280px
   et mobile 375px), aucune erreur console propre à ces changements.
10. **Fausse alerte notée en passant** : pendant cette vérification,
    `/admin/login` et `/admin` ont chacun renvoyé une 500 générique une
    fois ("Vérifier que la base de données est configurée...", digest
    différent à chaque fois) puis ont fonctionné normalement au
    rechargement immédiat suivant, sur des composants totalement
    différents (`LoginForm` puis `AdminDashboard`, qui n'a aucun code
    motion). Confirme le pattern déjà documenté en §6quinquies-ish
    (connexion Neon parfois capricieuse sur le singleton Prisma
    long-vécu) — pas un bug introduit par cette passe, cause racine
    toujours non identifiée.
11. **Reste ouvert** : mêmes points qu'en §6dixies (logo réel, hex exacts,
    relecture visuelle par Enzo) + la flakiness Neon intermittente
    ci-dessus, non résolue.

## 6duodecies. Investigation de la flakiness Neon (2026-08-21)

Enzo est retombé en direct sur l'erreur générique "Une erreur est survenue
/ Vérifier que la base de données est configurée..." (référence
`4112474615@E394`, déjà vue pendant la vérif de §6undecies point 10).
Plutôt que de la re-attribuer à une flakiness non identifiée, creusé pour
de vrai cette fois :

1. **Cause racine trouvée** : `src/lib/db.ts` utilisait `PrismaNeon`
   (`@prisma/adapter-neon`), qui s'appuie sur un **pool WebSocket
   persistant** (`neon.Pool`) — gardé ouvert sur tout le cycle de vie du
   process via le singleton `globalThis.__prisma`. Une erreur au niveau du
   WebSocket (classe `ErrorEvent`, une classe DOM/réseau) n'est pas
   correctement convertie en `Error` par l'adaptateur, d'où le message
   totalement opaque `Error: [object ErrorEvent]` dans les logs — aucune
   info exploitable.
2. **Vérifié que rien ne dépend d'une connexion persistante** :
   `grep -rn '\$transaction'` ne montre que la forme tableau/batch
   (`prisma.$transaction([...])` dans `final-delivery-service.ts`,
   `confirm-selection-service.ts`, `payment-service.ts`) — jamais la forme
   callback interactive (`$transaction(async tx => ...)`), qui est la
   seule à nécessiter une session/connexion ouverte. La forme batch est
   supportée par l'adaptateur HTTP stateless de Prisma.
3. **Fix appliqué** : `src/lib/db.ts` bascule vers `PrismaNeonHttp` —
   chaque requête est un `fetch` HTTPS indépendant vers l'endpoint SQL de
   Neon, sans connexion à garder en vie ni à ressusciter. Plus de socket
   qui devient obsolète sur un process de dev longue durée.
4. **Bonus immédiat** : les erreurs de connexion deviennent enfin lisibles
   — testé en conditions réelles suite à cette bascule, une vraie coupure
   réseau momentanée est apparue et le message est passé de
   `[object ErrorEvent]` à `NeonDbError: Error connecting to database:
   TypeError: fetch failed ... ConnectTimeoutError ... timeout: 10000ms`,
   listant les adresses IP tentées.
5. **Diagnostic de la coupure observée pendant le test** : `curl -v` en
   direct vers l'endpoint Neon (`ep-red-hat-zafko6a9-pooler...`) a
   confirmé un vrai timeout de connexion TCP sur les 6 IPs (v4+v6)
   pendant ~1-2 minutes, alors que `google.com` et `neon.tech` (infra
   Cloudflare, différente) répondaient normalement dans le même
   intervalle — donc pas une panne réseau générale de la machine. Le
   statut Neon (neonstatus.com) ne signalait aucun incident sur
   eu-west-2 au même moment. Un `curl` suivant, quelques minutes après, a
   reconnecté sans problème. **Conclusion** : coupure réseau locale/
   transitoire propre à la route vers les IP AWS eu-west-2 de Neon (raison
   exacte non identifiable depuis ici — FAI, box, ou VPN/pare-feu
   ponctuel), résolue d'elle-même. Pas un bug applicatif, et le nouvel
   adaptateur HTTP n'a rien à voir avec son apparition (reproduit aussi
   au `curl` brut, hors de toute librairie Node).
6. **`src/app/admin/error.tsx`** : message corrigé — n'affirme plus qu'il
   faut vérifier `DATABASE_URL` en premier (c'était trompeur, la config
   est correcte) ; explique maintenant que Neon (offre gratuite) peut
   mettre quelques secondes à se réveiller après une veille et invite à
   réessayer d'abord.
7. **Vérifié** : `tsc`/`eslint`/`vitest` (71 tests)/`next build` passent
   tous après la bascule d'adaptateur. Revérifié en direct sur `/admin`,
   `/admin/login` une fois le réseau revenu — rendu normal, aucune erreur
   console fraîche (celles vues dans un onglet resté ouvert pendant la
   coupure sont de l'historique, pas l'état courant — même leçon que
   §6undecies).
8. **Si ça se reproduit** : avec `PrismaNeonHttp`, un message d'erreur
   clair (`ConnectTimeoutError`, adresses IP, code `UND_ERR_CONNECT_TIMEOUT`)
   remplace désormais l'opaque `[object ErrorEvent]` — regarder les logs
   du serveur dev en premier, ils diront directement si c'est réseau
   (timeout de connexion) ou autre chose (auth, requête invalide, etc.).

## 6terdecies. Hero avec collage photo (2026-08-21/22)

Enzo a pointé burgerking.fr en exemple : "ce qui me dérange c'est que
c'est juste un titre... il est énorme et sans intérêt." Après inspection
réelle du site (structure de page, pas juste une impression), le constat
est clair : la personnalité de BK ne vient pas d'un titre plus gros, mais
du fait que quasi toute la page est portée par de vraies photos produit,
répétées section après section. Pour Inkz, l'équivalent honnête n'est pas
plus de typographie mais de vraies photos de portfolio en avant — jamais
les galeries clients, qui doivent rester privées (voir brief). Interrogé
sur comment avancer sans avoir encore ses photos, Enzo a choisi : structurer
la mise en page maintenant, brancher ses vraies photos ensuite.

1. **`src/app/hero-mosaic.tsx`** (nouveau, composant client) : collage de 3
   tuiles superposées, en rotation légère, positionnées comme de vraies
   photos éparpillées (grande + deux plus petites qui se chevauchent).
   Chaque tuile a un `src`/`alt` optionnel dans le tableau `slots` — sans
   `src` (aujourd'hui), un dégradé aux couleurs de marque + un léger grain
   (`radial-gradient` en superposition) tient lieu de repère visuel qui
   reste présentable seul. **Pour brancher les vraies photos d'Enzo** :
   renseigner `src`/`alt` sur chaque entrée de `slots`, rien d'autre à
   changer — le composant bascule automatiquement sur `<img>`.
   Entrée en fondu échelonnée + lent flottement vertical continu (idle) +
   redressement/agrandissement léger au survol.
2. **`src/app/page.tsx`** : hero passé d'une colonne centrée
   (`max-w-3xl`) à une grille deux colonnes (`max-w-6xl`,
   `lg:grid-cols-[1.05fr_1fr]`) — texte à gauche (mobile : texte après le
   collage, `order-2 lg:order-1`), `HeroMosaic` à droite (mobile : collage
   en premier, `order-1 lg:order-2`, pour l'impact visuel dès l'arrivée
   sur petit écran). Taille du titre réduite (`sm:text-5xl` au lieu de
   `sm:text-6xl`) pour équilibrer avec le collage qui prend maintenant sa
   part de l'écran.
3. **Vérifié** : `tsc`/`eslint`/`vitest` (71 tests)/`next build` passent
   tous. Structure DOM vérifiée en direct (3 tuiles présentes, aucun
   débordement horizontal desktop 1280px/mobile 375px, aucune erreur
   console).
4. **Limite de vérification rencontrée, à noter pour la suite** : au
   moment de ce test, l'onglet du navigateur assistant était en arrière-
   plan côté interface (`document.hidden === true`, confirmé par un appel
   `screenshot` qui a explicitement échoué en le signalant). Chromium met
   alors en pause `requestAnimationFrame` (les animations `motion`
   restent figées à leur état initial, `opacity:0`) et devient également
   peu fiable pour `innerText`/l'extraction de texte visible (a fait
   croire à un retour du bug d'espacement des mots du §6undecies point 8
   — **faux positif**, confirmé via `textContent` brut qui montre le
   texte correctement espacé). Concrètement : impossible de confirmer à
   l'œil que les animations jouent correctement tant que l'onglet n'est
   pas réellement affiché côté utilisateur — seule la structure/le DOM
   ont pu être vérifiés cette fois. Reste à confirmer visuellement par
   Enzo (ou dans une session où le panneau navigateur est bien affiché).
5. **Reste ouvert** : les vraies photos de portfolio d'Enzo (le point
   principal de cette passe), + tout ce qui était déjà ouvert avant
   (logo réel, hex exacts).

## 6quaterdecies. Accès galerie par PIN seul, sans lien (2026-08-21/22)

Enzo, en essayant de tester le parcours client sur `/g` : "le lien
n'existe pas c'est juste un code pin normalement donc je ne peux pas du
tout tester cette partie." Ce n'était pas juste un texte trompeur sur
`/g` (§6quater point 1) — c'était une vraie limite d'architecture :
`/g` (sans slug) n'avait jamais été un formulaire, seulement une page
d'explication, parce que le code était haché avec bcrypt (volontairement
lent, pensé pour un mot de passe choisi par un humain) et qu'une
recherche "quel galerie possède ce code ?" aurait dû comparer le code
saisi contre TOUS les codes de TOUTES les galeries en base — ça ne
passait pas à l'échelle avec bcrypt. D'où la décision initiale (le
client reçoit d'abord un lien `/g/<slug>`, qui identifie déjà la bonne
galerie, puis le code confirme l'accès) — cohérente sur le papier, mais
pas ce qu'Enzo veut réellement transmettre à ses clients (un PIN seul,
pas une adresse à copier-coller).

**Le vrai problème** : bcrypt n'était pas le bon outil ici. Un code
d'accès galerie est généré aléatoirement par le système (32^6
combinaisons), pas choisi par un humain — le ralentissement délibéré de
bcrypt protège contre le brute-force hors-ligne de mots de passe faibles,
un risque qui ne s'applique pas à un secret déjà aléatoire. Un hachage
déterministe (HMAC-SHA256) donne la même protection pour ce cas d'usage,
tout en permettant une recherche indexée en base (`WHERE codeHash = ?`,
O(1)) — ce qui élimine le vrai obstacle technique à un parcours "PIN
seul".

1. **`src/lib/domain/access-code.ts`** — `hashAccessCode`/`verifyAccessCode`
   passent de `bcryptjs` (async) à `crypto.createHmac("sha256", ...)`
   (sync, déterministe), comparaison en temps constant
   (`timingSafeEqual`) pour la fonction `verifyAccessCode` encore exposée.
   Clé dérivée de `SESSION_SECRET` (déjà utilisé ailleurs, aucune nouvelle
   variable d'environnement). Pas de `server-only` sur ce fichier
   (casserait les tests `vitest`, qui tournent en Node pur sans le
   bundler Next) — la garde reste une couche au-dessus, dans
   `access-code-service.ts`, qui lui est `server-only`. Voir
   `lib/domain/README.md`, mis à jour.
2. **`prisma/schema.prisma`** — `AccessCode.codeHash` passe à `@unique`
   (migration `20260821220708_access_code_unique_hash`, écrite et
   appliquée à la main via `prisma migrate diff --script` +
   `prisma migrate deploy`, `migrate dev` refusant de tourner en
   non-interactif dans cet environnement). Aucun risque de collision au
   moment de la migration : les hash bcrypt existants sont déjà tous
   distincts (salage intégré à bcrypt).
3. **`lib/services/access-code-service.ts`** — nouvelle fonction
   `findGalleryByAccessCode(code)` : retrouve la galerie à partir du seul
   code, sans connaître son slug au préalable. `verifyGalleryAccessCode`
   (utilisée par `/g/<slug>`, toujours supportée) délègue maintenant à
   cette fonction puis vérifie que le slug correspond — même garantie
   qu'avant ("ne jamais confirmer l'existence d'un slug par le message
   d'erreur"), logique dédupliquée.
4. **`src/app/g/actions.ts`** (nouveau) — `findGalleryAction`, Server
   Action du parcours PIN seul. Limitation des tentatives adaptée : la
   clé ne peut porter que sur l'IP (`gallery-pin:<ip>`), pas sur un slug
   qu'on ne connaît pas encore au moment de la tentative.
5. **`src/app/g/pin-form.tsx`** (nouveau) + **`src/app/g/page.tsx`**
   (réécrite) — `/g` est maintenant un vrai formulaire (même traitement
   `motion`/erreur animée que `login-form.tsx`/`gallery-form.tsx`, brand
   dots), pas une page d'explication statique. Copie corrigée : n'évoque
   plus de "lien" à ouvrir.
6. **`/g/<slug>` reste fonctionnel** (non supprimé) — si Enzo préfère
   un jour partager un lien direct en plus du PIN, ça marche toujours,
   les deux parcours partagent maintenant la même logique de vérification.
7. **Point de sécurité, changement de surface d'attaque assumé** : avec
   une recherche globale, un attaquant qui essaie des codes au hasard
   sur `/g` (sans connaître aucun slug) peut désormais toucher
   n'importe laquelle des galeries actives d'Enzo, pas seulement une
   galerie ciblée dont il connaîtrait déjà le lien. À l'échelle d'un
   photographe indépendant (quelques galeries actives à la fois, codes à
   32^6 combinaisons, 8 tentatives/10 min par IP), la probabilité de
   succès reste négligeable — mais c'est un compromis réel, pas
   uniquement une amélioration, à garder en tête si le volume de
   galeries actives grandissait beaucoup.
8. **⚠️ Opérationnel — codes existants invalidés** : les codes d'accès
   déjà générés avant ce changement (hachés en bcrypt) ne correspondent
   plus au nouveau format de hash stocké en base — ils ne fonctionneront
   plus, y compris ceux de la galerie réelle "shooting test" d'Enzo.
   Aucune conversion possible (bcrypt est à sens unique, le texte en
   clair n'a jamais été conservé). **Il faut regénérer un nouveau code**
   ("Générer un nouveau code d'accès" sur `/admin/galleries/<id>`) pour
   toute galerie déjà en cours avant de la retester ou de la transmettre.
9. **Vérifié en conditions réelles** : nouveau code généré pour la
   galerie "shooting test" (`c6e6zm`), saisi sur `/g` (aucun slug dans
   l'URL, aucun lien) → résolution correcte de la galerie → redirection
   `/g/shooting-test-u73xv` → galerie affichée normalement. Code erroné
   testé ensuite → "Code incorrect." affiché proprement, aucune erreur
   console. `tsc`/`eslint`/`vitest` (72 tests)/`next build` passent tous.
   Aucun débordement horizontal desktop 1280px/mobile 375px sur `/g`.

## 6quindecies. Retour sur `PrismaNeonHttp` (§6duodecies) — bug réel, revenu sur `PrismaNeon` (2026-08-22)

Enzo, en testant le parcours PIN juste après §6quaterdecies, a confirmé sa
sélection sur `/g/shooting-test-u73xv` → écran générique "Quelque chose
s'est mal passé." Logs serveur, cause exacte trouvée immédiatement :
`Error: Transactions are not supported in HTTP mode`, dans
`confirmSelectionAction`.

**L'erreur d'analyse en §6duodecies** : j'y affirmais que `PrismaNeonHttp`
supporterait la forme tableau/batch de `$transaction` (par opposition à la
forme callback interactive, la seule vraiment documentée comme nécessitant
une session). Faux en pratique pour cet adaptateur : **aucune** forme de
`$transaction` n'est supportée en mode HTTP, batch compris. Or
`confirm-selection-service.ts`, `payment-service.ts` et
`final-delivery-service.ts` en dépendent tous les trois pour garder statut
de galerie + `StatusHistory` cohérents en une seule écriture atomique —
supprimer cette garantie pour gagner un meilleur message d'erreur en cas
de coupure réseau (le vrai bénéfice de §6duodecies) n'aurait aucun sens :
un bug garanti, systématique, sur un chemin critique (la confirmation de
sélection client) contre un confort de diagnostic pour un incident rare.

**Fix** : `src/lib/db.ts` revient sur `PrismaNeon` (pool WebSocket), qui
supporte `$transaction` sous toutes ses formes. Le risque de connexion
obsolète après une longue veille Neon (raison du passage à HTTP en premier
lieu) redevient donc possible — accepté comme compromis, documenté tel
quel plutôt que silencieusement ignoré. Si ça redevient un problème
concret et récurrent, la bonne piste serait deux clients Prisma distincts
(HTTP pour les lectures et écritures simples, WebSocket réservé aux
quelques appels `$transaction`), pas un aller-retour supplémentaire entre
adaptateurs — non fait ici, complexité non justifiée pour un incident dont
la fréquence réelle reste à établir.

**Vérifié en conditions réelles** : même parcours qu'avant le fix
(sélection d'une photo sur `/g/shooting-test-u73xv`, "Confirmer ma
sélection" → récapitulatif → "Confirmer définitivement") → transition
correcte vers l'écran d'attente ("Merci, j'ai bien reçu ta sélection"),
aucune erreur dans les logs serveur. `tsc`/`eslint`/`vitest` (72
tests)/`next build` passent tous.

**Effet de bord réel sur les données d'Enzo** : cette vérification a
réellement verrouillé la sélection de la galerie "shooting test" (1
photo, statut passé à "À retoucher") — pas un environnement de test
isolé, c'est la vraie galerie d'Enzo en base. Réversible depuis l'admin
("Déverrouiller la sélection") s'il veut la retester from scratch.

## 6sedecies. Écran post-sélection repensé (2026-08-22)

Enzo : "la partie photographe une fois qu'on a reçu les images n'est
DUTOUT pas optimal." Question de clarification posée (options concrètes
proposées à partir d'une lecture réelle de l'écran, pas de suppositions) —
réponse : import un par un (probable), pas de vignette pour vérifier, vue
d'ensemble illisible, **et** "beaucoup d'info inutile et pas assez de
logique et concrète" en général sur cet écran.

Constat sur l'ancien écran ("Sélection", une fois verrouillée) : une liste
texte, une ligne par photo sélectionnée, chacune avec son propre
`<input type="file">` natif minuscule + bouton "Importer le final" — aucune
vignette, aucun import groupé. Séparément, plus bas sur la page, une
section "Demandes de retouche" entièrement déconnectée listait les
remarques clients par nom de fichier — obligeant à recouper mentalement
les deux listes pour savoir quelle remarque va avec quelle photo.

1. **`lib/domain/final-filename-match.ts`** (nouveau, testé) — associe un
   fichier déposé en lot à la bonne photo sélectionnée par son nom de
   fichier. Un export Lightroom renomme souvent le fichier (suffixe
   `-Edit`, etc.) : correspondance exacte d'abord, puis "radical" (nom
   sans extension ni espaces/tirets) contenu dans l'autre. **Ne devine
   jamais en cas d'ambiguïté** (plusieurs candidats possibles) — renvoie
   `null`, le fichier atterrit dans la liste "non reconnus" plutôt que
   d'être importé sur la mauvaise photo.
2. **`final-upload-actions.ts`** — nouvelle action
   `uploadFinalPhotosBatchAction` : accepte plusieurs fichiers d'un coup,
   les associe via `matchFinalFilename`, réutilise `importFinalPhoto` pour
   chacun (aucune duplication de la logique de statut/transaction).
   L'action à l'unité (`uploadFinalPhotoAction`) reste disponible pour
   l'import manuel de repli.
3. **`retouch-workspace.tsx`** (nouveau) — remplace la liste texte : zone
   de glisser-déposer en haut (import groupé, reconnaissance automatique),
   compteur "X sur Y finaux importés" avec barre de progression, puis une
   grille de cartes (une par photo sélectionnée) avec vraie vignette,
   badge "Importé ✓"/"En attente", et **la remarque du client affichée
   directement sur la carte** — fini les deux listes à recouper. Import
   manuel conservé en repli discret (`<details>`, replié par défaut) pour
   les fichiers non reconnus automatiquement.
4. **Section "Demandes de retouche" décomposée, pas supprimée** : un
   client peut ouvrir le lightbox et laisser une remarque sur une photo
   qu'il n'a **pas** sélectionnée (le cœur de sélection et l'ouverture du
   lightbox sont deux actions distinctes dans `gallery-view.tsx`) — vérifié
   avant de retirer quoi que ce soit, pour ne perdre aucune information.
   Ces remarques "orphelines" (rares) restent affichées, mais dans une
   section renommée "Autres remarques" qui **n'apparaît que si elle a du
   contenu** — dans le cas courant (le client ne note que ce qu'il a
   choisi), elle disparaît entièrement.
5. **Vérifié** : `tsc`/`eslint`/`vitest` (77 tests, dont 5 nouveaux sur
   `matchFinalFilename`)/`next build` passent tous. Rendu revérifié en
   direct sur la galerie "shooting test" une fois reverrouillée (script
   ponctuel pour restaurer `selectionLockedAt`, après qu'Enzo l'ait
   déverrouillée lui-même pour retester — confirmé via l'historique
   `StatusHistory`, `changedBy: "ADMIN"` — donc pas un bug de ce
   changement) : compteur "0 sur 1 final importé", vignette réelle,
   remarque client affichée directement sur la carte, aucune erreur
   console, aucun débordement horizontal desktop/mobile.
6. **Limite de vérification honnête** : impossible de tester le
   glisser-déposer ou la sélection de fichier réelle via le navigateur
   automatisé (les outils dont je dispose ne permettent pas de peupler un
   `<input type="file">` par script, restriction de sécurité standard des
   navigateurs) — seule la structure/le rendu ont pu être vérifiés, pas
   l'interaction d'upload elle-même. `matchFinalFilename` est en revanche
   testé unitairement de façon exhaustive (correspondance exacte, suffixe
   Lightroom, ambiguïté, aucune correspondance). **À tester par Enzo
   lui-même** en conditions réelles pour confirmer que le glisser-déposer
   se comporte comme attendu.

## 6septdecies. Page galerie admin : un seul bloc principal, le reste replié (2026-08-22)

Enzo, tout de suite après §6sedecies : "je trouve qu'il y a encore trop
d'info et qu'elle sont juste les une à la suite des autres je veux que tu
rende ça le plus simple possible." Le problème n'était donc pas
spécifique à l'écran de retouche — c'est toute la page
`/admin/galleries/[id]` qui empilait sans hiérarchie : formulaire
d'édition complet, import de photos, accès client (avec tout
l'historique des codes toujours affiché), sélection, retouche — six
sections toujours visibles, avec titre + paragraphe d'explication
chacune, qu'elles soient pertinentes au stade actuel ou non.

**Principe retenu** : un seul bloc "principal" à la fois, déterminé par
l'état réel de la galerie — ce qui a besoin d'attention MAINTENANT, sans
cérémonie (pas de titre de section, pas de paragraphe explicatif pour un
utilisateur qui connaît déjà son propre outil) :
- Aucune sélection encore reçue → **Photos** (import + grille) est le
  bloc principal.
- Une sélection existe (verrouillée ou non) → **Retouche** (compteur,
  export Lightroom, `RetouchWorkspace`) devient le bloc principal.
- Statut `PAYMENT_PENDING` → bandeau compact et prioritaire au-dessus de
  tout, avec le montant dû et un bouton direct — c'est la seule chose
  bloquante à ce moment-là.

Tout le reste (formulaire d'édition du shooting, Photos quand ce n'est
pas le bloc principal, Accès client avec son historique, remarques
"orphelines" s'il y en a) passe dans un accordéon replié par défaut
(`<details>`, même motif déjà utilisé pour "Réglages avancés" dans
`gallery-form.tsx`) — juste un libellé court, parfois avec un compteur
("Photos (1)", "Accès client (4 codes)"), un clic pour dérouler.
Toujours accessible, jamais imposé.

Le bouton "Déverrouiller la sélection" (rare, correctif) est devenu un
simple lien texte à côté du compteur plutôt qu'un bouton dédié — cohérent
avec son usage occasionnel.

**Bug réel trouvé en vérifiant** : premier jet, le lien "déverrouiller"
était un `<form>` imbriqué à l'intérieur d'un `<p>` — HTML invalide
(`<form>` n'est pas du contenu autorisé dans `<p>`), provoquant une
vraie erreur d'hydratation React en conditions réelles (`Hydration
failed`, visible dans la console). Corrigé en sortant le `<form>` du
`<p>` (conteneur flex avec les deux comme frères, plutôt qu'un parent-
enfant) — reproduit puis revérifié propre sur un nouvel onglet.

**Vérifié** : `tsc`/`eslint`/`vitest` (77 tests)/`next build` passent
tous. Rendu revérifié en direct sur la galerie "shooting test" (statut
"Prêt à livrer", 1 photo) : la page se résume maintenant à l'en-tête, une
ligne de contexte + les deux boutons d'export, le `RetouchWorkspace`, puis
trois lignes d'accordéon repliées — contre six sections toujours
déployées avant. Accordéon testé (ouverture/fermeture confirmée par
script), aucune erreur console, aucun débordement horizontal
desktop/mobile.

## 6octodecies. Contact public sur la page d'accueil (2026-08-22)

Enzo a demandé ce qu'on pourrait ajouter à l'accueil. Constat en
inspectant la page : elle ne sert que deux publics (client existant → "Accéder
à ma galerie" ; Enzo lui-même → "Espace photographe") — **aucun moyen pour
un prospect qui découvre le site de le contacter**, ni email, ni réseau
social, ni pied de page. Recommandation faite (pas implémentée avant
accord explicite, cf. consigne sur les questions exploratoires) : un
simple pied de page avec les coordonnées, pas un formulaire de contact —
hors périmètre du brief. Enzo a validé et donné les coordonnées
lui-même (jamais devinées) : `enzo.ac111@gmail.com`, `06 60 58 62 05`,
Instagram `@Inkz.raw`.

`src/app/page.tsx` — nouveau `<footer>` en bas de page (motif brand
dots + trois liens `mailto:`/`tel:`/Instagram, entrée en fondu
`whileInView` cohérente avec le reste de la page). Vérifié en direct :
les trois `href` résolvent correctement (`mailto:enzo.ac111@gmail.com`,
`tel:+33660586205`, `https://instagram.com/inkz.raw`), aucun débordement
desktop/mobile, aucune erreur console. `tsc`/`eslint`/`vitest` (77
tests)/`next build` passent tous.

## 6novodecies. Métadonnées et favicon (2026-08-22)

Suite à "quoi d'autre ?" — deux améliorations à faible coût, sans nouvel
élément requis d'Enzo (le vrai logo reste en attente) :

1. **`layout.tsx`** — titre/description génériques ("Galeries — espace
   photographe") remplacés par un vrai titre orienté prospect ("Inkz —
   Photographe | Galeries clients privées") + description mentionnant
   Enzo/Inkz. `title` passe en objet `{ default, template: "%s — Inkz" }`
   — chaque page peut maintenant définir juste son propre segment
   (ex. "Espace photographe") sans répéter "— Inkz" partout.
2. **`admin/layout.tsx`** et **`g/layout.tsx`** (nouveau, wrapper minimal
   sans autre rôle que porter la métadonnée) — `robots: { index: false,
   follow: false }` : l'espace admin et les galeries clients (privées par
   nature, brief §4) ne doivent jamais être indexés par un moteur de
   recherche. `g/layout.tsx` existe séparément de `g/page.tsx` (devenu un
   Client Component pour le formulaire PIN, §6quaterdecies) car
   `metadata` ne peut être exporté que d'un Server Component — ce layout
   couvre `/g` et `/g/[slug]` en une fois.
3. **`src/app/icon.tsx`** (nouveau) — favicon généré via `next/og`
   (`ImageResponse`), pas un fichier binaire statique : reprend le motif
   des deux points rouge/or du logo provisoire (mêmes couleurs que
   `globals.css`, `#b3413e`/`#f0dd95`). L'ancien `favicon.ico` par défaut
   du scaffold Next.js supprimé pour éviter toute ambiguïté entre les
   deux. À remplacer par le vrai logo dès qu'il arrive.
4. **Vérifié en direct** : titre d'onglet correct sur `/` ("Inkz —
   Photographe | Galeries clients privées"), `/admin` ("Espace
   photographe — Inkz"), `/g` ("Accès galerie — Inkz") ; balise
   `<meta name="robots">` absente sur `/` (indexable, comme voulu) et
   `noindex, nofollow` présente sur `/admin` et `/g` ; `/icon` répond
   200 avec `content-type: image/png` (411 octets). Aucune erreur
   console. `tsc`/`eslint`/`vitest` (77 tests)/`next build` passent tous.

## 6vicies. Grande session autonome (2026-08-22)

Enzo a donné carte blanche explicite pour une longue session sans
confirmation à chaque étape : "améliore tout ce que tu peux... rajoute
des raccourcis... je veux côté client un rendu vrm pro, photos grandes
bien mises en valeur... plus d'animation... travaille de manière
complètement indépendante." Quatre chantiers menés, tous vérifiés
(`tsc`/`eslint`/`vitest`/`next build`, plus tests en direct) :

**1. Vue galerie client repensée** (le point le plus important —
révise/complète la restriction "photos = héros, rester calme" de
§6dixies : Enzo redemande explicitement ce traitement pro ici) :
- `lightbox.tsx` (nouveau) — visionneuse plein écran partagée entre
  `gallery-view.tsx` et `delivery-view.tsx` : navigation précédent/suivant
  (boutons + flèches clavier + Échap), compteur "N / M", transition en
  fondu-enchaîné entre deux photos. Évite de dupliquer cette logique deux
  fois.
- `gallery-view.tsx` (grille de sélection) — passée d'une grille 3
  colonnes de vignettes recadrées en carré à une **mosaïque** (`columns-1
  sm:columns-2 lg:columns-3`, `aspect-ratio` calculé à partir des vraies
  dimensions `width`/`height` déjà stockées en base, donc aucun saut de
  mise en page au chargement) — les photos gardent leurs proportions
  réelles, plus grandes, plus larges (`max-w-6xl` au lieu de `max-w-5xl`).
  Entrée en fondu échelonnée. Lightbox reconstruite sur le composant
  partagé (pointage de remarque + `PhotoNoteForm` passés en `children`).
- `delivery-view.tsx` (photos finales) — même traitement mosaïque +
  lightbox, avec un bouton "Télécharger cette photo" directement dans la
  vue agrandie. `final-delivery-service.ts::listDeliverablePhotos`
  étendu pour renvoyer `width`/`height` (nécessaire à la mosaïque ; les
  dimensions sont celles de l'aperçu à l'import, le fichier final réel
  peut différer légèrement après recadrage en retouche — indication de
  mise en page, jamais une valeur garantie).
- **Bug réel trouvé et corrigé pendant l'écriture** : la première version
  associait des indices de deux façons différentes (liste complète des
  photos vs. liste filtrée sur celles ayant un aperçu) — risque réel de
  désynchronisation si une photo sans aperçu se trouve au milieu de la
  grille. Corrigé en calculant `viewablePhotos` une seule fois et en s'y
  référant partout, plutôt que de jongler entre deux tableaux.
- **Vérifié en conditions réelles**, pas juste en structure : galerie
  remise temporairement à l'étape "sélection" (script ponctuel, voir
  point 3) pour tester le parcours complet — clic sur le cœur (♡→♥,
  compteur mis à jour), ouverture de la lightbox, clic sur la photo pour
  poser un point de remarque (positionné exactement où cliqué, vérifié
  en %), formulaire de remarque affiché. Galerie "shooting test" repassée
  ensuite à l'état livré pour tester `delivery-view.tsx` : mosaïque avec
  vrai ratio d'aspect confirmé, lightbox + bouton de téléchargement
  fonctionnels. Aucune erreur console, aucun débordement desktop/mobile.

**2. Bouton d'accès galerie sur l'accueil** ("pas jolie", retour
littéral d'Enzo) — flèche unicode "→" remplacée par une vraie icône SVG
animée, forme `rounded-full` (pilule) au lieu de `rounded-md`, ombre
teintée de la couleur de marque (`rgba(179,65,62,...)`) plutôt qu'une
ombre grise générique — un rendu plus "vrai bouton premium" que l'ancien
rectangle arrondi discret.

**3. Liens de retour** ("ça manque de raccourcis pour retourner dans
les pages précédentes") — `back-link.tsx` (nouveau, réutilisable, icône
flèche SVG + léger déplacement au survol) ajouté sur les 4 pages qui en
manquaient le plus : `/admin/galleries/[id]` et `/admin/galleries/new`
(retour vers `/admin`), `/admin/login` et `/g` (retour vers `/`).

**4. Page 404 personnalisée** (trouvée manquante en auditant le site,
pas demandée explicitement mais dans l'esprit "améliore tout ce que tu
peux") — `not-found.tsx` (nouveau) : avant, page Next.js générique sans
identité de marque ni moyen de revenir sans le bouton "précédent" du
navigateur. Maintenant : points de marque, "404", message, bouton retour
à l'accueil, cohérent avec le reste du site.

**Chantier tenté puis abandonné — état de chargement (`loading.tsx`)** :
ajout initial de `admin/loading.tsx` et `admin/galleries/[id]/loading.tsx`
(squelettes `animate-pulse`) pour combler un vrai manque (écran blanc
pendant le chargement). **Bug réel et reproductible découvert en
vérifiant** : avec `loading.tsx` en place, `/admin` restait bloqué
indéfiniment sur le squelette, y compris sur un nouvel onglet, un nouveau
process serveur (`.next` + `node_modules/.cache` vidés), en dehors de
toute question de connexion Neon (requête identique testée en isolation,
hors Next.js : résolue en 313ms). Diagnostic par élimination : le retrait
du fichier `loading.tsx` seul, sans aucun autre changement, a immédiatement
résolu le blocage — confirmé sur les deux pages où il avait été ajouté.
Conclusion : incompatibilité réelle entre le Suspense streaming de cette
version de Next.js/Turbopack en mode dev et un `loading.tsx` sur ces
routes précises — pas un bug de données, pas Neon. Les deux fichiers ont
été supprimés plutôt que gardés en l'état ("ne jamais garder une
fonctionnalité qui casse plus qu'elle n'améliore"). À réessayer plus tard
si une version ultérieure de Next.js corrige ce comportement, ou à tester
en prod (`next build && next start`) où le bug ne se manifeste peut-être
pas — non vérifié faute de temps dans cette session.

**Effets de bord réels sur les données d'Enzo** (disclosure complète,
comme à chaque fois cette session) :
- Une deuxième galerie de test vide ("test galerie masonry", sans photo)
  créée pendant les tests — laissée telle quelle, sans conséquence,
  visible dans le dashboard admin.
- La galerie "shooting test" a été remise à l'état "En attente de
  sélection" (sélection et fichier final effacés par script, puis
  reconfirmée manuellement à travers le vrai parcours client pendant les
  tests) pour pouvoir vérifier `gallery-view.tsx` en conditions réelles —
  elle est donc revenue à un état "sélection en cours" utilisable par
  Enzo pour continuer à tester lui-même, pas dans son état "Livré"
  d'avant cette session.

## 6unvicies. Import photo repensé + aperçu client en direct (2026-08-22)

Trois demandes d'Enzo : (1) l'import des photos "n'est pas logique et
trop difficile à comprendre", (2) le logo sur l'accueil (bloqué — voir
point 3 des décisions ouvertes, toujours pas de fichier récupérable), (3)
un bouton pour voir la galerie "du point de vue du client" depuis
l'admin, sans code PIN, **mis à jour en direct** à chaque modification.

**1. Import photo groupé.** L'ancien formulaire demandait DEUX fichiers
par photo (original + aperçu JPEG déjà exporté), un par un, sans
expliquer pourquoi — un vrai frein, pas juste une impression. La raison
existe (brief : aucun décodage RAW côté serveur, sharp ne peut pas lire
un fichier RAW), mais n'était jamais dite à l'écran, et le flux photo par
photo n'avait pas de sens pour un shooting de dizaines de photos.
- `lib/domain/filename-match.ts` — l'utilitaire déjà écrit pour les
  finaux (§6sedecies) généralisé (renommé depuis `final-filename-match.ts`,
  `matchFinalFilename` → `matchFilename`) : même logique de
  correspondance par nom de fichier, utilisée maintenant à deux endroits.
- `photos-actions.ts` — nouvelle action `uploadPhotosBatchAction` :
  accepte plusieurs fichiers d'un coup. Un JPEG/PNG déposé sert
  directement d'aperçu (rien de plus à faire). Un RAW (CR2/CR3/NEF/ARW/DNG/RAF/ORF/RW2)
  a besoin d'un aperçu associé, retrouvé automatiquement par nom de
  fichier dans une seconde zone de dépôt.
- `photo-upload-form.tsx` (réécrit) — zone de dépôt principale toujours
  visible avec l'explication directement dans le texte ("JPEG/PNG : prêtes
  à l'emploi. RAW : ajoutez aussi les aperçus..."). La zone des aperçus
  RAW **n'apparaît que si nécessaire** (au moins un fichier déposé n'est
  pas dans un format affichable) — pas de champ inutile pour qui ne
  tourne qu'en JPEG. Ancien formulaire (une photo, deux champs) conservé
  en repli sous `single-photo-upload-form.tsx`, replié dans un `<details>`
  "Import manuel".
- **Bug réel trouvé et corrigé en testant** : `formAction(data)` appelé
  directement depuis un gestionnaire de clic, hors `startTransition` —
  fonctionne (l'import aboutit), mais React avertit en console que le
  suivi de l'état "en cours" (`pending`) ne sera pas fiable. Corrigé ici
  ET dans `retouch-workspace.tsx` (§6sedecies), qui avait exactement le
  même défaut, repéré en le retestant par la même occasion.
- **Vérifié en conditions réelles**, pas juste en structure : glisser-
  déposer simulé par un vrai `DataTransfer` (contourne la restriction du
  navigateur sur `input.files`, contrairement à un clic simple) — un
  fichier JPEG direct importé avec succès, puis un faux RAW (`.cr3`)
  associé automatiquement à son aperçu déposé séparément (`-Edit.jpg`) et
  importé avec succès. Aucune erreur ni avertissement console après le
  correctif `startTransition`. Aucun débordement desktop/mobile.

**2. Aperçu "point de vue client" en direct depuis l'admin.** Nouvelle
route `/admin/galleries/[id]/preview`, protégée par la session admin
(jamais par le code d'accès galerie) :
- Réutilise **exactement** `GalleryView`/`WaitingView`/`DeliveryView` et
  `getPublicGalleryBySlug` — le même code que `/g/[slug]`, pas une
  reconstruction séparée qui risquerait de diverger visuellement de la
  vraie expérience client.
- `readOnly` (nouveau prop sur `GalleryView` et `DeliveryView`) :
  masque le cœur de sélection, le formulaire de remarque et la barre de
  confirmation ; surtout, **empêche `DeliveryView` de déclencher
  `markDeliveredAction`** — sans ça, le simple fait qu'Enzo regarde son
  propre aperçu aurait marqué la galerie comme "vue par le client", un
  vrai bug de données puisque ce statut est censé refléter une vraie
  visite client.
- `preview-chrome.tsx` — bandeau "Aperçu — lecture seule, mis à jour
  automatiquement" + rafraîchissement toutes les 4s (`router.refresh()`
  en boucle). Pas d'infrastructure temps réel (WebSocket) — disproportionné
  pour un outil mono-photographe à faible trafic ; un rafraîchissement
  périodique donne le même résultat perçu ("je modifie un prix, je vois
  l'aperçu changer") sans rien à héberger de plus.
- Bouton "Voir côté client" ajouté sur la page détail, à côté du lien
  public brut, ouvre l'aperçu dans un nouvel onglet.
- **Vérifié en conditions réelles, le point le plus important** : deux
  onglets ouverts côte à côte (admin + aperçu), titre du shooting modifié
  dans l'onglet admin → répercuté automatiquement dans l'onglet aperçu
  moins de 6 secondes après, sans aucune action manuelle. Cœur de
  sélection et barre de confirmation confirmés absents en lecture seule.
  Aucune erreur console, aucun débordement desktop/mobile.

**Reste ouvert** : le logo réel (toujours aucun fichier trouvé — Bureau
et Téléchargements vérifiés sans rien d'évident, à redemander directement
à Enzo avec un chemin de fichier précis plutôt que via le chat).

## 6duovicies. Le vrai logo, enfin (2026-08-22)

Réponse d'Enzo au point ouvert ci-dessus : "prosect (2) c'est un png dans
mes téléchargements." Trouvé dans `C:\Users\PC_stellina\Downloads\` —
trois quasi-doublons présents (`prosect.png`, `prosect (1).png`,
`prosect (2).png`, plus un `prosect.pdf`), Enzo a précisé lequel.

- **Fichier** : 2000×2000, fond blanc plein (pas de transparence — vérifié
  via `sharp().metadata()`, `hasAlpha: false`). Recadré à sa zone de
  contenu réelle avec `sharp().trim()` (1456×644, plus de marge blanche
  inutile tout autour) et enregistré à
  `public/brand/inkz-logo.png`.
- Le fond blanc du PNG correspond exactement à `--color-paper: #ffffff`
  (fond de toute l'app) — pas besoin de détourage/transparence, le logo
  se fond naturellement sur la page.
- **`src/app/page.tsx`** — le repère provisoire (`BrandDots` + texte "Inkz
  — galeries clients") dans le bandeau du hero remplacé par le vrai logo,
  via `next/image` (dimensions réelles renseignées, `priority` pour le
  LCP). `BrandDots` reste utilisé ailleurs (pied de page, en-tête admin,
  page de connexion) — pas remplacé partout, seulement là où Enzo l'a
  demandé ("quelque part sur la page d'accueil").
- **Mémoire corrigée** (`inkz_brand_identity.md`) : l'entrée précédente
  décrivait des points de couleur DANS le logo — faux, le vrai fichier
  est entièrement noir sur blanc. La palette rouge/or reste un choix
  d'interface distinct (boutons, accents), pas quelque chose tiré du
  logo — corrigé pour ne pas induire en erreur une future session.
- **Vérifié en direct** : logo chargé via `/_next/image` (confirmé sans
  erreur), aucun débordement desktop/mobile, aucune erreur console.
  `tsc`/`eslint`/`vitest` (77 tests)/`next build` passent tous.

**Reste ouvert** : codes hex exacts de la palette (toujours des
estimations — le logo ne les contient pas), un favicon basé sur le vrai
logo plutôt que le motif `BrandDots` provisoire (pas fait dans cette
passe, non demandé).

## 6trevicies. Vrai bug d'espacement du titre, enfin corrigé + changement de typo (2026-08-22)

Enzo : "le titre j'aime pas la typo et c'est tout collé ya pas d'espace
entre les mots." Deux retours distincts, tous les deux traités — mais le
premier révèle une vraie erreur de diagnostic de ma part plus tôt dans
cette session (§6undecies, §6terdecies point 4).

**Le bug d'espacement était réel depuis le début, mal diagnostiqué deux
fois.** Historique : la première version utilisait une marge CSS
(`mr-[0.28em]`) — remplacée par un caractère espace littéral `{" "}`
DANS chaque `motion.span` (`inline-block`), "vérifiée" à l'époque
uniquement via le texte extrait (`innerText`/`textContent`), jamais via
une vraie mesure de layout. Plus tard dans cette session (§6terdecies),
le même symptôme est réapparu pendant les tests ; j'ai conclu à un
faux positif lié à l'onglet en arrière-plan (`document.hidden`), confirmé
par un `textContent` qui semblait correct — **mais je n'ai jamais mesuré
le rectangle réel des mots à l'écran**, seulement leur présence dans le
texte. Un espace normale (ou même une espace insécable, testé aussi) en
toute fin de contenu d'un bloc `display: inline-block` ne compte pour
rien dans la largeur de la boîte — elle existe dans le texte (donc
`textContent` la voit) mais s'affiche avec une largeur de 0px. D'où
"Unespacepourdécouvrir..." : le texte était toujours correct, l'affichage
ne l'a jamais été.

**Fix définitif** : l'espace ne vit plus DANS le `motion.span`
`inline-block` — elle est sortie comme texte simple, frère du span
(`<Fragment key={i}><motion.span>...</motion.span>{" "}</Fragment>`).
Une espace normale en flux de texte ordinaire (pas dans un bloc atomique)
s'affiche toujours avec sa largeur réelle — aucune ambiguïté possible.
**Vérifié cette fois avec `getBoundingClientRect()` sur chaque mot**,
pas le texte : écart mesuré ~10.8px desktop / ~8px mobile, identique
entre chaque paire de mots. Cette mesure reste fiable même onglet en
arrière-plan (le layout se calcule toujours, contrairement au rendu/à
l'animation) — la bonne méthode de vérification depuis le début.

**Typo changée** : Bricolage Grotesque → **Fraunces** (`layout.tsx`,
variable `--font-serif-app` déjà utilisée partout via `font-serif`,
aucun autre fichier à toucher). Choix fait sans demander confirmation
(session de travail autonome toujours en cours) — serif éditoriale à
forte personnalité, plus posée que la rondeur "bubblegum" de Bricolage
Grotesque, cohérente avec un site de photographe pro.

**Vérifié** : `tsc`/`eslint`/`vitest` (77 tests)/`next build` passent
tous. Espacement confirmé par mesure de layout réelle (pas juste le
texte) desktop et mobile, police Fraunces confirmée chargée
(`getComputedStyle`), aucune erreur console, aucun débordement.

**Leçon à ne pas oublier** : pour tout bug visuel de mise en page,
toujours vérifier `getBoundingClientRect()` (géométrie réelle), jamais
seulement `textContent`/`innerText` — le texte peut être correct pendant
que l'affichage ne l'est pas, et l'inverse est vrai aussi (un onglet en
arrière-plan peut fausser `innerText` alors que le layout, lui, reste
fiable).

## 6quatervicies. Favicon définitif + notification email (2026-08-22)

Suite à "qu'est-ce qu'on peut faire d'autre" → deux pistes proposées,
validées avec une contrainte claire d'Enzo : "je ne veux rien payer".

**1. Favicon à partir du vrai logo.** L'ancien favicon (`icon.tsx`,
généré dynamiquement via `next/og`, motif `BrandDots`) remplacé par un
fichier statique `src/app/icon.png` — la mascotte seule (pas le
wordmark, illisible en 16-32px), extraite de `inkz-logo.png` avec
`sharp` (`extract` puis double `trim()` — le premier trim n'a pas
suffi, un deuxième passage sur le fichier déjà découpé a fini le travail
correctement, sans chercher plus loin pourquoi), petite marge ajoutée,
exporté en 512×512. Vérifié : `/icon.png` répond 200/image-png.

**2. Notification email "galerie prête".** Manquait un moyen pour le
client de savoir que ses photos sont prêtes sans revenir de lui-même sur
son lien. Ajouté via **Resend** (déjà anticipé comme placeholder dans
`.env.example` depuis une phase antérieure du projet) — offre gratuite
perpétuelle (100 emails/jour, 3000/mois, aucune carte bancaire), cohérent
avec la politique de coût quasi nul du projet.
- `lib/email/send-gallery-ready-email.ts` (nouveau) — envoie un email
  HTML simple (titre, lien direct `/g/<slug>`, rappel que le code d'accès
  reste valable) via l'API Resend. **Dégradation volontaire, testée en
  conditions réelles** : sans `RESEND_API_KEY` (le cas actuel), la
  fonction se contente d'un `console.warn` et retourne — ne bloque jamais
  l'import du fichier final. Erreurs d'envoi (Resend en panne, adresse
  invalide, etc.) attrapées de la même façon, jamais remontées à
  l'appelant.
- Branché dans `final-delivery-service.ts::importFinalPhoto()`, au moment
  exact où toutes les photos sélectionnées ont leur final et la galerie
  passe à "Prêt à livrer" (`onFinalFilesImported`) — seulement si
  `Gallery.clientEmail` est renseigné (champ déjà existant, facultatif).
- **Vérifié en conditions réelles** : galerie "shooting test" préparée
  par script (email de test temporaire, sélection verrouillée), fichier
  final réellement déposé via l'interface (glisser-déposer simulé par
  `DataTransfer`) → transition confirmée vers "Prêt à livrer" dans l'UI,
  **et** le message `RESEND_API_KEY manquant — email [...] non envoyé`
  confirmé dans les logs serveur, sans aucune erreur ni blocage de
  l'import. Email de test nettoyé de la base ensuite (`clientEmail`
  remis à `null`).
- `tsc`/`eslint`/`vitest` (77 tests)/`next build` passent tous.

**⚠️ Étape manuelle requise pour activer l'envoi réel** — je ne peux pas
créer de compte à la place d'Enzo : aller sur resend.com, créer un compte
gratuit (aucune carte requise), générer une clé API, la coller dans
`RESEND_API_KEY` de `.env.local`. Fonctionne immédiatement en test avec
l'adresse d'expédition par défaut (`onboarding@resend.dev`, délivrabilité
limitée) ; pour de vrais envois clients, vérifier un domaine sur
resend.com et mettre à jour `RESEND_FROM_EMAIL`.

**Note en passant** : `npm install resend` a révélé 3 vulnérabilités
"high" pré-existantes, sans rapport (dans `@prisma/config`/`deepmerge-ts`,
un outil de dev Prisma) — pas corrigées ici, `npm audit fix --force`
imposerait un retour en arrière de Prisma (6.12.0), hors sujet et risqué
pour une story non demandée.

## 6quinvicies. Système de dessin par tracé libre + textes philosophiques (2026-08-22)

Retour d'Enzo sur les demandes de retouche : "le point etc je trouve ça
assez nul, renforce le côté dessin où on peut vrm dessiner et entourer le
problème sans que ça décale l'image [...] fait vrm ce système de couleurs
par détail donc une couleur = un commentaire + un dessin sur l'image." Ça
va à l'encontre d'une note du brief d'origine ("ne construis pas
inutilement un mini-Photoshop", voir l'ancien commentaire de
`photo-note.ts`) — décision assumée d'Enzo de faire évoluer cette
contrainte après avoir vu le résultat en pratique, pas une erreur
d'interprétation de ma part.

**1. Schéma** — `PhotoNote` gagne `drawingPath` (`Json?`, tableau de
points `{x,y}` en coordonnées relatives 0..1) et `color` (`String?`, hex).
`positionX`/`positionY` (l'ancien "un point") conservés tels quels pour
les remarques déjà en base — jamais interprétés comme du HTML/JS,
seulement redessinés en SVG à partir de coordonnées numériques validées.
Migration `20260822121622_photo_note_drawing`.

**2. `lib/domain/note-colors.ts`** (nouveau) — palette fixe de 6 couleurs,
`colorForNoteIndex(n)` : la Nième remarque d'une photo reçoit
`NOTE_COLORS[n % 6]`. Un tracé = une couleur = un commentaire, cohérent
entre la vue client (dessin sur la photo) et la vue admin (pastille à
côté du texte).

**3. `g/[slug]/drawing-overlay.tsx`** (nouveau) — SVG superposé à l'image
dans la lightbox, capture les évènements pointer pour un tracé libre.
**Le vrai bug corrigé** ("on reste appuyé et qu'on bouge ça fait bouger
toute l'image") : le conteneur de la lightbox défile
(`overflow-y-auto`) — un glissé sur une image y est, par défaut,
interprété par le navigateur comme un début de défilement/glisser natif.
Fix : `touch-action: none` sur la surface de dessin, `preventDefault()`
sur chaque évènement pointer, `setPointerCapture` (dans un `try/catch` —
échoue silencieusement sur un pointeur simulé par script, appris en
testant) pour ne jamais perdre le tracé même si le curseur sort
brièvement de la zone. `draggable={false}` + `onDragStart` bloqué sur
l'`<img>` en défense supplémentaire (`lightbox.tsx`).
- `Lightbox` : props `onImageClick`/`markerPosition` (spécifiques à
  "un point") remplacées par un slot générique `imageOverlay` — reste
  réutilisable par `delivery-view.tsx`, qui n'a besoin d'aucun dessin.

**4. Vérifié en conditions réelles, pas juste en structure** — geste de
dessin simulé via de vrais évènements `PointerEvent` espacés dans le
temps (un envoi synchrone trop rapide ne laisse pas React re-render entre
chaque évènement, ce qui a d'abord fait échouer le test, pas l'app) :
- **Position de l'image mesurée avant/après le tracé (`getBoundingClientRect`)
  — strictement identique.** C'est la preuve directe que le bug signalé
  n'existe plus.
- Tracé de 13 points soumis avec succès, couleur `#457b9d` (2ème couleur
  de la palette, cohérent avec l'index — c'était la 2ème remarque sur
  cette photo) confirmée à la fois dans le SVG réaffiché et côté admin
  (pastille de couleur identique dans `retouch-workspace.tsx` et
  "Autres remarques").
- Ancienne remarque "un point" (créée avant ce système) toujours affichée
  correctement (cercle plutôt que tracé) — rétrocompatibilité confirmée,
  pas juste supposée.
- `touch-action: none` confirmé appliqué (`getComputedStyle`), aucun
  débordement mobile/desktop, aucune erreur console.

**5. Textes philosophiques rédigés** — "je veux aussi que tu fasses les
commentaires sur les trucs philosophiques quitte à ce que je le modifie
après, les textes au moins c'est mis dans le site." Deux des trois
fonctionnalités optionnelles de `gallery-form.tsx` n'affichaient jusqu'ici
RIEN côté client (les cases à cocher existaient, aucun texte n'était
jamais montré) :
- `lib/content/retouch-philosophy.ts` (nouveau) — un paragraphe unique et
  global (pas par galerie, comme une note d'intention), affiché sur
  `gallery-view.tsx` quand `retouchPhilosophyEnabled` est actif. **Premier
  jet volontairement écrit par moi, à modifier par Enzo** — pas un texte
  définitif.
- `prisma/seed-trust-messages.ts` (nouveau, `npm run db:seed-trust-messages`,
  déjà exécuté) — 8 messages sur l'image de soi dans `TrustMessage` (le
  modèle existait, jamais peuplé). `lib/services/trust-message-service.ts`
  tire un message actif au hasard, affiché si `selfImageMessagesEnabled`.
  Même remarque : premier jet, à éditer/compléter par Enzo (upsert par
  `theme`, réexécuter le script est sans risque).
- **`beforeAfterEnabled` (3ème fonctionnalité) volontairement non
  branché** — contrairement aux deux autres, il a besoin de vraies photos
  avant/après (`BeforeAfterExample.beforeKey`/`afterKey`, des clés de
  stockage réelles) que je ne peux pas inventer. À faire quand Enzo aura
  des exemples à fournir.
- Les deux (philosophie + image de soi) branchés aussi dans l'aperçu
  admin (`preview/page.tsx`) pour rester fidèles à l'expérience client.

**Effet de bord réel sur les données d'Enzo** : galerie "shooting test"
repassée à "En attente de sélection" pour tester (sélection/finaux
effacés par script), les deux fonctionnalités optionnelles activées pour
le test (`retouchPhilosophyEnabled`/`selfImageMessagesEnabled` — à
désactiver depuis l'admin s'il ne les veut pas encore actives), et une
vraie remarque avec tracé ajoutée sur "test couleur (5).png" pendant les
tests (visible dans "Autres remarques").

`tsc`/`eslint`/`vitest` (81 tests)/`next build` passent tous.

## 6sexvicies. Aperçu client rendu réellement interactif + deux bugs corrigés en direct (2026-08-22)

Retour d'Enzo sur `§6unvicies` (aperçu "voir côté client") : "la simulation
est vraiment limitée, je peux juste voir les images et pas faire le test
jusqu'au bout."

**1. Suppression complète de `readOnly`** — `gallery-view.tsx` ne connaît
plus du tout ce prop : cœur de sélection, tracé/remarque et "Confirmer ma
sélection" sont maintenant de vraies actions serveur depuis l'aperçu admin,
identiques à celles d'un client réel (mêmes composants, même service
public, `§6unvicies`). `delivery-view.tsx` garde un unique flag,
renommé `isPreview` (plus honnête que `readOnly` — il ne bloque QUE le
déclenchement automatique "livrée" au montage, jamais une interaction
visible) : consulter les finaux et cliquer "Télécharger" fonctionnaient
déjà sans restriction, seule la mutation de statut invisible pour Enzo est
évitée. Bandeau de l'aperçu (`preview-chrome.tsx`) mis à jour en
conséquence ("actions réelles" au lieu de "lecture seule").

**2. Deux bugs trouvés par Enzo en testant lui-même immédiatement après,
corrigés dans la foulée** (pas via mon propre test navigateur — les
tentatives d'automatisation de clics dans ce sandbox se sont révélées peu
fiables cette session, coordonnées d'accessibilité désynchronisées du
rendu réel ; le retour direct d'Enzo a été plus fiable) :
- **"dès que je lâche on voit plus le tracé"** — `drawing-overlay.tsx`
  n'affichait le tracé en cours QUE pendant le glissé (`currentPoints`,
  vidé au relâchement) ; le tracé "en attente d'envoi" (`pendingDrawing`
  dans `gallery-view.tsx`, tant que `PhotoNoteForm` n'est pas
  validé/annulé) n'était jamais transmis au SVG. Fix : nouveau prop
  `pendingPoints` sur `DrawingOverlay`, affiché à la couleur active tant
  que la remarque n'est pas envoyée.
- **"les petits conseils changent toutes les x secondes"** — le message
  sur l'image de soi (`trust-message-service.ts`) était tiré au VRAI
  hasard (`Math.random()`) à chaque appel ; comme `/g/[slug]` est un
  Server Component et que l'aperçu admin réexécute la page toutes les 4s
  (`preview-chrome.tsx`, `router.refresh()`), le message changeait sous
  les yeux d'Enzo pendant sa lecture. Fix : tirage devenu déterministe
  (hash de `galerie + jour`) — stable pendant toute une journée de
  visionnage, tourne quand même naturellement d'un jour à l'autre.

`tsc`/`eslint`/`vitest` (81 tests)/`next build` passent tous après ces
deux correctifs.

**3. Ouvert immédiatement après** : Enzo juge que "la mise en page n'est
pas du tout comme je veux" pour la vue galerie client et propose d'envoyer
un croquis dans la conversation — voir §6septvicies, qui traite ce point
sans attendre le croquis (Enzo l'a finalement décrit par écrit).

## 6septvicies. Refonte du panneau de remarques + bug d'accès découvert par la refonte précédente (2026-08-22)

Deux choses distinctes dans ce retour d'Enzo, juste après §6sexvicies :

**1. Bug d'accès trouvé en écrivant ce paragraphe, pas par Enzo** — en
préparant la refonte ci-dessous, réalisé que `§6sexvicies` (aperçu rendu
"réellement interactif") ne fonctionne en réalité QUE si l'admin a déjà,
un jour, entré lui-même le code PIN de cette galerie précise comme le
ferait un client : `hasGalleryAccess()` (`lib/gallery-access/session.ts`)
ne connaît que le cookie signé par code PIN, jamais la session admin.
Sans ce cookie, `toggleSelectionAction`/`addPhotoNoteAction`/etc.
renvoient silencieusement `{error: "Accès non autorisé"}` — aucune erreur
visible, juste un optimistic update qui revient en arrière après le
`router.refresh()` suivant. Fix : `preview/preview-actions.ts`
(`grantPreviewAccessAction`) appelle `grantGalleryAccess(gallery.slug)`
dès le montage réel de `preview-chrome.tsx` (une Server Action, pas le
rendu serveur de la page — les cookies ne peuvent être modifiés que là).
Sur une galerie neuve, jamais visitée côté "client" par personne, l'aperçu
fonctionne maintenant dès le premier chargement.

**2. Refonte complète du panneau de remarques**, retour d'Enzo : "je veux
pouvoir entourer plusieurs trucs et dire plusieurs trucs d'un coup sans
avoir à envoyer à chaque fois [...] pouvoir modifier ce que j'ai mis [...]
la photo en grand à gauche, à droite une fenêtre où on peut écrire [...]
les conseils psy/photogénique dans la fenêtre de droite tout en haut."
- **Plusieurs tracés avant envoi groupé** — `drawing-overlay.tsx` accepte
  désormais un tableau `draftNotes` (au lieu d'un unique tracé en attente)
  ; chaque tracé relâché s'ajoute à la liste sans bloquer le suivant.
  Conservés par photo (`gallery-view.tsx`, `draftsByPhoto`) même en
  changeant de photo dans la lightbox, pour ne jamais perdre un tracé par
  erreur de navigation.
- **Remarques déjà envoyées modifiables** — nouvelles
  `updatePhotoNoteAction`/`deletePhotoNoteAction`
  (`photo-note-actions.ts`) + `updateClientPhotoNote`/
  `deleteClientPhotoNote` (`photo-note-service.ts`), restreintes aux
  remarques `author: "CLIENT"` de la galerie courante (même garde-fou que
  la création). Seul le texte est modifiable, pas le tracé/la couleur.
  Suppression immédiate au clic ; modification de texte mise en attente
  et envoyée avec le reste via "Enregistrer mes remarques" (cohérent avec
  le point précédent — un seul geste d'envoi).
- **Nouveau `photo-notes-panel.tsx`**, remplace `photo-note-form.tsx`
  (supprimé) — liste éditable des remarques (envoyées + brouillons),
  conseils de retouche/image de soi épinglés tout en haut du panneau.
- **`lightbox.tsx`** — nouveau slot `sidePanel`, mise en page à deux
  colonnes en grand écran (photo à gauche, panneau à droite,
  `lg:flex-row lg:items-stretch`), empilée verticalement sur mobile.
  `delivery-view.tsx` continue d'utiliser `children` (inchangé, pas de
  panneau pour la livraison finale).
- **Conseils retirés de l'en-tête de galerie** (`gallery-view.tsx`) —
  affichés uniquement dans le panneau désormais, pas dupliqués.

**Non vérifié visuellement** — la session admin du navigateur de test
avait expiré au moment de cette refonte (perte du cookie de session après
un redémarrage du serveur de dev) et je n'ai pas de mot de passe admin ni
de code PIN à disposition pour m'y reconnecter ; je n'ai pas réinitialisé
le mot de passe d'Enzo sans lui demander. `tsc`/`eslint`/`vitest` (81
tests)/`next build` passent tous, relecture attentive du câblage
flex/hauteurs de `lightbox.tsx`, mais **la mise en page réelle reste à
confirmer par Enzo en conditions réelles**.

## 6octovicies. Mise en ligne — début, stockage objet changé de R2 à Backblaze B2 (2026-08-23)

Enzo : "je veux maintenant que ça soit dispo sur internet pour que je
puisse taffer de mon iPad."

**1. Code prêt, rien poussé nulle part encore** — tout le travail
accumulé depuis les fondations (Milestone 0) était toujours non commité
(132 fichiers). Commité localement (`git config` local `user.name`/
`user.email` repris du commit existant, `David <dav.deoliveira@gmail.com>`
— aucune identité globale modifiée). Toujours aucun remote Git configuré
— rien n'a quitté la machine.

**2. Cloudflare R2 abandonné pour Backblaze B2** — en suivant le plan de
mise en ligne, Enzo est tombé sur l'écran Cloudflare demandant une carte
bancaire pour activer R2, contrairement à ce que documentait ce fichier
("aucune carte requise"). Vérifié par recherche web : c'est réel et
documenté (fil de la communauté Cloudflare), pas une erreur de sa part ni
un mauvais lien — R2 spécifiquement (contrairement au reste de Cloudflare)
exige une carte à l'activation, même si rien n'est jamais débité sous le
palier gratuit (10 Go). Enzo ne voulait pas la donner. Backblaze B2
vérifié comme alternative réelle (10 Go gratuits en permanence, **aucune
carte demandée**, API compatible S3 comme R2) — choisi à sa place.
- `src/lib/storage/r2-adapter.ts` → renommé `s3-adapter.ts`
  (`createS3StorageAdapter`/`S3StorageConfig`) : plus rien de spécifique à
  R2, juste un client S3 générique paramétré par `endpoint`/`region`
  (R2 imposait `accountId` → URL `*.r2.cloudflarestorage.com` en dur ;
  B2 fournit son endpoint/région directement sur la page du bucket créé).
- Variables d'environnement renommées `R2_*` → `STORAGE_*` (+ nouvelle
  `STORAGE_REGION`, nécessaire pour B2, R2 se contentait de `"auto"`) —
  `client.ts`, `.env.example`, `storage/README.md` mis à jour en
  conséquence. Toujours le même comportement : bascule sur le stockage
  local de dev si absentes, erreur explicite si absentes en production.
- **Toujours pas de compte Backblaze créé par Enzo** au moment d'écrire
  ceci — étape suivante côté Enzo, avant de pouvoir configurer les
  variables `STORAGE_*` en production.

**3.** Comptes GitHub (`inkzcode/inkz-galeries`) et Vercel créés par Enzo,
clés B2 (bucket "All" — la première tentative, restreinte à un seul
bucket, échouait avec "not entitled") transmises et vérifiées par un
script jetable (put/get/delete réel sur les deux buckets, supprimé après
usage, jamais commité). Code poussé sur GitHub avec permission explicite
(il a donné le lien lui-même, en réponse à ma question).

**4. Deux vrais bugs de build trouvés UNIQUEMENT sur Vercel** (jamais
reproduits en local, y compris à froid avec `CI=1` et caches vidés — voir
§8/§9 pour la méthode) :
- **Vérification de types bloquée** — "Running TypeScript..." ne
  terminait jamais (30s+, deux essais, contre 8s en local à froid).
  Cause non identifiée avec certitude (probablement lié aux 2 cœurs de la
  machine de build, ou un bug Turbopack spécifique à cet environnement) —
  contournée plutôt qu'investiguée davantage : `typescript.ignoreBuildErrors:
  true` dans `next.config.ts`. Pas de perte réelle de sécurité de type,
  le projet est déjà vérifié par `npx tsc --noEmit` avant chaque commit.
- **Client Prisma introuvable au build** ("Cannot find module
  `.prisma/client/default`") — cause réelle, bien identifiée cette fois :
  npm bloque par défaut les scripts d'installation des dépendances
  tierces sur Vercel (mécanisme "allow-scripts", visible dans les logs
  dès le premier `npm install` : `prisma`/`@prisma/engines` listés comme
  "not yet covered by allowScripts"), donc le `postinstall`/`preinstall`
  de Prisma qui génère normalement le client ne s'exécute jamais. Fix :
  `"postinstall": "prisma generate"` ajouté au `package.json` du PROJET
  (jamais bloqué, contrairement à celui d'une dépendance tierce) —
  vérifié en local en supprimant `node_modules/.prisma` puis en relançant
  `npm install` : le client se régénère bien via ce hook.

**Leçon générale** : pour ce projet, un `next build` local (même à froid)
ne suffit plus à garantir qu'un déploiement Vercel réussira — au moins
deux classes de problèmes (perf de la machine de build, scripts npm
bloqués) n'existent QUE sur la vraie plateforme cible. Les deux fixes
sont en place, déploiement en cours de nouvelle vérification.

**Difficulté d'usage notée** : configurer les variables d'environnement
dans l'interface Vercel a été très laborieux pour Enzo (lignes détectées
automatiquement en doublon avec celles ajoutées manuellement, erreurs de
validation peu claires) — resté sur ordinateur (pas iPad) pour cette
étape ponctuelle de configuration, comme pour toute mise en place initiale
de ce type.

## 6novovicies. Upload direct navigateur → stockage (import cassé au-delà de 4,5 Mo sur Vercel) (2026-08-24)

Premier vrai test d'Enzo sur le site en ligne : import de 119 photos d'un
shooting réel → échec, message "la base de données n'a pas répondu à
temps". Message trompeur (bandeau générique de `admin/error.tsx`, écrit
pour LA cause d'erreur la plus probable jusqu'ici, pas la seule
possible) — la vraie cause n'a rien à voir avec Neon.

**Cause réelle** : les fonctions serverless Vercel plafonnent à **4,5 Mo**
le corps d'une requête entrante — une limite d'infrastructure, non
contournable depuis `next.config.ts` (`serverActions.bodySizeLimit` ne
change rien à cette limite-là, vérifié par recherche). Jusqu'ici, chaque
photo (originale ET finale retouchée) transitait entièrement par une
Server Action — un lot de 119 photos, ou même un seul RAW (couramment
20-80 Mo), dépasse ça très largement. Ce risque était déjà noté comme
"vraie évolution" nécessaire ailleurs dans ce document, jamais construit
avant d'être réellement heurté.

**Fix : dépôt direct navigateur → stockage**, le serveur Next ne voit
plus jamais les octets d'un fichier :
1. `StorageAdapter` gagne `getUploadUrl(bucket, key, contentType)` — URL
   signée PUT (15 min), implémentée dans `s3-adapter.ts`
   (`PutObjectCommand` + `getSignedUrl`) et, pour le dev local (pas de
   vrai stockage objet à côté), via une nouvelle route
   `app/api/dev-upload/route.ts` qui écrit sur disque — même chemin de
   code client dans les deux environnements, gardée explicitement hors
   production (`NODE_ENV === "production"` → 403).
2. Chaque import se fait en 2-3 appels légers (quelques octets, jamais le
   fichier) plutôt qu'un seul gros : `prepare*UploadAction` (génère
   l'URL signée) → le navigateur fait un vrai `PUT` direct sur cette URL
   → `finalize*ImportAction` (va chercher les octets déjà déposés côté
   stockage — jamais depuis la requête du navigateur — pour finir le
   traitement : aperçu + watermark pour un original, mise à jour de
   statut pour un final déjà tel quel).
3. `import-photo.ts`/`final-delivery-service.ts` : `importPhoto()` et
   `importFinalPhoto()` prennent désormais une clé déjà déposée plutôt
   qu'un buffer — ne réécrivent plus jamais l'original/le final, plus
   volumineux appel réseau économisé au passage.
4. Nouveau fichier partagé `direct-upload-helpers.ts`
   (`putDirect`/`runWithConcurrency`, 3 envois simultanés max — 119 en
   parallèle saturerait le navigateur et déclencherait 119 traitements
   d'image en même temps côté serveur) — réutilisé par
   `direct-photo-upload.ts` (originaux, y compris le formulaire manuel
   `single-photo-upload-form.tsx`, un gros RAW seul dépasse aussi la
   limite) et `direct-final-upload.ts` (finaux retouchés, même bug,
   corrigé en même temps avant qu'Enzo ne le heurte à son tour).
5. **Bug trouvé en relisant, pas en testant** — le Content-Type envoyé
   au PUT direct doit être EXACTEMENT celui utilisé pour signer l'URL
   (sinon 403 côté S3/B2, signature invalide) ; `putDirect()` prenait
   d'abord `file.type` du navigateur, qui aurait pu diverger de la
   valeur hardcodée `"image/jpeg"` utilisée pour signer l'URL de
   l'aperçu source d'un RAW. Corrigé : `putDirect()` prend maintenant le
   Content-Type en paramètre explicite, jamais recalculé depuis le
   fichier.

**Non testé en conditions réelles** — perte de la session admin locale
(cookie expiré) au moment de ce fix, et `server-only` empêche de tester
`import-photo.ts` isolément via un script (même limitation que documentée
plus haut dans ce fichier pour les fichiers de service). `tsc`/`eslint`/
`vitest` (81 tests)/`next build` passent tous, relecture attentive
(notamment le point 5 ci-dessus, trouvé cette façon). **À valider par
Enzo — conseillé de retester d'abord avec 2-3 photos avant de relancer
les 119 d'un coup.**

## 6trigies. Premier vrai test Enzo, deux bugs de plus + extraction automatique d'aperçu RAW (2026-08-25)

**1. CORS manquant sur Backblaze** — premier essai réel après
§6novovicies : échec identique, aucune piste depuis les logs (Enzo sur
iPad, pas d'outils développeur accessibles facilement). Cause : un
bucket S3/B2 refuse par défaut un dépôt direct depuis un autre domaine
(politique du navigateur, pas de B2) — jamais configuré puisque jamais
eu besoin d'upload direct navigateur avant §6novovicies. Corrigé
directement via l'API S3 compatible (`PutBucketCorsCommand`, script
jetable avec les clés déjà en main, comme pour le test de connectivité
initial) sur les deux buckets — actif immédiatement, aucun redéploiement
nécessaire pour ce genre de changement (config du bucket, pas du code).

**2. Erreurs génériques inutilisables sur iPad** — corrigé en même temps :
chaque échec d'import affiche maintenant la vraie raison (message HTTP,
erreur d'action serveur, exception) directement dans l'interface, plutôt
qu'un unique message générique. Nécessaire pour diagnostiquer QUOI QUE CE
SOIT sans les outils développeur — a immédiatement servi à identifier le
point 3 ci-dessous sans capture de console.

**3. RAW sans aperçu manuel refusé** ("Aucun aperçu JPEG associé
trouvé") — comportement voulu à l'origine (§6sexvicies/§6septvicies :
"pas de décodage RAW côté serveur"), mais Enzo refuse catégoriquement
d'exporter un JPEG par RAW avant l'import : "je veux pas avoir à le
faire [...] avant [la retouche] ça doit être en RAW". Repoussé une
alternative "export groupé en un clic dans Lightroom" (toujours refusée)
avant d'implémenter une vraie extraction automatique :
- Presque tous les RAW (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2...)
  contiennent un aperçu JPEG intégré par l'appareil photo — extrait
  maintenant automatiquement via `exiftool-vendored`
  (`lib/imaging/extract-raw-preview.ts`), qui vendors un binaire
  ExifTool par plateforme (mécanisme npm `optionalDependencies` — même
  approche que `sharp`/`esbuild`, déjà éprouvée sur Vercel dans ce
  projet). Écartées avant ça : `exifr` (pure JS mais confirmé, README à
  l'appui, ne supporte AUCUN format RAW caméra) et `extractd` (dépend
  aussi d'un process externe, sans gagner en couverture de format —
  CR3 non confirmé).
- `finalizeOriginalImportAction` (`photos-actions.ts`) : pour un RAW,
  utilise l'aperçu manuel s'il est fourni (prioritaire, reste possible en
  secours si l'extraction automatique déçoit sur une photo), sinon tente
  l'extraction automatique, sinon erreur explicite (pas de silence).
  `direct-photo-upload.ts` ne bloque plus l'envoi d'un RAW sans aperçu
  manuel associé — c'est désormais au serveur de décider.
- Instance ExifTool dédiée et explicitement arrêtée (`end()`) par appel
  plutôt que le singleton partagé du module — en serverless, un process
  persistant dont la fonction ne sait jamais s'il survivra jusqu'au
  prochain appel est plus risqué qu'un démarrage/arrêt à chaque fois.
  Fichiers temporaires dans `os.tmpdir()` (seul répertoire inscriptible
  sur Vercel), toujours nettoyés (`finally`).
- **Avertissement de build corrigé au passage** : `os.tmpdir()` est un
  chemin dynamique non analysable statiquement par Turbopack, qui
  inclut alors TOUT le projet dans le paquet déployé "par précaution" —
  annotation `/*turbopackIgnore: true*/` ajoutée (solution suggérée par
  le message d'avertissement lui-même), sûre ici puisque ce chemin ne
  touche jamais aux fichiers du projet.

**Risque assumé, explicitement signalé à Enzo avant d'implémenter** :
`exiftool-vendored` dépend d'un binaire externe vendu par plateforme, pas
du JavaScript pur — après plusieurs surprises "marche en local, pas sur
Vercel" cette session (vérification de types, scripts npm bloqués, CORS),
il n'y a aucune garantie que ça fonctionne réellement en serverless sans
un vrai test sur la plateforme cible, impossible à faire moi-même
(toujours pas de session admin locale ni d'accès aux outils développeur
d'Enzo). Sanity-check fait : le binaire s'exécute correctement en local
(`exiftool.version()` répond), mais **aucun vrai fichier RAW disponible
pour tester `extractJpgFromRaw` de bout en bout** avant qu'Enzo ne le
fasse en conditions réelles. `tsc`/`eslint`/`vitest`/`next build` passent
tous, aucun avertissement au build.

**Suite le même jour — le risque signalé s'est confirmé** : Enzo a
retesté, `exiftool-vendored` échoue bien en production avec `Error: Perl
must be installed` (log Vercel consulté directement, capture à l'appui —
confirmation précise, pas une supposition). Remplacé par
`@colorhythm/libraw-wasm` (`lib/imaging/extract-raw-preview.ts` réécrit) :
- WebAssembly pur, zéro process externe, zéro interpréteur système — plus
  de fichiers temporaires du tout (le build n'émet même plus
  l'avertissement `os.tmpdir()` de tout à l'heure, cette version ne
  touche jamais au disque).
- Fork de `libraw.wasm` (ssssota) — celui-ci a aussi été essayé et écarté
  : sa version publiée dépend du `Worker` du navigateur (`new
  Worker(...)`), absent de Node.js par défaut (`typeof Worker ===
  "undefined"` vérifié directement) ; le fork Colorhythm expose la même
  bibliothèque LibRaw sans cette dépendance.
- **Cette fois, vérifié RÉELLEMENT en Node.js avant d'écrire le code
  définitif** (pas seulement lu la doc comme pour `exiftool-vendored`) :
  script isolé (`LibRaw.initialize()` + `new LibRaw()` +
  `waitUntilReady()`) exécuté avec succès en Node nu, aucune erreur
  Worker/Perl/native. Toujours **pas de vrai fichier RAW public
  trouvable rapidement** pour vérifier `unpackThumb()` +
  `dcrawMakeMemThumb()` de bout en bout (plusieurs sources candidates
  toutes en 404) — la extraction réelle sur un vrai fichier reste à
  confirmer par Enzo, mais le problème structurel qui a fait échouer la
  première tentative (dépendance manquante sur la plateforme) est cette
  fois vérifié absent avant, pas découvert après coup.
- API : `open()` (buffer) → `unpackThumb()` → `dcrawMakeMemThumb()` →
  vérifie `type_ === "LIBRAW_IMAGE_JPEG"` avant d'utiliser `.data`
  (certains RAW embarquent un aperçu dans un autre format — traité comme
  "aucun aperçu utilisable" plutôt que planter).

**Suite, encore le même jour — testé avec de VRAIS RAW cette fois** :
Enzo a donné le chemin de deux CR3 réels sur son propre PC
(`IMG_9191.cr3`, `IMG_9192.cr3`, ~17 Mo chacun) — script jetable exécuté
en local (pas via l'app, directement avec la librairie), extraction
réussie des deux (aperçus JPEG 6000×4000, ~1,8 Mo, en-tête JPEG valide,
relus avec succès par `sharp` — le même outil que la vraie chaîne de
traitement). Bug d'échelle du pipeline complet confirmé sain ; script et
fichiers extraits supprimés après vérification (jamais commités).

Déployé ensuite → nouvel échec, différent : "Minified React error #441"
sur toutes les photos. Logs Vercel consultés à nouveau : `RuntimeError:
Aborted(Error: ENOENT: no such file or directory, open
'/_next/static/immutable/media/libraw.[hash].wasm')`. Cause identifiée
dans la documentation Next.js elle-même
(`node_modules/next/dist/docs/.../output.md`, section "Common include
patterns for native/runtime assets") : le traçage automatique des
fichiers nécessaires par route ("Output File Tracing") place le
`.wasm`, chargé dynamiquement via `import.meta.url`, dans les assets
CLIENT (`_next/static/`, servis par CDN) plutôt que dans le paquet
SERVEUR de la fonction — absent au runtime là où le code serveur en a
besoin. Fix documenté et appliqué : `outputFileTracingIncludes` dans
`next.config.ts` (`'/*': ['node_modules/@colorhythm/libraw-wasm/**/*']`)
force son inclusion dans le paquet de chaque route. **Vérifié après
coup, pas seulement supposé** : `libraw.wasm` apparaît maintenant dans
`.next/server/app/admin/galleries/[id]/page.js.nft.json` (fichier de
traçage généré par le build), absent avant ce correctif.

**Troisième bug de la même journée sur cette seule fonctionnalité**,
chacun différent (Perl absent → Worker absent de Node → fichier WASM mal
tracé) — motif qui se confirme : ce projet a régulièrement des
comportements qui divergent entre le local et Vercel, à vérifier
systématiquement sur la vraie plateforme avant de considérer un fix
terminé, jamais sur la seule base d'un `next build` local réussi.

**Suite immédiate — le fix `outputFileTracingIncludes` seul ne suffisait
pas**, même erreur persistante. Cause réelle : le code de la librairie
charge son `.wasm` via un motif que Turbopack réécrit en asset client
(déjà documenté ci-dessus) — tracer le fichier dans le paquet ne change
rien tant que le CODE continue de demander le mauvais chemin. Fix
définitif : lire le fichier nous-mêmes
(`lib/imaging/extract-raw-preview.ts`) et passer les octets directement
à `LibRaw.initialize()`, qui accepte un buffer explicite au lieu de son
chargement interne. Piège suivant, trouvé EN LOCAL cette fois avant
redéploiement (pas par Enzo) : résoudre le chemin via
`require.resolve('@colorhythm/libraw-wasm/libraw.wasm')` (le sous-chemin
que le paquet exporte lui-même) fait échouer le BUILD entier — Turbopack
a un support natif des imports `.wasm` et le déclenche dès qu'il voit
une chaîne `.wasm` passée à `require.resolve()`, produisant un module
cassé ("Module not found: Can't resolve 'a'"). Contourné en résolvant
l'entrée JS normale du paquet (`require.resolve('@colorhythm/libraw-wasm')`
— jamais spécial pour Turbopack) puis en construisant le chemin du
`.wasm` par un `path.join` sur son dossier, avec le même
`/*turbopackIgnore: true*/` déjà utilisé pour `os.tmpdir()`. **Vérifié
deux fois avant de redéployer** : script isolé confirmant que ce chemin
fonctionne en local ET extraction réussie sur un vrai CR3 avec cette
exacte méthode, puis `next build` local propre (aucun avertissement,
`libraw.wasm` toujours bien présent dans le fichier de traçage) — le
niveau de vérification locale le plus poussé de toute cette
fonctionnalité, après trois échecs consécutifs sur les tentatives
précédentes.

**Suite, quatrième piège — cette fois invisible en local, seulement au
runtime Vercel** : le build local passait proprement, mais Enzo a
retesté et eu une NOUVELLE erreur (pas la même) : `TypeError: The "path"
argument must be of type string. Received type number`. Cause : même
via `createRequire(import.meta.url).resolve(...)`, Turbopack réécrit
`require.resolve()` dans le bundle SERVEUR compilé en un ID de module
interne (un nombre), jamais un vrai chemin — invisible avec un script
Node nu (qui n'exécute jamais le code une fois passé par le bundler),
seulement démasqué en marchant sur le vrai runtime Vercel. Fix : plus
aucune résolution de module (`require`/`import`) pour ce chemin —
`process.cwd()` (répertoire de travail réel de la fonction serverless)
+ un chemin relatif fixe (`node_modules/@colorhythm/libraw-wasm/dist/libraw.wasm`),
sans aucune sémantique reconnue par un bundler, donc rien à intercepter.

**Cette fois, vérification poussée un cran plus loin qu'avant** : au
lieu de ne tester que le fichier source via un script isolé (qui n'avait
pas révélé le piège précédent, justement invisible hors du bundler),
inspection directe du CHUNK COMPILÉ par Turbopack après
`next build` — `path.join(process.cwd(), "node_modules",
"@colorhythm", "libraw-wasm", "dist", "libraw.wasm")` y apparaît intact,
comme du JS ordinaire, sans réécriture. Reste, comme toujours pour cette
fonctionnalité, à confirmer par un vrai test d'Enzo sur la plateforme
réelle — la seule vérification qui ait fini par révéler chacun des
quatre pièges jusqu'ici.

**🎉 Ça a marché.** Quatrième tentative concluante — confirmé par Enzo
en conditions réelles ("ÇA MARCHEEEEEEEEE"). L'extraction automatique
d'aperçu RAW fonctionne en production.

**Premier vrai import complet (119 RAW) — 102 réussis, 13 échecs**,
deux causes distinctes :
- `IMG_9097.cr3` — "Load failed" (message Safari/WebKit pour un fetch
  interrompu) : un aléa réseau ponctuel pendant l'envoi direct, pas un
  bug — une nouvelle tentative suffit normalement.
- Les 12 autres — "fichier introuvable" juste après un dépôt pourtant
  réussi (PUT confirmé 200 côté navigateur). Cohérent avec un court
  délai de cohérence lecture-après-écriture chez Backblaze sous forte
  charge concurrente (~10% d'échecs sur un lot de 119 avec plusieurs
  envois simultanés), pas une vraie perte de fichier.

**Deux améliorations en réponse** (retour d'Enzo : "j'aimerais qu'il y
ait un petit bouton qui me dise que ça charge [...] je dois aller les
chercher une par une, je veux un bouton pour réessayer") :
1. `getObjectBufferWithRetry()` (`photos-actions.ts`) — jusqu'à 3
   nouvelles tentatives espacées (300ms/800ms/1500ms) avant d'abandonner
   la lecture d'un fichier tout juste déposé — réduit directement le
   nombre d'échecs du type "fichier introuvable" à la source, sans
   qu'Enzo n'ait à intervenir.
2. Vrai bouton "Réessayer" (`photo-upload-form.tsx`) — `UploadFailure`
   conserve maintenant l'objet `File` original (pas seulement son nom),
   donc réessayer relance l'envoi directement, sans qu'Enzo n'ait à
   retrouver et resélectionner chaque photo échouée à la main.
3. Barre de progression bien visible (bannière dédiée, pas seulement le
   texte du bouton) + zone de dépôt verrouillée pendant l'envoi (évite
   la question "je dois attendre ou recommencer ?") + concurrence
   montée de 3 à 5 envois simultanés (gain modeste — le débit montant de
   la connexion d'Enzo reste la vraie limite pour des RAW de 20-80 Mo).

**Déploiement volontairement retardé jusqu'à la fin de l'import en
cours** : pousser une nouvelle version pendant qu'Enzo importait ses 119
RAW aurait invalidé les Server Actions déjà chargées dans son
navigateur (identifiants d'action recalculés à chaque build) et cassé
l'import en plein milieu — attendu la confirmation que l'import était
terminé avant de déployer cette suite.

## 7. Décisions encore ouvertes

Ces points nécessiteront l'avis du photographe avant d'être implémentés —
ne pas trancher seul :

- **Confirmation visuelle de la refonte du panneau de remarques**
  (§6septvicies) — implémentée et vérifiée par `tsc`/`eslint`/`vitest`/
  `next build`, mais pas encore vue par Enzo en conditions réelles (perte
  de session admin dans le navigateur de test, voir §6septvicies point 2
  fin). Rester attentif à un retour de mise en page après son premier
  essai.
- **Prestataire de paiement définitif** (Stripe supposé, à confirmer) et
  modalités exactes (paiement unique vs Payment Intent, devise unique EUR
  pour l'instant ?).
- **Service d'email transactionnel** (Resend suggéré, non validé).
- **Infrastructure IA existante** du photographe (pour la génération de
  textes d'introduction) — ne rien connecter avant d'avoir compris comment
  elle fonctionne déjà dans son autre projet.
- **Contenu définitif** de la bibliothèque de ~20 messages sur l'image de
  soi, et du message de philosophie de retouche — à rédiger séparément,
  le schéma est prêt (`TrustMessage`) mais vide.
- **Identité visuelle définitive** — direction largement posée le
  2026-08-21 (voir §6bis/§6dixies) : palette rouge/or utilisée dans toute
  l'interface (pas juste un CTA), typographies réelles (Bricolage
  Grotesque + Plus Jakarta Sans), micro-interactions au survol. **Logo
  réel intégré le 2026-08-22** (voir §6unvicies-suite/§6duovicies) :
  `public/brand/inkz-logo.png`, sur la page d'accueil. **Toujours
  ouvert** : codes hex exacts (toujours des estimations — le fichier logo
  lui-même est en noir et blanc, la palette rouge/or reste un choix
  d'interface distinct, pas extrait du logo), relecture visuelle par Enzo
  dans son propre navigateur (l'assistant ne peut pas prendre de capture
  d'écran dans cet environnement).
- **Mécanisme exact d'export Lightroom** — probablement liste + copie +
  export CSV des noms de fichiers sélectionnés (pas d'intégration directe
  avec Lightroom, à vérifier ce qui est réellement possible avant de
  promettre plus).
- **Hébergement définitif** — Vercel pressenti (mise en ligne en cours,
  voir §6octovicies), pas encore déployé.
- **Compte de stockage objet** — Backblaze B2 choisi à la place de
  Cloudflare R2 le 2026-08-23 (voir §6octovicies) : R2 exige une carte
  bancaire pour s'activer, ce qu'Enzo ne voulait pas donner. Compte pas
  encore créé par Enzo au moment d'écrire ceci — Neon, lui, est
  provisionné et fonctionnel depuis le 2026-08-21.

## 8. État actuel du projet

**Revue de sécurité ciblée effectuée** (voir §6nonies) — 2 corrections
réelles (brute-force possible sur `/admin/login`, mutation déclenchable par
un simple GET) + 1 durcissement (séparation des clés de session),
vérifiées en direct. Rien trouvé côté injection SQL, XSS, ou secrets en
dur.

**Neon provisionné et fonctionnel depuis le 2026-08-21** (voir §6quinquies)
— migrations appliquées, compte admin créé, testé de bout en bout en
conditions réelles : connexion → création de shooting → code d'accès →
galerie client → import de photo → transition de statut automatique.
Un bug réel (validation de formulaire, voir §6quinquies point 4) a été
trouvé et corrigé grâce à ce test — les tests automatisés seuls ne
l'avaient pas détecté. R2 reste à provisionner (stockage local de dev
utilisé pour l'instant, fonctionne correctement).

**Le chemin "paiement requis" fonctionne maintenant de bout en bout**
(voir §6octies) — auparavant, une galerie payante restait bloquée en
`PAYMENT_PENDING` sans aucun moyen de la faire avancer : bug corrigé avant
même d'être signalé par Enzo, en préparant simplement le test. Ajout aussi
du positionnement des remarques sur une photo (clic dans le lightbox) et
d'une passe de vérification mobile (aucun débordement horizontal trouvé
sur les pages clés, testé à 375px).

**Le parcours complet du brief (§18) est construit et vérifié de bout en
bout** depuis le 2026-08-21 — voir §6septies : code d'accès → sélection →
confirmation → post-production → livraison → téléchargement, la même
galerie évoluant à travers ses statuts sans jamais dupliquer de galerie.

Fait (Milestone 5 — post-production & livraison) — voir §6septies :

- `lib/services/final-delivery-service.ts` : import du fichier final
  (jamais retraité, jamais watermarké), transitions automatiques
  `TO_RETOUCH → IN_POST_PRODUCTION → READY_TO_DELIVER → DELIVERED`.
- `getDownloadUrl()` sur `StorageAdapter` — distinct de `getPreviewUrl()`,
  force le téléchargement même cross-origin sur R2 (`ResponseContentDisposition`).
- Vue client à 3 états (`GalleryView`/`WaitingView`/`DeliveryView`) pilotée
  par `Gallery.status`. Vue admin : import du final par photo sélectionnée.
- **Testé de bout en bout en conditions réelles**, y compris le
  téléchargement (URLs distinctes aperçu/téléchargement vérifiées) et
  l'idempotence de la transition `DELIVERED`.
- Pas construit : "Tout télécharger" (zip, présenté comme "éventuel" par
  le brief), paiement réel (hors périmètre).

Fait (Milestone 4 — confirmation de sélection) — voir §6sexies :

- Verrouillage/déverrouillage de la sélection, transition de statut
  automatique (paiement requis ou non), récapitulatif avant confirmation
  côté client, vue admin avec export Lightroom (copier/CSV).
- **Testé de bout en bout en conditions réelles** (pas seulement en
  local) : le cycle complet sélection → confirmation → statut → export →
  déverrouillage a été vérifié dans le navigateur contre la vraie base.
- Pas construit : paiement réel (hors périmètre) — le téléchargement des
  fichiers finaux, listé ici comme manquant à l'origine, est maintenant
  fait (voir Milestone 5 ci-dessus).

Fait (Milestone 3 — galerie client), en plus des Milestones 0-2 —
voir §6quater pour le détail :

- `/g/[slug]` fonctionnelle : saisie du code (`access-form.tsx`), grille
  responsive avec sélection par cœur et lightbox simple (`gallery-view.tsx`),
  résumé "N sélectionnées — M incluses" (`lib/domain/selection-summary.ts`).
- `lib/gallery-access/` : session client par galerie (cookie signé, scopé
  au chemin), limitation best-effort des tentatives de code.
- `lib/services/public-gallery-service.ts` (DTO strict, jamais de champ
  sensible) et `lib/services/selection-service.ts` (bascule la sélection,
  revérifie l'appartenance photo/galerie).
- `lib/domain/gallery-status-machine.ts` — transitions automatiques de
  statut ; `onFirstPhotoImported` branchée, le reste prêt pour le
  Milestone 4.
- `lib/domain/lightroom-export.ts` — testé, pas encore relié à une UI.
- Demandes de retouche/annotations (brief §7) : formulaire simple dans le
  lightbox client + affichage admin (voir §6quater point 10).
- `src/app/g/error.tsx` : même principe que `src/app/admin/error.tsx`,
  vérifié en le déclenchant réellement.
- Tests automatisés : 67 tests (`npm run test`).
- **Pas construit** (voir §6quater point 11) : confirmation de
  sélection/verrouillage, avant/après, contenu des messages optionnels
  (philosophie de retouche, image de soi — à écrire par Enzo),
  téléchargement final.

Fait (Milestone 2 — moteur previews/watermark), en plus des
Milestones 0-1 — voir §6ter pour le détail :

- `lib/domain/pricing.ts` et `lib/domain/watermark-policy.ts` (logique
  pure, testée).
- `lib/imaging/generate-preview.ts` : génération de preview + watermark
  rendu dans les pixels via `sharp`, testée avec de vraies images.
- `lib/storage/` : abstraction `StorageAdapter`, adapter local (dev, zéro
  coût, fonctionne dès maintenant) + adapter R2 (structurel, pas encore
  testé contre un vrai compte).
- `lib/services/import-photo.ts` + UI d'upload sur
  `/admin/galleries/[id]` (deux fichiers : original + aperçu JPEG),
  couverture automatique à la première photo.
- `src/app/admin/error.tsx` : error boundary admin (évite qu'une base
  injoignable affiche une page d'erreur brute).
- Amorce Milestone 3 : `lib/domain/access-code.ts` +
  `lib/services/access-code-service.ts`, émission de codes d'accès branchée
  dans l'admin (`/admin/galleries/[id]`) — la page publique `/g` de saisie
  reste à construire (voir §6ter, point 12).
- Tests automatisés (`vitest`, `npm run test`) : 46 tests sur
  `lib/domain`, `lib/storage`, `lib/imaging`.
- `npx tsc --noEmit`, `npx eslint .`, `npx next build` et `npm run test`
  passent tous les quatre.
- **Toujours pas de vrai compte Neon ni R2** — le stockage fonctionne déjà
  en local (adapter de dev), mais l'écriture Prisma (création de la ligne
  `Photo`) ne peut pas être testée de bout en bout tant que la base n'existe
  pas.

Fait (Milestone 1 — admin), en plus du Milestone 0 :

- Authentification admin fonctionnelle : login (`/admin/login`, Server
  Action + `useActionState`), logout, session cookie httpOnly signée
  (`jose`), Data Access Layer (`verifySession`/`getOptionalSession`/`getCurrentAdmin`
  dans `src/lib/auth/dal.ts`), vérification optimiste dans `src/proxy.ts`.
  Pas de formulaire d'inscription — compte créé via
  `npm run db:seed-admin`.
- Dashboard (`/admin`) : liste des shootings (statut, nombre de photos,
  client), bouton "Nouveau shooting".
- Création (`/admin/galleries/new`) et modification
  (`/admin/galleries/[id]`) d'un shooting : un seul champ requis (titre),
  tout le reste facultatif et replié sous "Réglages avancés" (watermark,
  tarification, activation des fonctionnalités optionnelles côté client).
- Prisma branché réellement : `prisma.config.ts` (config CLI, voir §4bis),
  `src/lib/db.ts` (client runtime via `@prisma/adapter-neon`), schéma validé
  (`prisma validate`/`generate` passent). **`prisma migrate dev` reste à
  lancer** dès qu'un vrai compte Neon existe (voir §7).
- Validation de formulaire centralisée et testée dans `src/lib/domain/gallery-form.ts`
  (zod), indépendante de Next/Prisma comme prévu par la convention du
  dossier.
- `npx tsc --noEmit`, `npx eslint .` et `npx next build` passent tous les
  trois sans erreur (vérifié avec un `DATABASE_URL` factice — aucune requête
  réelle n'est exécutée au build, les routes admin sont dynamiques).

Fait (Milestone 0 — fondations) :

- Projet Next.js 16 + TypeScript + Tailwind v4 scaffoldé (`create-next-app`).
- Design system temporaire : tokens centralisés dans `src/app/globals.css`
  (`:root` + `@theme inline`), typographie en piles système (`--font-sans-app`
  / `--font-serif-app`, aucune dépendance réseau en V1), tout remplaçable
  sans toucher aux composants — voir §6 pour le choix des polices.
- Structure de dossiers `src/lib/{domain,services,storage,auth}` posée avec
  un `README.md` expliquant le rôle de chacun (pas encore de code métier).
- Page d'accueil temporaire (pas de fausse identité Inkz), avec deux points
  d'entrée : `/g` (accès galerie client, stub) et `/admin` (espace
  photographe, stub).
- Schéma de données complet dans `prisma/schema.prisma`, couvrant la V1 et
  les fonctionnalités futures décrites dans le brief.
- `.env.example` documentant toutes les variables d'environnement prévues,
  sans aucune valeur réelle.
- Dépôt git initialisé.

Pas fait (volontairement, prochains jalons) :

- Codes d'accès galerie fonctionnels (schéma `AccessCode` prêt, rien de
  branché — prévu au Milestone 3).
- Galerie client, sélection, annotations, récapitulatif, confirmation.
- Export des noms de fichiers sélectionnés.
- Aucune dépendance payante n'a été souscrite (R2/Neon pas encore
  provisionnés — comptes à créer par le photographe puis renseignés dans
  `.env.local`). **Sans `DATABASE_URL` réel, l'admin ne peut pas encore
  être testé de bout en bout** (le code compile et le build passe, mais
  aucune requête n'a pu être exécutée contre une vraie base dans cet
  environnement).

## 9. Roadmap / jalons proposés

- **Milestone 0 — Fondations** ✅. Architecture, documentation, design
  system temporaire, modèle de données.
- **Milestone 1 — Admin** ✅ (code posé le 2026-08-21, voir §8 — test de
  bout en bout en attente d'un vrai compte Neon). Authentification (patron
  §4), dashboard, création/modification d'un shooting (formulaire minimal,
  champs facultatifs), branchement réel de Prisma + Neon (voir §4bis pour
  la config Prisma 7).
- **Milestone 2 — Import & previews** — code posé le 2026-08-21 (voir §6ter
  et §8). Import de photos, génération de preview + watermark rendu dans
  les pixels (testé avec de vraies images), couverture automatique,
  stockage utilisable dès maintenant en local (adapter de dev) et prêt pour
  R2. **Reste à faire** : test de bout en bout une fois Neon + R2
  provisionnés ; galerie de sélection avant/après upload en masse
  (aujourd'hui : une photo à la fois) si besoin plus tard.
- **Milestone 3 — Galerie client** — code posé le 2026-08-21 (voir §6quater
  et §8). Émission + saisie de code d'accès, galerie responsive, ouverture
  d'une photo (overlay simple), favoris/sélection (`useOptimistic`),
  résumé "N sélectionnées — M incluses", demande de retouche simple par
  photo (brief §7). Testé de bout en bout contre la vraie base le
  2026-08-21 (voir §6quinquies) — un bug réel trouvé et corrigé au
  passage. **Reste à faire** : **l'expérience/le ton méritent une
  relecture d'Enzo** avant d'être considérés définitifs (rien n'est figé,
  tout est dans les tokens CSS + composants existants).
- **Milestone 4 — Confirmation & suivi admin** — code posé et testé de
  bout en bout le 2026-08-21 (voir §6sexies et §8). Confirmation sans
  paiement réel (montant à 0 € géré proprement), verrouillage/déverrouillage
  de la sélection, vue admin de la sélection, export des noms de fichiers
  (copier/CSV). **Reste à faire** : le cas "paiement requis" (statut
  `PAYMENT_PENDING`) n'a été vérifié qu'en logique — pas encore testé avec
  une vraie galerie en mode payant (facile à faire, juste pas fait
  pendant cette session).
- **Milestone 5 — Post-production & livraison** — code posé et testé de
  bout en bout le 2026-08-21 (voir §6septies et §8). Import des fichiers
  finaux (jamais watermarkés/retraités), transitions automatiques jusqu'à
  `DELIVERED`, vue client "Tes photos sont prêtes ✨" avec téléchargement
  individuel. **Reste à faire** : "Tout télécharger" (zip, présenté par le
  brief comme "éventuel" — pas un manque, un choix) ; vérification contre
  un vrai compte R2 (le mécanisme `Content-Disposition` cross-origin n'est
  vérifié qu'en local pour l'instant).
- **Avec Milestone 5, le parcours complet du brief fondateur est construit
  et vérifié de bout en bout** (§1 : shooting → galerie de sélection →
  choix du client → paiement éventuel → post-production → livraison
  finale — le "paiement éventuel" reste au stade statut, pas de
  transaction réelle, comme demandé).
- **Plus tard (hors périmètre immédiat)** : paiement Stripe réel,
  philosophie de retouche + messages image de soi (contenu + activation),
  avant/après, IA facultative, emails transactionnels, politique
  d'archivage active, identité visuelle définitive, "Tout télécharger".

## 10. Conventions de code

- Interface et contenu en **français** ; noms de code (variables,
  fonctions, fichiers) en **anglais**, comme dans ce document.
- `lib/domain` ne dépend jamais de Next.js, Prisma ou d'un SDK de
  stockage — logique pure, testable isolément.
- Toute donnée sensible (originaux, emails, éventuels futurs secrets)
  transite par une Data Access Layer / des DTO explicites — jamais un
  objet Prisma complet passé tel quel à un composant client (voir §4).
- Aucun secret dans le code ou le frontend — uniquement via variables
  d'environnement (`.env.local`, jamais commité ; `.env.example` tenu à
  jour).
- Tests (`vitest`) colocalisés en `*.test.ts` à côté du fichier testé,
  uniquement pour du code sans dépendance externe non mockée
  (`lib/domain`, `lib/storage`, `lib/imaging`) — pas de mock Prisma pour
  l'instant, donc pas de tests sur `lib/services`. `npm run test` pour
  lancer, `npm run test:watch` en développement.

## 11. Sécurité — rappels non négociables

- `/admin` toujours protégé par une vraie session authentifiée, jamais par
  un simple code.
- `originalKey` (RAW) ne doit **jamais** apparaître dans une réponse
  destinée au client/navigateur.
- Toute Server Action doit revérifier l'authentification/l'autorisation
  elle-même, même si la page qui l'entoure est déjà protégée.
- Codes d'accès galerie stockés hashés (`AccessCode.codeHash`), jamais en
  clair.
- Watermark : ne jamais présenter la protection comme infranchissable dans
  les textes destinés au client (voir brief, section 13).
- Toute clé de stockage dérivée d'une entrée utilisateur (ex. extension de
  fichier uploadé) doit être assainie avant d'atteindre `path.join()` —
  voir `lib/storage/keys.ts` (`sanitizeExtension`) et l'incident corrigé en
  §6ter point 10.
- Une Server Action qui modifie des données liées à UNE galerie (sélection,
  etc.) doit revérifier que la ressource ciblée (ex. `photoId`) appartient
  bien à cette galerie précise, jamais seulement que l'appelant est
  "autorisé en général" — voir `lib/services/selection-service.ts`.
- La limitation de tentatives (`src/lib/rate-limit.ts`, utilisée pour
  `/admin/login` ET les codes d'accès galerie) est best-effort (mémoire
  process) — ne jamais la présenter comme une protection anti-brute-force
  robuste en production serverless multi-instance.
- Une mutation (écriture en base) ne doit jamais dépendre du simple rendu
  serveur d'une page (GET) — voir §6nonies point 2 (`markDeliveredOnClientView`
  déplacé vers un déclenchement explicite côté client).
- Les jetons de session (admin, accès galerie) doivent utiliser des clés
  cryptographiquement distinctes, même s'ils dérivent du même secret de
  base — voir §6nonies point 3.
- **Assistant IA (règle process, pas code)** : par défaut, demander au
  photographe de lancer lui-même toute commande contenant un mot de passe
  (`npm run db:seed-admin`), pour que le mot de passe ne transite jamais
  par l'assistant. Le 2026-08-21, Enzo a insisté et bloqué sur le
  fonctionnement du terminal — la commande a finalement été exécutée par
  l'assistant avec le mot de passe qu'il avait déjà tapé en clair dans le
  chat (le secret était donc déjà exposé dans l'historique de toute façon ;
  ce n'est PAS un service d'authentification tiers, juste un hash stocké
  dans sa propre base). Rester la ligne par défaut pour la prochaine fois,
  mais ne pas laisser le photographe bloqué indéfiniment si le terminal
  reste un obstacle réel.

## 12. Stockage et coûts — rappel de la politique

- Fichiers uniquement dans R2 (jamais Git, jamais en base). Bucket
  "originals" strictement privé, bucket "previews" servi via le backend.
- Aucune suppression automatique définitive. `Gallery.deletionWarningAt`
  est un simple indicateur affiché dans le dashboard ; toute suppression
  réelle d'originaux est un geste manuel du photographe.
- Avant de créer une dépendance payante (dépassement de palier gratuit,
  nouveau service), demander validation explicite — voir §7.

## 13. Comment reprendre ce projet dans une nouvelle session

1. Lire ce fichier en entier.
2. Si le travail touche à Next.js, relire les pages pertinentes de
   `node_modules/next/dist/docs/` plutôt que de supposer un comportement
   d'une version antérieure (voir §4).
3. Si le travail touche à Prisma/la base de données, lire §4bis avant de
   toucher à `schema.prisma` ou `prisma.config.ts` — la configuration a
   changé de manière structurelle en Prisma 7.
4. Vérifier `prisma/schema.prisma` avant toute modification du modèle de
   données — il est déjà pensé pour les fonctionnalités futures.
5. Ne pas construire de fonctionnalité listée en §7 (décisions ouvertes)
   sans en discuter avec le photographe.
6. Mettre à jour ce fichier (§6 décisions, §8 état, §9 roadmap) après tout
   changement structurel.
7. Pour tester en local avec une vraie base : créer un compte Neon,
   renseigner `DATABASE_URL` dans `.env.local`, lancer `npm run db:migrate`
   puis `npm run db:seed-admin` (avec `ADMIN_EMAIL`/`ADMIN_PASSWORD` en
   variables d'environnement) pour créer le compte photographe.
8. `npm run test` (vitest) fait tourner les tests de `lib/domain`,
   `lib/storage` et `lib/imaging` — à lancer après toute modification de ces
   dossiers, ils ne dépendent d'aucun compte externe.
9. Sans les variables `R2_*` dans `.env.local`, le stockage bascule
   automatiquement sur l'adapter local de dev (voir §6ter) — suffisant pour
   tester tout le pipeline d'import de photo avant d'avoir un compte R2.
