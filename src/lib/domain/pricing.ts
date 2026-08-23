// Calcul du montant dû pour une sélection — logique métier pure (voir
// brief §14 et README.md de ce dossier). Aucune dépendance à Prisma/Next :
// reçoit une configuration de galerie déjà chargée et un nombre de photos
// sélectionnées, retourne une décision.
//
// Exemple du brief : 5 incluses, 9 sélectionnées, 4 en trop × 7 € = 28 €.

export type PricingConfig = {
  pricingMode: "DISABLED" | "FREE" | "INCLUDED_PLUS_EXTRA" | "PER_PHOTO";
  includedPhotosCount: number | null;
  extraPhotoPriceCents: number | null;
  currency: string;
};

export type PricingResult = {
  amountDueCents: number;
  currency: string;
  requiresPayment: boolean;
  includedPhotosUsed: number;
  extraPhotosCount: number;
};

export function calculateAmountDue(
  config: PricingConfig,
  selectedPhotosCount: number,
): PricingResult {
  const currency = config.currency;

  if (config.pricingMode === "DISABLED" || config.pricingMode === "FREE") {
    return {
      amountDueCents: 0,
      currency,
      requiresPayment: false,
      includedPhotosUsed: selectedPhotosCount,
      extraPhotosCount: 0,
    };
  }

  const pricePerExtraCents = config.extraPhotoPriceCents ?? 0;

  if (config.pricingMode === "PER_PHOTO") {
    const amountDueCents = selectedPhotosCount * pricePerExtraCents;
    return {
      amountDueCents,
      currency,
      requiresPayment: amountDueCents > 0,
      includedPhotosUsed: 0,
      extraPhotosCount: selectedPhotosCount,
    };
  }

  // INCLUDED_PLUS_EXTRA
  const included = config.includedPhotosCount ?? 0;
  const includedPhotosUsed = Math.min(included, selectedPhotosCount);
  const extraPhotosCount = Math.max(0, selectedPhotosCount - included);
  const amountDueCents = extraPhotosCount * pricePerExtraCents;

  return {
    amountDueCents,
    currency,
    requiresPayment: amountDueCents > 0,
    includedPhotosUsed,
    extraPhotosCount,
  };
}
