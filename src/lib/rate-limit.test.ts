import { describe, expect, it } from "vitest";
import { clearAttempts, isRateLimited, recordFailedAttempt } from "./rate-limit";

describe("rate-limit", () => {
  it("n'est pas limité avant d'avoir atteint le seuil", () => {
    const key = "test-key-a";
    for (let i = 0; i < 7; i += 1) recordFailedAttempt(key);
    expect(isRateLimited(key)).toBe(false);
  });

  it("est limité une fois le seuil atteint", () => {
    const key = "test-key-b";
    for (let i = 0; i < 8; i += 1) recordFailedAttempt(key);
    expect(isRateLimited(key)).toBe(true);
  });

  it("des clés différentes (galerie/IP, ou login admin) sont indépendantes", () => {
    const key = "test-key-c";
    const otherKey = "test-key-d";
    for (let i = 0; i < 8; i += 1) recordFailedAttempt(key);
    expect(isRateLimited(key)).toBe(true);
    expect(isRateLimited(otherKey)).toBe(false);
  });

  it("clearAttempts réinitialise le compteur", () => {
    const key = "test-key-e";
    for (let i = 0; i < 8; i += 1) recordFailedAttempt(key);
    expect(isRateLimited(key)).toBe(true);
    clearAttempts(key);
    expect(isRateLimited(key)).toBe(false);
  });
});
