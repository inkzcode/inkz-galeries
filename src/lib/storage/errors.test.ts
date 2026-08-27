import { describe, expect, it } from "vitest";
import { isStorageCapExceeded } from "./errors";

// Le texte exact renvoyé par l'API compatible S3 de Backblaze pour un
// quota dépassé n'est pas documenté officiellement (voir errors.ts) —
// ces cas couvrent les formes plausibles de l'erreur AWS SDK plutôt
// qu'une reproduction garantie du texte réel B2.
describe("isStorageCapExceeded", () => {
  it("détecte une erreur AccessDenied dont le message mentionne le quota", () => {
    const error = new Error("cap exceeded for this account");
    error.name = "AccessDenied";
    expect(isStorageCapExceeded(error)).toBe(true);
  });

  it("détecte peu importe la casse", () => {
    const error = new Error("Cap Exceeded");
    error.name = "AccessDenied";
    expect(isStorageCapExceeded(error)).toBe(true);
  });

  it("ignore une AccessDenied sans rapport avec un quota", () => {
    const error = new Error("not authorized to perform this action");
    error.name = "AccessDenied";
    expect(isStorageCapExceeded(error)).toBe(false);
  });

  it("ignore une erreur transitoire sans lien avec un accès refusé", () => {
    const error = new Error("cap exceeded somewhere unrelated");
    error.name = "NetworkingError";
    expect(isStorageCapExceeded(error)).toBe(false);
  });

  it("ignore une valeur qui n'est pas une vraie Error", () => {
    expect(isStorageCapExceeded("cap exceeded")).toBe(false);
    expect(isStorageCapExceeded(null)).toBe(false);
    expect(isStorageCapExceeded(undefined)).toBe(false);
  });
});
