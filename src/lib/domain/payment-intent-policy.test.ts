import { describe, expect, it } from "vitest";
import { decidePaymentIntentReuse } from "./payment-intent-policy";

describe("payment-intent-policy", () => {
  it("crée un nouveau PaymentIntent quand il n'y en a pas encore", () => {
    expect(decidePaymentIntentReuse(null)).toBe("create");
  });

  it("réutilise un PaymentIntent encore ouvert", () => {
    expect(decidePaymentIntentReuse("requires_payment_method")).toBe("reuse");
    expect(decidePaymentIntentReuse("requires_confirmation")).toBe("reuse");
    expect(decidePaymentIntentReuse("requires_action")).toBe("reuse");
    expect(decidePaymentIntentReuse("processing")).toBe("reuse");
    expect(decidePaymentIntentReuse("requires_capture")).toBe("reuse");
  });

  it("réconcilie au lieu de recréer si le paiement a déjà réussi côté Stripe", () => {
    expect(decidePaymentIntentReuse("succeeded")).toBe("reconcile_paid");
  });

  it("recrée un PaymentIntent si l'ancien a été annulé", () => {
    expect(decidePaymentIntentReuse("canceled")).toBe("create");
  });
});
