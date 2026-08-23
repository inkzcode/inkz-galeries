import { describe, expect, it } from "vitest";
import { buildFilenameCsv, buildFilenameList } from "./lightroom-export";

describe("buildFilenameList", () => {
  it("liste un fichier par ligne, dans l'ordre fourni", () => {
    const list = buildFilenameList([
      { filename: "DSC_4821.CR3" },
      { filename: "DSC_4837.CR3" },
      { filename: "DSC_4872.CR3" },
    ]);
    expect(list).toBe("DSC_4821.CR3\nDSC_4837.CR3\nDSC_4872.CR3");
  });

  it("retourne une chaîne vide sans photo", () => {
    expect(buildFilenameList([])).toBe("");
  });
});

describe("buildFilenameCsv", () => {
  it("produit un CSV avec en-tête", () => {
    const csv = buildFilenameCsv([{ filename: "DSC_4821.CR3" }, { filename: "DSC_4837.CR3" }]);
    expect(csv).toBe("filename\r\nDSC_4821.CR3\r\nDSC_4837.CR3");
  });

  it("échappe les noms de fichiers contenant une virgule ou un guillemet", () => {
    const csv = buildFilenameCsv([{ filename: 'photo, "spéciale".CR3' }]);
    expect(csv).toBe('filename\r\n"photo, ""spéciale"".CR3"');
  });
});
