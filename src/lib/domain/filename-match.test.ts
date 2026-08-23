import { describe, expect, it } from "vitest";
import { matchFilename } from "./filename-match";

const candidates = [
  { id: "a", filename: "IMG_1234.jpg" },
  { id: "b", filename: "IMG_5678.jpg" },
  { id: "c", filename: "test couleur (5).png" },
];

describe("matchFilename", () => {
  it("associe un nom de fichier identique (insensible à la casse)", () => {
    expect(matchFilename(candidates, "img_1234.jpg")).toBe("a");
  });

  it("associe un export Lightroom avec suffixe (-Edit)", () => {
    expect(matchFilename(candidates, "IMG_1234-Edit.jpg")).toBe("a");
  });

  it("associe malgré un nom avec espaces/parenthèses des deux côtés", () => {
    expect(matchFilename(candidates, "test-couleur-5-edit.png")).toBe("c");
  });

  it("ne devine pas en cas d'ambiguïté entre plusieurs candidats", () => {
    const ambiguous = [
      { id: "x", filename: "photo.jpg" },
      { id: "y", filename: "photo.jpeg" },
    ];
    expect(matchFilename(ambiguous, "photo-edit.png")).toBe(null);
  });

  it("renvoie null quand aucun candidat ne correspond", () => {
    expect(matchFilename(candidates, "totalement-different.jpg")).toBe(null);
  });
});
