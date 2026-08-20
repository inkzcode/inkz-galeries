# `lib/auth`

Authentification admin — strictement séparée de l'accès client par code.

Approche retenue (voir PROJECT_CONTEXT.md) : email + mot de passe hashé
(bcrypt) + session chiffrée dans un cookie httpOnly, suivant le patron
documenté par Next.js lui-même pour cette version du framework (`jose` pour
signer/vérifier, `server-only` pour empêcher toute exécution côté client).

Fichiers prévus au prochain jalon :

- `session.ts` — `encrypt`/`decrypt`, `createSession`, `deleteSession`.
- `dal.ts` — `verifySession()` (Data Access Layer), point de passage unique
  pour vérifier qu'une requête admin est authentifiée.
- `password.ts` — hash/vérification bcrypt.

Le code d'accès galerie (PIN client) n'est PAS une authentification et ne
vit pas ici : c'est une vérification métier (`lib/domain` /
`lib/services`), sans notion de session ni de rôle.
