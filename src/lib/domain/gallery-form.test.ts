import { describe, expect, it } from "vitest";
import { eurosToCents, GalleryFormSchema } from "./gallery-form";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Portrait Julie",
    clientName: "",
    clientEmail: "",
    description: "",
    shootingType: "",
    shootingDate: "",
    watermarkLevel: "NONE",
    pricingMode: "DISABLED",
    includedPhotosCount: "",
    extraPhotoPriceEuros: "",
    retouchPhilosophyEnabled: false,
    selfImageMessagesEnabled: false,
    beforeAfterEnabled: false,
    ...overrides,
  };
}

describe("GalleryFormSchema", () => {
  it("accepte un formulaire minimal (titre seul)", () => {
    const result = GalleryFormSchema.safeParse(baseInput());
    expect(result.success).toBe(true);
  });

  it("refuse un titre vide", () => {
    const result = GalleryFormSchema.safeParse(baseInput({ title: "" }));
    expect(result.success).toBe(false);
  });

  it("refuse une adresse email invalide", () => {
    const result = GalleryFormSchema.safeParse(
      baseInput({ clientEmail: "pas-un-email" }),
    );
    expect(result.success).toBe(false);
  });

  it("refuse INCLUDED_PLUS_EXTRA sans nombre de photos incluses ni prix", () => {
    const result = GalleryFormSchema.safeParse(
      baseInput({ pricingMode: "INCLUDED_PLUS_EXTRA" }),
    );
    expect(result.success).toBe(false);
  });

  it("accepte INCLUDED_PLUS_EXTRA avec les deux champs renseignés", () => {
    const result = GalleryFormSchema.safeParse(
      baseInput({
        pricingMode: "INCLUDED_PLUS_EXTRA",
        includedPhotosCount: "5",
        extraPhotoPriceEuros: "7",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("refuse PER_PHOTO sans prix par photo", () => {
    const result = GalleryFormSchema.safeParse(baseInput({ pricingMode: "PER_PHOTO" }));
    expect(result.success).toBe(false);
  });

  // Bug réel rencontré en test manuel (2026-08-21) : quand pricingMode est
  // DISABLED, gallery-form.tsx ne rend même pas les <input>
  // includedPhotosCount/extraPhotoPriceEuros dans le DOM. `formData.get()`
  // renvoie alors `null` pour ces clés (PAS une chaîne vide) — un objet JS
  // avec `""` ne reproduit pas ce cas. Ce test simule un vrai FormData pour
  // le prouver.
  it("accepte un vrai FormData où les champs de prix sont absents (pricingMode DISABLED)", () => {
    const formData = new FormData();
    formData.set("title", "Portrait Julie");
    formData.set("watermarkLevel", "NONE");
    formData.set("pricingMode", "DISABLED");
    // includedPhotosCount / extraPhotoPriceEuros volontairement absents.

    const result = GalleryFormSchema.safeParse({
      title: formData.get("title"),
      clientName: formData.get("clientName"),
      clientEmail: formData.get("clientEmail"),
      description: formData.get("description"),
      shootingType: formData.get("shootingType"),
      shootingDate: formData.get("shootingDate"),
      watermarkLevel: formData.get("watermarkLevel"),
      pricingMode: formData.get("pricingMode"),
      includedPhotosCount: formData.get("includedPhotosCount"),
      extraPhotoPriceEuros: formData.get("extraPhotoPriceEuros"),
      retouchPhilosophyEnabled: formData.get("retouchPhilosophyEnabled") === "on",
      selfImageMessagesEnabled: formData.get("selfImageMessagesEnabled") === "on",
      beforeAfterEnabled: formData.get("beforeAfterEnabled") === "on",
    });

    expect(result.success).toBe(true);
  });
});

describe("eurosToCents", () => {
  it("convertit un montant entier", () => {
    expect(eurosToCents("7")).toBe(700);
  });

  it("convertit un montant avec virgule française", () => {
    expect(eurosToCents("7,50")).toBe(750);
  });

  it("convertit un montant avec point décimal", () => {
    expect(eurosToCents("12.99")).toBe(1299);
  });

  it("retourne undefined si aucune valeur n'est fournie", () => {
    expect(eurosToCents(undefined)).toBeUndefined();
  });
});
