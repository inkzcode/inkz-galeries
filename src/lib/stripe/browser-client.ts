import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Pas de "server-only" ici — ce fichier est justement destiné au
// navigateur (Payment Element). Mémoïsé : `loadStripe()` ne doit être
// appelé qu'une fois par session de page (recommandation officielle
// Stripe.js). Dégradation douce symétrique de `getStripeClient()`
// côté serveur (stripe-service.ts) : clé publique absente → `null`,
// jamais d'exception.
let cachedPromise: Promise<Stripe | null> | undefined;

export function getStripe(): Promise<Stripe | null> {
  if (cachedPromise) return cachedPromise;

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  cachedPromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
  return cachedPromise;
}
