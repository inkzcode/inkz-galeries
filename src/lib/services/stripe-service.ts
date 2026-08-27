import "server-only";
import Stripe from "stripe";
import type { Gallery } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateAmountDue } from "@/lib/domain/pricing";
import { onReadyForRetouch } from "@/lib/domain/gallery-status-machine";
import { decidePaymentIntentReuse } from "@/lib/domain/payment-intent-policy";
import { sendPaymentReceivedEmail } from "@/lib/email/send-payment-received-email";

// Intégration Stripe réelle (retour d'Enzo, 2026-08-28 : formulaire de
// carte intégré à la galerie, pas de redirection vers une page séparée —
// Payment Element, même périmètre de conformité qu'une page hébergée).
//
// Complète `payment-service.ts` (le bouton admin "marquer comme reçu"),
// ne le remplace JAMAIS : ce fichier ne doit jamais être une dépendance
// obligatoire du parcours de confirmation de sélection
// (`confirm-selection-service.ts`, non modifié). Si Stripe n'est pas
// configuré, le paiement en ligne n'est simplement pas proposé — voir
// `getStripeClient()`.
let cachedClient: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    // Une clé secrète sans secret de webhook créerait des paiements qu'on
    // ne pourrait jamais confirmer côté serveur — pire que ne rien
    // proposer. On exige donc les deux pour considérer Stripe "configuré".
    console.warn(
      "STRIPE_SECRET_KEY et/ou STRIPE_WEBHOOK_SECRET manquant — paiement en ligne non proposé (voir .env.example).",
    );
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new Stripe(secretKey);
  return cachedClient;
}

async function pricingForGallery(galleryId: string, gallery: Gallery) {
  // Jamais confiance dans un montant stocké — même principe que
  // `payment-service.ts` : recalculé à chaque fois depuis la sélection
  // réelle (déjà verrouillée à ce stade du parcours, donc immuable).
  const selectedCount = await prisma.selectionItem.count({
    where: { photo: { galleryId } },
  });
  return calculateAmountDue(
    {
      pricingMode: gallery.pricingMode,
      includedPhotosCount: gallery.includedPhotosCount,
      extraPhotoPriceCents: gallery.extraPhotoPriceCents,
      currency: gallery.currency,
    },
    selectedCount,
  );
}

export type PaymentIntentOutcome =
  | { status: "unavailable" }
  | { status: "not_pending" }
  | { status: "ok"; clientSecret: string; amountCents: number; currency: string };

// Point d'entrée appelé au montage du formulaire de paiement (juste après
// confirmation, ou en revenant plus tard sur une galerie déjà en attente
// de paiement — voir `payment-step.tsx`/`payment-view.tsx`).
export async function createOrReusePaymentIntent(gallerySlug: string): Promise<PaymentIntentOutcome> {
  const stripe = getStripeClient();
  if (!stripe) return { status: "unavailable" };

  const gallery = await prisma.gallery.findUnique({ where: { slug: gallerySlug } });
  if (!gallery || gallery.status !== "PAYMENT_PENDING") return { status: "not_pending" };

  const pricing = await pricingForGallery(gallery.id, gallery);

  const existing = await prisma.payment.findFirst({
    where: { galleryId: gallery.id, provider: "stripe", status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.providerPaymentId) {
    const intent = await stripe.paymentIntents.retrieve(existing.providerPaymentId);
    const decision = decidePaymentIntentReuse(intent.status);

    if (decision === "reuse" && intent.client_secret) {
      return {
        status: "ok",
        clientSecret: intent.client_secret,
        amountCents: pricing.amountDueCents,
        currency: pricing.currency,
      };
    }
    if (decision === "reconcile_paid") {
      // Le webhook n'est pas encore arrivé mais Stripe dit que c'est payé
      // — on réconcilie directement plutôt que de laisser le client
      // face à un formulaire de paiement pour une galerie déjà payée.
      await confirmStripePayment(gallery.id, intent.id);
      return { status: "not_pending" };
    }
    // "create" (PaymentIntent annulé) — retombe sur la création ci-dessous.
  }

  const intent = await stripe.paymentIntents.create({
    amount: pricing.amountDueCents,
    currency: pricing.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { galleryId: gallery.id, gallerySlug: gallery.slug },
  });

  await prisma.payment.create({
    data: {
      galleryId: gallery.id,
      provider: "stripe",
      providerPaymentId: intent.id,
      amountCents: pricing.amountDueCents,
      currency: pricing.currency,
      status: "PENDING",
    },
  });

  if (!intent.client_secret) return { status: "unavailable" }; // ne devrait jamais arriver
  return {
    status: "ok",
    clientSecret: intent.client_secret,
    amountCents: pricing.amountDueCents,
    currency: pricing.currency,
  };
}

// Seul point d'entrée pour confirmer un paiement Stripe — appelé par le
// webhook (`app/api/stripe-webhook/route.ts`) et par la réconciliation
// défensive ci-dessus. Reprend exactement la forme transactionnelle de
// `markPaymentReceived` (payment-service.ts), avec `changedBy: "SYSTEM"`
// plutôt que `"ADMIN"` et `Payment.provider = "stripe"` plutôt que `null`.
export async function confirmStripePayment(galleryId: string, providerPaymentId: string): Promise<void> {
  const gallery = await prisma.gallery.findUniqueOrThrow({ where: { id: galleryId } });
  if (gallery.status !== "PAYMENT_PENDING") return; // idempotent — redélivrance webhook, etc.

  const pricing = await pricingForGallery(galleryId, gallery);
  const nextStatus = onReadyForRetouch(gallery.status);

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { galleryId, providerPaymentId },
      data: { status: "PAID", paidAt: new Date() },
    }),
    prisma.gallery.update({ where: { id: galleryId }, data: { status: nextStatus } }),
    prisma.statusHistory.create({
      data: {
        galleryId,
        fromStatus: gallery.status,
        toStatus: nextStatus,
        changedBy: "SYSTEM",
        note: "Paiement confirmé via Stripe",
      },
    }),
  ]);

  // Ne bloque jamais la confirmation si l'envoi échoue (voir lib/email/shared.ts).
  if (gallery.clientEmail) {
    await sendPaymentReceivedEmail({
      clientEmail: gallery.clientEmail,
      galleryTitle: gallery.title,
      gallerySlug: gallery.slug,
      amountCents: pricing.amountDueCents,
      currency: pricing.currency,
    });
  }
}

// `payment_intent.payment_failed` — ne touche jamais au statut de la
// galerie (elle reste PAYMENT_PENDING, déjà le bon état : le client peut
// réessayer avec une autre carte sur le même PaymentIntent). Ne touche
// une ligne que si elle est encore PENDING, pour ne jamais écraser un
// PAID déjà confirmé par un webhook arrivé dans le désordre.
export async function markStripePaymentFailed(galleryId: string, providerPaymentId: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { galleryId, providerPaymentId, status: "PENDING" },
    data: { status: "FAILED" },
  });
}
