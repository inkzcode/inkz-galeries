import { calculateAmountDue, type PricingConfig, type PricingResult } from "./pricing";

// Résumé affiché au client pendant sa sélection (brief §6 : "7 photos
// sélectionnées — 5 incluses") et dans le récapitulatif avant confirmation
// (brief §15). Combine juste le comptage et lib/domain/pricing.ts — pas de
// nouvelle logique de calcul ici.

export type SelectionSummary = {
  selectedCount: number;
  pricing: PricingResult;
  /** Texte court prêt à afficher, ex. "7 photos sélectionnées — 5 incluses". */
  label: string;
};

export function summarizeSelection(
  config: PricingConfig,
  selectedCount: number,
): SelectionSummary {
  const pricing = calculateAmountDue(config, selectedCount);
  const photoWord = selectedCount > 1 ? "photos sélectionnées" : "photo sélectionnée";

  let label = `${selectedCount} ${photoWord}`;
  if (config.pricingMode === "INCLUDED_PLUS_EXTRA" && config.includedPhotosCount !== null) {
    label += ` — ${config.includedPhotosCount} incluse${config.includedPhotosCount > 1 ? "s" : ""}`;
  }

  return { selectedCount, pricing, label };
}
