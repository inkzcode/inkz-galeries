import { describe, expect, it } from "vitest";
import { calculateAmountDue, type PricingConfig } from "./pricing";

function config(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    pricingMode: "DISABLED",
    includedPhotosCount: null,
    extraPhotoPriceCents: null,
    currency: "EUR",
    ...overrides,
  };
}

describe("calculateAmountDue", () => {
  it("est gratuit et ne demande jamais de paiement quand désactivé", () => {
    const result = calculateAmountDue(config({ pricingMode: "DISABLED" }), 12);
    expect(result.amountDueCents).toBe(0);
    expect(result.requiresPayment).toBe(false);
  });

  it("est gratuit et ne demande jamais de paiement en mode FREE", () => {
    const result = calculateAmountDue(config({ pricingMode: "FREE" }), 40);
    expect(result.amountDueCents).toBe(0);
    expect(result.requiresPayment).toBe(false);
  });

  it("calcule l'exemple du brief : 5 incluses, 9 sélectionnées, 7€/photo => 28€", () => {
    const result = calculateAmountDue(
      config({
        pricingMode: "INCLUDED_PLUS_EXTRA",
        includedPhotosCount: 5,
        extraPhotoPriceCents: 700,
      }),
      9,
    );
    expect(result.extraPhotosCount).toBe(4);
    expect(result.includedPhotosUsed).toBe(5);
    expect(result.amountDueCents).toBe(2800);
    expect(result.requiresPayment).toBe(true);
  });

  it("INCLUDED_PLUS_EXTRA ne facture rien si la sélection tient dans les photos incluses", () => {
    const result = calculateAmountDue(
      config({
        pricingMode: "INCLUDED_PLUS_EXTRA",
        includedPhotosCount: 10,
        extraPhotoPriceCents: 700,
      }),
      6,
    );
    expect(result.amountDueCents).toBe(0);
    expect(result.requiresPayment).toBe(false);
    expect(result.includedPhotosUsed).toBe(6);
  });

  it("PER_PHOTO facture chaque photo sélectionnée, aucune incluse", () => {
    const result = calculateAmountDue(
      config({ pricingMode: "PER_PHOTO", extraPhotoPriceCents: 500 }),
      3,
    );
    expect(result.amountDueCents).toBe(1500);
    expect(result.includedPhotosUsed).toBe(0);
    expect(result.extraPhotosCount).toBe(3);
    expect(result.requiresPayment).toBe(true);
  });

  it("ne demande pas de paiement si le montant dû est nul (brief §16)", () => {
    const result = calculateAmountDue(
      config({ pricingMode: "PER_PHOTO", extraPhotoPriceCents: 500 }),
      0,
    );
    expect(result.amountDueCents).toBe(0);
    expect(result.requiresPayment).toBe(false);
  });
});
