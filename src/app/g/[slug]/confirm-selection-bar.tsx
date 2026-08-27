"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { confirmSelectionAction } from "./confirm-actions";
import { SendBurst } from "./send-burst";
import { PaymentStep } from "./payment-step";
import type { SelectionSummary } from "@/lib/domain/selection-summary";

type SelectedPhoto = { id: string; previewUrl: string | null };

// Barre fixe en bas de page (brief §6/§15) : affiche le résumé, ouvre un
// récapitulatif avant confirmation définitive ("sélection → récapitulatif
// → confirmation", brief §15).
//
// Paiement Stripe branché le 2026-08-28 (retour d'Enzo : formulaire de
// carte intégré, pas de redirection) — quand la confirmation renvoie
// `requiresPayment`, la MÊME modale reste ouverte mais son contenu passe
// du récapitulatif au formulaire de paiement (`payment-step.tsx`), au
// lieu de se fermer. Le statut de la galerie, lui, ne change jamais ici :
// seul le webhook Stripe (app/api/stripe-webhook/route.ts) a le droit de
// faire avancer une galerie payée — voir payment-step.tsx.
export function ConfirmSelectionBar({
  gallerySlug,
  locked,
  summary,
  selectedPhotos,
}: {
  gallerySlug: string;
  locked: boolean;
  summary: SelectionSummary;
  selectedPhotos: SelectedPhoto[];
}) {
  const [modalStep, setModalStep] = useState<"closed" | "recap" | "payment">("closed");
  const [pending, startTransition] = useTransition();
  // Incrémenté à la confirmation réussie — voir send-burst.tsx. Vit dans
  // ce wrapper persistant (pas dans le récapitulatif, qui se ferme
  // immédiatement après succès) pour que l'animation ait le temps de
  // jouer jusqu'au bout.
  const [sendTriggerKey, setSendTriggerKey] = useState(0);
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmSelectionAction(gallerySlug);
      if (!result || "error" in result || !result.pricing) return;

      if (result.pricing.requiresPayment) {
        // Modale conservée ouverte, contenu remplacé par le formulaire de
        // paiement — pas de router.refresh() ici : voir payment-step.tsx.
        setModalStep("payment");
        return;
      }

      setModalStep("closed");
      setSendTriggerKey((key) => key + 1);
      router.refresh();
    });
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 bg-paper/95 shadow-[0_-8px_24px_-18px_rgba(20,20,20,0.25)] backdrop-blur-sm">
        {/* Même bandeau de marque qu'en tête de page (globals.css,
            `.brand-band`) — retour d'Enzo, 2026-08-27 : "la palette doit
            être plus présente [...] reconnaître visuellement Inkz". */}
        <div className="brand-band h-[3px] w-full" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-4 text-sm sm:px-6">
          <SendBurst triggerKey={sendTriggerKey} />
          {locked ? (
            <span className="text-ink">
              Sélection confirmée — merci ! Le photographe s&apos;occupe de la suite.
            </span>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-ink">{summary.label}</span>
                {summary.pricing.requiresPayment && (
                  <span className="ml-2 text-ink-soft">
                    {(summary.pricing.amountDueCents / 100).toFixed(2)} {summary.pricing.currency}
                  </span>
                )}
              </div>
              <motion.button
                type="button"
                onClick={() => setModalStep("recap")}
                disabled={summary.selectedCount === 0}
                whileHover={summary.selectedCount === 0 ? undefined : { scale: 1.04, y: -2 }}
                whileTap={summary.selectedCount === 0 ? undefined : { scale: 0.96 }}
                className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Confirmer ma sélection
              </motion.button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalStep !== "closed" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center"
            onClick={() => setModalStep("closed")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-paper p-6 sm:rounded-lg"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
            >
              {modalStep === "payment" ? (
                <>
                  <span aria-hidden className="block h-px w-10 bg-accent-soft" />
                  <h2 className="mt-3 font-serif text-xl font-semibold text-ink">Paiement</h2>
                  <div className="mt-4">
                    <PaymentStep gallerySlug={gallerySlug} />
                  </div>
                </>
              ) : (
                <>
                  <span aria-hidden className="block h-px w-10 bg-accent-soft" />
                  <h2 className="mt-3 font-serif text-xl font-semibold text-ink">Récapitulatif</h2>
                  <p className="mt-2 text-sm text-ink-soft">{summary.label}</p>
                  {summary.pricing.requiresPayment && (
                    <p className="mt-1 text-sm text-ink-soft">
                      Montant estimé : {(summary.pricing.amountDueCents / 100).toFixed(2)}{" "}
                      {summary.pricing.currency}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {selectedPhotos.map(
                      (photo) =>
                        photo.previewUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- voir storage/README.md
                          <img
                            key={photo.id}
                            src={photo.previewUrl}
                            alt=""
                            className="aspect-square rounded-sm object-cover"
                          />
                        ),
                    )}
                  </div>

                  <p className="mt-4 text-xs text-muted">
                    Une fois confirmée, la sélection est verrouillée — contactez
                    votre photographe pour la modifier ensuite.
                  </p>

                  <div className="mt-6 flex gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setModalStep("closed")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm text-ink-soft transition-colors hover:border-ink"
                    >
                      Annuler
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleConfirm}
                      disabled={pending}
                      whileHover={pending ? undefined : { scale: 1.02 }}
                      whileTap={pending ? undefined : { scale: 0.97 }}
                      className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-paper shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {pending ? "Confirmation…" : "Confirmer définitivement"}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
