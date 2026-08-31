import { describe, expect, it } from "vitest";
import { NOTE_COLORS, nextAvailableColor } from "./note-colors";

describe("nextAvailableColor", () => {
  it("donne la première couleur de la palette quand aucune n'est utilisée", () => {
    expect(nextAvailableColor([])).toBe(NOTE_COLORS[0]);
  });

  it("évite les couleurs déjà utilisées", () => {
    expect(nextAvailableColor([NOTE_COLORS[0]])).toBe(NOTE_COLORS[1]);
    expect(nextAvailableColor([NOTE_COLORS[0], NOTE_COLORS[1]])).toBe(NOTE_COLORS[2]);
  });

  it("ne redonne jamais une couleur déjà prise après la suppression d'une autre remarque (bug rapporté)", () => {
    // Remarque 1 : rouge, remarque 2 : bleu.
    const afterFirstTwo = [nextAvailableColor([])];
    afterFirstTwo.push(nextAvailableColor(afterFirstTwo));
    expect(afterFirstTwo).toEqual([NOTE_COLORS[0], NOTE_COLORS[1]]);

    // La remarque rouge est supprimée — seule la bleue reste visible.
    const stillVisible = [NOTE_COLORS[1]];

    // Une 3e remarque, créée après cette suppression, ne doit PAS
    // redevenir bleue (ce que faisait l'ancien calcul par index/comptage).
    const third = nextAvailableColor(stillVisible);
    expect(third).not.toBe(NOTE_COLORS[1]);
    expect(third).toBe(NOTE_COLORS[0]);
  });

  it("traite une couleur nulle comme la couleur de repli (rouge)", () => {
    expect(nextAvailableColor([null])).toBe(NOTE_COLORS[1]);
  });

  it("répète les couleurs une fois la palette entièrement utilisée", () => {
    const allUsed = [...NOTE_COLORS];
    expect(nextAvailableColor(allUsed)).toBe(NOTE_COLORS[allUsed.length % NOTE_COLORS.length]);
  });
});
