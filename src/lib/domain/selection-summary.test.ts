import { describe, expect, it } from "vitest";
import { summarizeSelection } from "./selection-summary";
import type { PricingConfig } from "./pricing";

describe("summarizeSelection", () => {
  it("reproduit l'exemple du brief : 7 sélectionnées — 5 incluses", () => {
    const config: PricingConfig = {
      pricingMode: "INCLUDED_PLUS_EXTRA",
      includedPhotosCount: 5,
      extraPhotoPriceCents: 700,
      currency: "EUR",
    };
    const summary = summarizeSelection(config, 7);
    expect(summary.label).toBe("7 photos sélectionnées — 5 incluses");
    expect(summary.pricing.amountDueCents).toBe(1400);
  });

  it("accord singulier/pluriel correct", () => {
    const config: PricingConfig = {
      pricingMode: "DISABLED",
      includedPhotosCount: null,
      extraPhotoPriceCents: null,
      currency: "EUR",
    };
    expect(summarizeSelection(config, 1).label).toBe("1 photo sélectionnée");
    expect(summarizeSelection(config, 0).label).toBe("0 photo sélectionnée");
    expect(summarizeSelection(config, 2).label).toBe("2 photos sélectionnées");
  });

  it("n'ajoute pas de mention 'incluses' hors du mode INCLUDED_PLUS_EXTRA", () => {
    const config: PricingConfig = {
      pricingMode: "PER_PHOTO",
      includedPhotosCount: null,
      extraPhotoPriceCents: 500,
      currency: "EUR",
    };
    expect(summarizeSelection(config, 3).label).toBe("3 photos sélectionnées");
  });
});
