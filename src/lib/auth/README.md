# `lib/auth`

Authentification admin — strictement séparée de l'accès client par code.

Approche retenue (voir PROJECT_CONTEXT.md) : email + mot de passe hashé
(bcrypt) + session chiffrée dans un cookie httpOnly, suivant le patron
documenté par Next.js lui-même pour cette version du framework (`jose` pour
signer/vérifier, `server-only` pour empêcher toute exécution côté client).

Fichiers (Milestone 1) :

- `session.ts` — `encryptSession`/`decryptSession`, `createSession`,
  `deleteSession`, `readSessionCookie`.
- `dal.ts` — `verifySession()` (Data Access Layer, redirige si non
  authentifié), `getOptionalSession()` (ne redirige pas, pour le layout),
  `getCurrentAdmin()`. Point de passage unique pour vérifier qu'une requête
  admin est authentifiée — à rappeler dans chaque Server Action, pas
  seulement dans la page qui l'entoure.
- `password.ts` — hash/vérification via `bcryptjs` (implémentation pure JS,
  pas de compilation native).
- `definitions.ts` — schéma de validation zod du formulaire de login.

Complément : `src/proxy.ts` (à la racine de `src/`, pas dans ce dossier —
convention Next.js) fait une vérification optimiste sur `/admin/*` à partir
du cookie de session, avant même que `dal.ts` ne soit appelé.

Le code d'accès galerie (PIN client) n'est PAS une authentification et ne
vit pas ici : c'est une vérification métier (`lib/domain` /
`lib/services`), sans notion de session ni de rôle.
