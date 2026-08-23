# `lib/gallery-access`

Session client "sans compte" (brief §4) — mémorise, après saisie réussie
d'un code d'accès, quelle(s) galerie(s) un navigateur a déverrouillée(s),
pour ne pas redemander le code à chaque page.

**Volontairement séparé de `lib/auth`** : ce n'est PAS une authentification
(pas de rôle, pas de notion d'admin, pas de mot de passe) — c'est une
vérification métier ponctuelle. Voir `lib/auth/README.md` pour la
distinction explicite.

Fichiers :

- `session.ts` — `grantGalleryAccess(gallerySlug)` / `hasGalleryAccess(gallerySlug)`.
  Un cookie **par galerie** (`ga_<slug>`), signé (`jose`, même secret que la
  session admin mais un claim `typ` dédié pour éviter toute confusion entre
  les deux), scopé au chemin `/g/<slug>` (le navigateur ne l'envoie même
  pas sur les autres galeries). Défense en profondeur : le payload contient
  aussi le slug, revérifié à la lecture — même si le nom/scope du cookie
  était mal utilisé quelque part, la vérification du contenu protège.
La limitation des tentatives de code vit maintenant dans `src/lib/rate-limit.ts`
(déplacé depuis ici lors de la revue de sécurité du 2026-08-21) : c'est un
mécanisme générique, réutilisé aussi par le login admin
(`src/app/admin/login/actions.ts`) — voir ce fichier pour le détail et ses
limites (mémoire uniquement, dépendance à `x-forwarded-for`).
