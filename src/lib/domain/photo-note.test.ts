import { describe, expect, it } from "vitest";
import { PhotoNoteSchema } from "./photo-note";

describe("PhotoNoteSchema", () => {
  it("accepte un message seul, sans position", () => {
    expect(PhotoNoteSchema.safeParse({ message: "Retirer le bouton sur la joue" }).success).toBe(
      true,
    );
  });

  it("accepte un message avec une position sur l'image", () => {
    const result = PhotoNoteSchema.safeParse({
      message: "Petite mèche ici",
      positionX: 0.42,
      positionY: 0.13,
    });
    expect(result.success).toBe(true);
  });

  it("refuse un message vide", () => {
    expect(PhotoNoteSchema.safeParse({ message: "   " }).success).toBe(false);
  });

  it("refuse une position hors de l'image (0..1)", () => {
    expect(
      PhotoNoteSchema.safeParse({ message: "x", positionX: 1.5, positionY: 0.5 }).success,
    ).toBe(false);
  });

  it("accepte un vrai FormData sans point posé (positionX/Y absents, pas juste vides)", () => {
    const formData = new FormData();
    formData.set("message", "Sans point précis");
    // positionX/positionY volontairement absents (correspond à
    // gallery-view.tsx quand aucun clic n'a été fait sur l'image).
    const result = PhotoNoteSchema.safeParse({
      message: formData.get("message"),
      positionX: formData.get("positionX"),
      positionY: formData.get("positionY"),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.positionX).toBeUndefined();
    }
  });

  it("accepte un vrai FormData avec un point posé (positionX/Y en chaînes)", () => {
    const formData = new FormData();
    formData.set("message", "Ici");
    formData.set("positionX", "0.42");
    formData.set("positionY", "0.13");
    const result = PhotoNoteSchema.safeParse({
      message: formData.get("message"),
      positionX: formData.get("positionX"),
      positionY: formData.get("positionY"),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.positionX).toBeCloseTo(0.42);
      expect(result.data.positionY).toBeCloseTo(0.13);
    }
  });

  it("accepte un tracé libre (drawingPath) sérialisé en JSON avec une couleur", () => {
    const formData = new FormData();
    formData.set("message", "Entourer ce détail");
    formData.set(
      "drawingPath",
      JSON.stringify([
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.15 },
        { x: 0.15, y: 0.3 },
      ]),
    );
    formData.set("color", "#e63946");
    const result = PhotoNoteSchema.safeParse({
      message: formData.get("message"),
      positionX: formData.get("positionX"),
      positionY: formData.get("positionY"),
      drawingPath: formData.get("drawingPath"),
      color: formData.get("color"),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.drawingPath).toHaveLength(3);
      expect(result.data.color).toBe("#e63946");
    }
  });

  it("refuse un tracé trop court (un seul point, ce n'est pas un tracé)", () => {
    const result = PhotoNoteSchema.safeParse({
      message: "x",
      drawingPath: JSON.stringify([{ x: 0.5, y: 0.5 }]),
    });
    expect(result.success).toBe(false);
  });

  it("refuse une couleur mal formée", () => {
    const result = PhotoNoteSchema.safeParse({ message: "x", color: "red" });
    expect(result.success).toBe(false);
  });

  it("accepte un vrai FormData sans tracé (drawingPath/color absents)", () => {
    const formData = new FormData();
    formData.set("message", "Remarque générale, sans dessin");
    const result = PhotoNoteSchema.safeParse({
      message: formData.get("message"),
      drawingPath: formData.get("drawingPath"),
      color: formData.get("color"),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.drawingPath).toBeUndefined();
    }
  });
});
