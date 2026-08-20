# PROJECT_CONTEXT.md

> Ce fichier est la mémoire persistante du projet. Toute nouvelle session
> (Codex, Claude, ou autre) doit le lire en premier avant de modifier quoi
> que ce soit. Il doit être mis à jour à chaque décision structurelle.
>
> Dernière mise à jour : 2026-08-20 — création du projet, Milestone 0
> (fondations) posé.

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
| Traitement image / watermark | `sharp` (à ajouter au prochain jalon) | Rendu du watermark directement dans les pixels, gratuit, rapide |
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
    g/                    — routes client (accès par code), pas de compte
  lib/
    domain/                — logique métier pure (pricing, statuts, watermark policy) — aucune dépendance à Next/Prisma/S3
    services/               — orchestration (import photo, confirmation sélection...)
    storage/                — client R2, URLs signées, séparation originals/ vs previews/
    auth/                   — session admin (voir §4)
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

**Non vérifié dans ce sandbox** : `npx prisma validate`/`generate` ont
échoué ici car le téléchargement des binaires du moteur Prisma
(`binaries.prisma.sh`) est bloqué par la liste blanche réseau de cet
environnement (erreur 403). Ce n'est pas un problème du projet — à relancer
dans un environnement avec accès réseau complet (poste du photographe, CI,
build Vercel) avant la première migration. Le schéma a été relu à la main
pour la cohérence des relations.

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

## 7. Décisions encore ouvertes

Ces points nécessiteront l'avis du photographe avant d'être implémentés —
ne pas trancher seul :

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
- **Identité visuelle définitive** (logo, palette, typographies) — la V1
  utilise une direction éditoriale neutre volontairement temporaire.
- **Mécanisme exact d'export Lightroom** — probablement liste + copie +
  export CSV des noms de fichiers sélectionnés (pas d'intégration directe
  avec Lightroom, à vérifier ce qui est réellement possible avant de
  promettre plus).
- **Hébergement définitif** — Vercel pressenti, pas encore confirmé par le
  photographe pour la mise en production.

## 8. État actuel du projet

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

- Authentification admin (pas de code réel dans `lib/auth` encore).
- Dashboard, création/modification d'un shooting.
- Import de photos, génération/gestion des previews, watermark.
- Codes d'accès galerie fonctionnels.
- Galerie client, sélection, annotations, récapitulatif, confirmation.
- Export des noms de fichiers sélectionnés.
- Aucune dépendance payante n'a été souscrite (R2/Neon pas encore
  provisionnés — comptes à créer par le photographe puis renseignés dans
  `.env.local`).

## 9. Roadmap / jalons proposés

- **Milestone 0 — Fondations** ✅ (ce jalon). Architecture, documentation,
  design system temporaire, modèle de données.
- **Milestone 1 — Admin.** Authentification (patron §4), dashboard,
  création/modification d'un shooting (formulaire minimal, champs
  facultatifs), branchement réel de Prisma + Neon.
- **Milestone 2 — Import & previews.** Import de photos (RAW + preview
  pré-générée), stockage R2 (originals/previews séparés), watermark rendu
  dans les pixels selon le niveau configuré, couverture automatique/
  choisie.
- **Milestone 3 — Galerie client.** Codes d'accès, galerie responsive,
  ouverture d'une photo, favoris/sélection, commentaires simples,
  récapitulatif de sélection.
- **Milestone 4 — Confirmation & suivi admin.** Confirmation sans paiement
  réel (montant à 0 € géré proprement), verrouillage/déverrouillage de la
  sélection, vue admin de la sélection, export des noms de fichiers
  (affichage + copie + CSV).
- **Plus tard (hors périmètre immédiat)** : paiement Stripe réel,
  philosophie de retouche + messages image de soi (contenu + activation),
  avant/après, IA facultative, emails transactionnels, politique
  d'archivage active, identité visuelle définitive.

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
3. Vérifier `prisma/schema.prisma` avant toute modification du modèle de
   données — il est déjà pensé pour les fonctionnalités futures.
4. Ne pas construire de fonctionnalité listée en §7 (décisions ouvertes)
   sans en discuter avec le photographe.
5. Mettre à jour ce fichier (§6 décisions, §8 état, §9 roadmap) après tout
   changement structurel.
