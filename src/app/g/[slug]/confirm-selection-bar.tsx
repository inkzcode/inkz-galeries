"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmSelectionAction } from "./confirm-actions";
import type { SelectionSummary } from "@/lib/domain/selection-summary";

type SelectedPhoto = { id: string; previewUrl: string | null };

// Barre fixe en bas de page (brief §6/§15) : affiche le résumé, ouvre un
// récapitulatif avant confirmation définitive ("sélection → récapitulatif
// → confirmation", brief §15). Pas de paiement réel ici — juste le
// verrouillage et la transition de statut ; le paiement effectif est hors
// périmètre (brief §16).
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
  const [showRecap, setShowRecap] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmSelectionAction(gallerySlug);
      if (result && "success" in result) {
        setShowRecap(false);
        router.refresh();
      }
    });
  }

  if (locked) {
    return (
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 text-sm text-ink sm:px-6">
          Sélection confirmée — merci ! Le photographe s&apos;occupe de la suite.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 text-sm sm:px-6">
          <div>
            <span className="text-ink">{summary.label}</span>
            {summary.pricing.requiresPayment && (
              <span className="ml-2 text-ink-soft">
                {(summary.pricing.amountDueCents / 100).toFixed(2)} {summary.pricing.currency}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowRecap(true)}
            disabled={summary.selectedCount === 0}
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Confirmer ma sélection
          </button>
        </div>
      </div>

      {showRecap && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center"
          onClick={() => setShowRecap(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-paper p-6 sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-serif text-xl font-semibold text-ink">Récapitulatif</h2>
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
              <button
                type="button"
                onClick={() => setShowRecap(false)}
                className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm text-ink-soft transition-colors hover:border-ink"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Confirmation…" : "Confirmer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
