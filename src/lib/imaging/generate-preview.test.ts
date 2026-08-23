import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { generatePreview } from "./generate-preview";
import { getWatermarkPlan } from "@/lib/domain/watermark-policy";

// Image de test générée à la volée par sharp — pas de fichier binaire dans
// le repo, pas de dépendance externe.
async function makeSourceJpeg(width = 3000, height = 2000): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 110, g: 130, b: 150 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("generatePreview", () => {
  it("redimensionne selon le plan du niveau NONE et produit un JPEG valide", async () => {
    const source = await makeSourceJpeg();
    const result = await generatePreview(source, {
      watermarkLevel: "NONE",
      watermarkText: "INKZ",
    });

    const plan = getWatermarkPlan("NONE");
    expect(result.format).toBe("jpeg");
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(plan.maxLongEdgePx);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(result.width);
  });

  it("le niveau NONE ignore la seed (aucun watermark à faire varier)", async () => {
    const source = await makeSourceJpeg();
    const a = await generatePreview(source, {
      watermarkLevel: "NONE",
      watermarkText: "INKZ",
      seed: "photo-a",
    });
    const b = await generatePreview(source, {
      watermarkLevel: "NONE",
      watermarkText: "INKZ",
      seed: "photo-b",
    });
    expect(Buffer.compare(a.buffer, b.buffer)).toBe(0);
  });

  it("un niveau avec watermark produit des pixels différents de l'original", async () => {
    const source = await makeSourceJpeg();
    const withoutWatermark = await sharp(source)
      .resize({
        width: getWatermarkPlan("STANDARD").maxLongEdgePx,
        fit: "inside",
      })
      .jpeg({ quality: getWatermarkPlan("STANDARD").quality })
      .toBuffer();

    const withWatermark = await generatePreview(source, {
      watermarkLevel: "STANDARD",
      watermarkText: "INKZ · Test",
      seed: "photo-1",
    });

    expect(Buffer.compare(withWatermark.buffer, withoutWatermark)).not.toBe(0);
  });

  it("la seed fait varier le rendu du watermark d'une photo à l'autre (brief §13)", async () => {
    const source = await makeSourceJpeg();
    const a = await generatePreview(source, {
      watermarkLevel: "STANDARD",
      watermarkText: "INKZ",
      seed: "photo-a",
    });
    const b = await generatePreview(source, {
      watermarkLevel: "STANDARD",
      watermarkText: "INKZ",
      seed: "photo-b",
    });
    expect(Buffer.compare(a.buffer, b.buffer)).not.toBe(0);
  });

  it("retire les métadonnées EXIF (dont GPS) de la source — vie privée du client/lieu de shooting", async () => {
    const sourceWithExif = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 100, b: 100 } },
    })
      .withExif({
        IFD0: {
          Make: "TestCam",
          GPSLatitude: "48/1 51/1 0/1",
          GPSLongitude: "2/1 21/1 0/1",
        },
      })
      .jpeg()
      .toBuffer();

    const sourceMetadata = await sharp(sourceWithExif).metadata();
    expect(sourceMetadata.exif).toBeDefined(); // vérifie que le test prouve bien quelque chose

    const result = await generatePreview(sourceWithExif, {
      watermarkLevel: "STANDARD",
      watermarkText: "INKZ",
      seed: "photo-1",
    });
    const previewMetadata = await sharp(result.buffer).metadata();
    expect(previewMetadata.exif).toBeUndefined();
  });

  it("respecte le plafond de résolution de chaque niveau", async () => {
    const source = await makeSourceJpeg(4000, 3000);
    for (const level of ["LIGHT", "STANDARD", "STRONG"] as const) {
      const result = await generatePreview(source, {
        watermarkLevel: level,
        watermarkText: "INKZ",
        seed: "photo-x",
      });
      expect(result.width).toBeLessThanOrEqual(getWatermarkPlan(level).maxLongEdgePx);
    }
  });
});
