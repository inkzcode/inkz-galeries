"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { motion } from "motion/react";
import { getStripe } from "@/lib/stripe/browser-client";
import { createOrReusePaymentIntentAction } from "./payment-actions";

// Formulaire de paiement Stripe intégré (retour d'Enzo, 2026-08-28 : "je
// veux bien qu'on rediscute [...] dans l'absolue oui je préfèrerais ça"
// — le client paie sans quitter la galerie). Utilisé à deux endroits :
// juste après confirmation dans `confirm-selection-bar.tsx` (même
// modale, contenu remplacé), et sur un chargement de page classique tant
// que `gallery.status === "PAYMENT_PENDING"` (voir `payment-view.tsx`,
// le chemin "je reviens plus tard finaliser mon paiement").
//
// Règle non négociable dans tout ce fichier : jamais de changement d'état
// "payé" décidé côté client. Un statut de galerie ne change que via le
// webhook Stripe (app/api/stripe-webhook/route.ts) — ici on se contente
// de POLLER (router.refresh()) jusqu'à ce que le serveur reflète le
// nouveau statut.
type LoadState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "confirming" }
  | { kind: "ready"; clientSecret: string; amountCents: number; currency: string };

const stripeAppearance = {
  variables: {
    colorPrimary: "#b3413e",
    colorBackground: "#ffffff",
    colorText: "#141414",
    borderRadius: "10px",
    fontFamily: "inherit",
  },
} as const;

export function PaymentStep({ gallerySlug }: { gallerySlug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Retour d'une redirection 3D Secure — Stripe ajoute ce paramètre à
      // l'URL de retour. Le statut réel est relu directement depuis
      // Stripe (jamais déduit de la simple présence du paramètre : le
      // client a pu annuler la vérification en cours de route).
      const returningClientSecret = searchParams.get("payment_intent_client_secret");
      if (returningClientSecret) {
        const stripe = await getStripe();
        if (!stripe) {
          if (!cancelled) setState({ kind: "unavailable" });
          return;
        }
        const { paymentIntent } = await stripe.retrievePaymentIntent(returningClientSecret);
        if (cancelled) return;
        if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
          setState({ kind: "confirming" });
          return;
        }
        if (paymentIntent) {
          setState({
            kind: "ready",
            clientSecret: returningClientSecret,
            amountCents: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
          });
          return;
        }
      }

      const result = await createOrReusePaymentIntentAction(gallerySlug);
      if (cancelled) return;
      if ("error" in result || result.status === "unavailable") {
        setState({ kind: "unavailable" });
        return;
      }
      if (result.status === "not_pending") {
        router.refresh();
        return;
      }
      setState({
        kind: "ready",
        clientSecret: result.clientSecret,
        amountCents: result.amountCents,
        currency: result.currency,
      });
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit se relancer que si la galerie change
  }, [gallerySlug]);

  // Tant que le paiement est "en cours de confirmation", on interroge le
  // serveur par intervalles — le webhook finira par faire passer la
  // galerie à un autre statut, ce qui fera basculer `page.tsx` ailleurs
  // et démontera ce composant de lui-même.
  useEffect(() => {
    if (state.kind !== "confirming") return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 5) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [state.kind, router]);

  if (state.kind === "loading") {
    return <p className="text-sm text-muted">Préparation du paiement…</p>;
  }

  if (state.kind === "unavailable") {
    return (
      <p className="text-sm text-ink-soft">
        Le paiement en ligne n&apos;est pas encore disponible pour cette galerie. Contactez
        votre photographe pour finaliser le règlement.
      </p>
    );
  }

  if (state.kind === "confirming") {
    return (
      <p className="text-sm text-ink-soft">
        Paiement reçu, confirmation en cours… Cette page se met à jour automatiquement.
      </p>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{ clientSecret: state.clientSecret, locale: "fr", appearance: stripeAppearance }}
    >
      <PaymentForm
        gallerySlug={gallerySlug}
        amountCents={state.amountCents}
        currency={state.currency}
        onConfirming={() => setState({ kind: "confirming" })}
      />
    </Elements>
  );
}

function PaymentForm({
  gallerySlug,
  amountCents,
  currency,
  onConfirming,
}: {
  gallerySlug: string;
  amountCents: number;
  currency: string;
  onConfirming: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/g/${gallerySlug}` },
      // Reste intégré à la page pour le cas courant (carte, pas de 3DS) —
      // ne redirige que si le moyen de paiement l'exige vraiment.
      redirect: "if_required",
    });

    setSubmitting(false);

    if (confirmError) {
      setError(confirmError.message ?? "Le paiement a échoué. Réessayez avec une autre carte.");
      return;
    }

    onConfirming();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Montant à régler :{" "}
        <span className="font-medium text-ink">
          {(amountCents / 100).toFixed(2)} {currency}
        </span>
      </p>
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <motion.button
        type="submit"
        disabled={!stripe || !elements || submitting}
        whileHover={!stripe || submitting ? undefined : { scale: 1.02 }}
        whileTap={!stripe || submitting ? undefined : { scale: 0.97 }}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-paper shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Traitement…" : "Payer"}
      </motion.button>
    </form>
  );
}
