# `lib/email`

Les 4 emails transactionnels du brief (§30). Via Resend (resend.com), offre
gratuite (100 emails/jour, aucune carte requise). Sans `RESEND_API_KEY`,
chaque envoi est simplement ignoré (log d'avertissement) — aucune action qui
déclenche un email ne doit jamais échouer à cause de l'email lui-même.

- `shared.ts` — `sendTransactionalEmail()` (dégradation gracieuse + appel
  Resend), `escapeHtml()`, `buildEmailHtml()` (gabarit visuel commun aux 4
  emails — couleurs de marque dupliquées en dur, un email n'a pas accès aux
  variables CSS de l'app).
- `send-gallery-available-email.ts` — vers le **client**, quand Enzo génère
  un code d'accès (`access-code-actions.ts`). Contient le code en clair —
  remplace l'envoi manuel qu'il faisait jusqu'ici.
- `send-selection-received-email.ts` — vers **Enzo** (un seul compte admin,
  voir `AdminUser`), quand le client verrouille sa sélection
  (`confirm-selection-service.ts`). C'est lui qui doit agir ensuite, pas le
  client.
- `send-payment-received-email.ts` — vers le **client**, quand Enzo marque un
  paiement reçu (`payment-service.ts`).
- `send-gallery-ready-email.ts` — vers le **client**, quand tous les fichiers
  finaux sont importés (`final-delivery-service.ts`). Le premier des 4,
  ajouté le 2026-08-22.
