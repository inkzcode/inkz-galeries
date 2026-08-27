import { NextResponse } from "next/server";
import { getStripeClient, confirmStripePayment, markStripePaymentFailed } from "@/lib/services/stripe-service";

// Route de callback Stripe — configurée dans le dashboard Stripe
// ("Developers" → "Webhooks"), PAS appelée par notre propre app. C'EST LE
// SEUL ENDROIT qui a le droit de faire passer une galerie de
// PAYMENT_PENDING à la suite pour un paiement Stripe : jamais la
// confirmation client seule (elle peut fermer l'onglet juste après un
// paiement réussi, ou une authentification 3D Secure peut se terminer
// hors de notre page) — voir `payment-step.tsx`, qui ne fait jamais
// avancer de statut lui-même.
//
// Contrairement à toutes les autres routes de l'app, PAS de vérification
// `hasGalleryAccess`/`verifySession` ici — Stripe appelle cette route sans
// aucune session, et la signature cryptographique (`constructEvent`)
// EST l'authentification.
export const runtime = "nodejs"; // vérification de signature = crypto Node

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  // Le corps DOIT être lu comme texte brut, jamais `.json()` d'abord — la
  // vérification de signature Stripe porte sur les octets exacts envoyés.
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const galleryId = intent.metadata.galleryId;
      if (galleryId) await confirmStripePayment(galleryId, intent.id);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const galleryId = intent.metadata.galleryId;
      if (galleryId) await markStripePaymentFailed(galleryId, intent.id);
      break;
    }
    default:
      // Type d'évènement non géré — on répond quand même 200 (Stripe
      // considère un webhook non-200 comme un échec à redélivrer).
      break;
  }

  return NextResponse.json({ received: true });
}
