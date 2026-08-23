import { beforeAll, describe, expect, it } from "vitest";
import { generateAccessCodePlaintext, hashAccessCode, verifyAccessCode } from "./access-code";

beforeAll(() => {
  process.env.SESSION_SECRET ??= "test-secret-for-access-code-suite";
});

describe("generateAccessCodePlaintext", () => {
  it("génère un code de la longueur demandée", () => {
    expect(generateAccessCodePlaintext(6)).toHaveLength(6);
    expect(generateAccessCodePlaintext(8)).toHaveLength(8);
  });

  it("n'utilise jamais de caractères ambigus (0/o, 1/l/i)", () => {
    const code = generateAccessCodePlaintext(200);
    expect(code).not.toMatch(/[01liIO]/);
  });

  it("produit des codes différents à chaque appel (avec une probabilité écrasante)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateAccessCodePlaintext()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("hashAccessCode / verifyAccessCode", () => {
  it("un code haché puis vérifié avec la même valeur correspond", () => {
    const plaintext = generateAccessCodePlaintext();
    const hash = hashAccessCode(plaintext);
    expect(verifyAccessCode(plaintext, hash)).toBe(true);
  });

  it("rejette un code incorrect", () => {
    const hash = hashAccessCode("abc234");
    expect(verifyAccessCode("xyz999", hash)).toBe(false);
  });

  it("est insensible à la casse et aux espaces superflus (saisie client)", () => {
    const hash = hashAccessCode("ab3xz9");
    expect(verifyAccessCode(" AB3XZ9 ", hash)).toBe(true);
  });

  it("ne stocke jamais le code en clair (le hash diffère du texte source)", () => {
    const plaintext = "ab3xz9";
    const hash = hashAccessCode(plaintext);
    expect(hash).not.toBe(plaintext);
    expect(hash).not.toContain(plaintext);
  });

  it("est déterministe : le même code produit toujours le même hash (permet une recherche indexée)", () => {
    const plaintext = generateAccessCodePlaintext();
    expect(hashAccessCode(plaintext)).toBe(hashAccessCode(plaintext));
  });
});
