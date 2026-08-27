// Logique pure (voir README.md de ce dossier) : que faire d'un
// PaymentIntent Stripe déjà créé pour une galerie, selon son statut actuel
// côté Stripe. Aucune dépendance au SDK Stripe — juste la valeur `status`
// qu'il renvoie — pour rester testable sans compte Stripe réel, comme
// `gallery-status-machine.ts`.
//
// Utilisé par `lib/services/stripe-service.ts` : évite de créer un
// PaymentIntent orphelin si le client recharge la page pendant un
// paiement (retour d'Enzo, 2026-08-28 : formulaire de carte intégré à la
// galerie, pas de redirection).
export type PaymentIntentReuseDecision = "reuse" | "reconcile_paid" | "create";

// Le SDK Stripe type `PaymentIntent.status` avec une valeur de secours
// ("OtherString") pour rester compatible si Stripe ajoute un jour un
// nouveau statut — ce paramètre accepte donc `string`, pas juste les
// valeurs connues aujourd'hui, plutôt que de forcer un cast côté appelant.
export function decidePaymentIntentReuse(existingStatus: string | null): PaymentIntentReuseDecision {
  if (existingStatus === null) return "create";
  if (existingStatus === "succeeded") return "reconcile_paid";
  if (existingStatus === "canceled") return "create";
  // requires_payment_method | requires_confirmation | requires_action |
  // processing | requires_capture (+ tout statut futur inconnu, par
  // prudence — on préfère réutiliser plutôt que risquer un PaymentIntent
  // en double) : encore ouvert côté Stripe, on réutilise le même
  // PaymentIntent plutôt que d'en créer un second.
  return "reuse";
}
