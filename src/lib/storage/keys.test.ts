import { describe, expect, it } from "vitest";
import { buildBeforeAfterObjectKey, buildPhotoObjectKey } from "./keys";

describe("buildPhotoObjectKey", () => {
  it("construit une clé namespacée galerie/photo/nature", () => {
    expect(
      buildPhotoObjectKey({
        galleryId: "gal_1",
        photoId: "pho_1",
        kind: "preview",
        extension: "jpg",
      }),
    ).toBe("gal_1/pho_1/preview.jpg");
  });

  it("normalise l'extension en minuscules sans point initial", () => {
    expect(
      buildPhotoObjectKey({
        galleryId: "g",
        photoId: "p",
        kind: "original",
        extension: ".CR3",
      }),
    ).toBe("g/p/original.cr3");
  });

  it("neutralise une extension malveillante tentant une traversée de chemin", () => {
    const key = buildPhotoObjectKey({
      galleryId: "g",
      photoId: "p",
      kind: "preview",
      extension: "jpg/../../../etc/passwd",
    });
    expect(key).toBe("g/p/preview.jpgetcpasswd");
    expect(key).not.toContain("..");
    expect(key).not.toContain("/etc");
  });

  it("retombe sur 'bin' si l'extension ne contient aucun caractère valide", () => {
    expect(
      buildPhotoObjectKey({ galleryId: "g", photoId: "p", kind: "original", extension: "../.." }),
    ).toBe("g/p/original.bin");
  });

  it("ne produit jamais la même clé pour deux natures différentes", () => {
    const base = { galleryId: "g", photoId: "p", extension: "jpg" };
    const preview = buildPhotoObjectKey({ ...base, kind: "preview" });
    const original = buildPhotoObjectKey({ ...base, kind: "original" });
    const final = buildPhotoObjectKey({ ...base, kind: "final" });
    expect(new Set([preview, original, final]).size).toBe(3);
  });
});

describe("buildBeforeAfterObjectKey", () => {
  it("construit une clé namespacée avec un préfixe distinct", () => {
    expect(
      buildBeforeAfterObjectKey({ exampleId: "ex_1", side: "before", extension: "jpg" }),
    ).toBe("before-after/ex_1/before.jpg");
  });

  it("normalise l'extension comme les autres clés", () => {
    expect(
      buildBeforeAfterObjectKey({ exampleId: "ex_1", side: "after", extension: ".PNG" }),
    ).toBe("before-after/ex_1/after.png");
  });

  it("ne produit jamais la même clé pour avant et après", () => {
    const before = buildBeforeAfterObjectKey({ exampleId: "ex_1", side: "before", extension: "jpg" });
    const after = buildBeforeAfterObjectKey({ exampleId: "ex_1", side: "after", extension: "jpg" });
    expect(before).not.toBe(after);
  });

  it("ne peut jamais collisionner avec une clé de photo de galerie", () => {
    const beforeAfterKey = buildBeforeAfterObjectKey({
      exampleId: "1",
      side: "before",
      extension: "jpg",
    });
    const photoKey = buildPhotoObjectKey({
      galleryId: "before-after",
      photoId: "1",
      kind: "preview",
      extension: "jpg",
    });
    expect(beforeAfterKey).not.toBe(photoKey);
  });
});
