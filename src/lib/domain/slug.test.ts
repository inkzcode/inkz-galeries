import { describe, expect, it } from "vitest";
import { generateGallerySlug, slugify } from "./slug";

describe("slugify", () => {
  it("retire les accents et met en minuscules", () => {
    expect(slugify("Séance Été")).toBe("seance-ete");
  });

  it("remplace la ponctuation par des tirets simples", () => {
    expect(slugify("Élise & Théo!")).toBe("elise-theo");
  });

  it("retourne une chaîne vide pour un titre vide", () => {
    expect(slugify("   ")).toBe("");
  });
});

describe("generateGallerySlug", () => {
  it("ajoute un suffixe pour éviter les collisions entre deux titres identiques", () => {
    const a = generateGallerySlug("Portrait Julie");
    const b = generateGallerySlug("Portrait Julie");
    expect(a).not.toBe(b);
    expect(a.startsWith("portrait-julie-")).toBe(true);
  });

  it("retombe sur 'shooting' si le titre ne contient aucun caractère slugifiable", () => {
    expect(generateGallerySlug("???")).toMatch(/^shooting-[a-z0-9]{5}$/);
  });
});
