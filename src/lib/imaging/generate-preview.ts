// Pas de garde "server-only" ici : ce module est du traitement d'image pur
// (aucun secret, aucun accès base/stockage) et doit rester importable
// depuis les tests (vitest, hors du graphe Server Component de Next — le
// marqueur "server-only" lève systématiquement en dehors de ce graphe).
import sharp from "sharp";
import { getWatermarkPlan, type WatermarkLevelValue } from "@/lib/domain/watermark-policy";

export type GeneratePreviewOptions = {
  watermarkLevel: WatermarkLevelValue;
  /** Texte affiché dans le filigrane, ex. "INKZ · Portrait Julie". */
  watermarkText: string;
  /** Graine déterministe (typiquement l'id de la photo) pour faire varier
   * légèrement le motif d'une photo à l'autre — voir README.md. */
  seed?: string;
};

export type GeneratePreviewResult = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "jpeg";
};

export async function generatePreview(
  sourceBuffer: Buffer,
  options: GeneratePreviewOptions,
): Promise<GeneratePreviewResult> {
  const plan = getWatermarkPlan(options.watermarkLevel);

  // Ni .rotate() ni .jpeg() plus bas n'appellent .withMetadata() : sharp ne
  // réécrit donc PAS l'EXIF de la source dans la sortie — les données GPS
  // éventuelles (lieu du shooting) ne fuitent jamais vers la preview
  // client. Vérifié par un test (voir generate-preview.test.ts) : ne pas
  // ajouter .withMetadata() sans y repenser.
  const { data, info } = await sharp(sourceBuffer)
    .rotate() // auto-oriente selon l'EXIF avant qu'il ne soit perdu
    .resize({
      width: plan.maxLongEdgePx,
      height: plan.maxLongEdgePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  if (!plan.watermark) {
    const buffer = await sharp(data).jpeg({ quality: plan.quality }).toBuffer();
    return { buffer, width, height, format: "jpeg" };
  }

  const overlay = buildWatermarkOverlaySvg({
    width,
    height,
    text: options.watermarkText,
    seed: options.seed ?? "",
    opacity: plan.watermark.opacity,
    tiled: plan.watermark.tiled,
    tileSpacingPx: plan.watermark.tileSpacingPx,
    fontSizePx: plan.watermark.fontSizePx,
  });

  const buffer = await sharp(data)
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .jpeg({ quality: plan.quality })
    .toBuffer();

  return { buffer, width, height, format: "jpeg" };
}

// PRNG déterministe (mulberry32) à partir d'une chaîne — juste assez pour
// faire varier légèrement la position/rotation du filigrane par photo,
// sans dépendance externe.
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWatermarkOverlaySvg(params: {
  width: number;
  height: number;
  text: string;
  seed: string;
  opacity: number;
  tiled: boolean;
  tileSpacingPx: number;
  fontSizePx: number;
}): string {
  const { width, height, text, seed, opacity, tiled, tileSpacingPx, fontSizePx } = params;
  const random = seededRandom(seed || text);
  const safeText = escapeSvgText(text);
  const fill = `rgba(255,255,255,${opacity})`;
  const stroke = `rgba(0,0,0,${opacity * 0.6})`;

  const jitter = (range: number) => (random() - 0.5) * range;

  let marks = "";

  if (tiled) {
    const rotation = -28 + jitter(6);
    const stepX = tileSpacingPx;
    const stepY = tileSpacingPx * 0.7;
    // Sur-échantillonne largement pour couvrir l'image même après rotation.
    const cols = Math.ceil(width / stepX) + 2;
    const rows = Math.ceil(height / stepY) + 2;
    for (let row = -1; row < rows; row += 1) {
      for (let col = -1; col < cols; col += 1) {
        const x = col * stepX + (row % 2 === 0 ? 0 : stepX / 2) + jitter(stepX * 0.2);
        const y = row * stepY + jitter(stepY * 0.2);
        marks += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rotation.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" font-size="${fontSizePx}" font-family="sans-serif" fill="${fill}" stroke="${stroke}" stroke-width="0.5">${safeText}</text>`;
      }
    }
  } else {
    const x = width - fontSizePx * safeText.length * 0.32 - 24 + jitter(8);
    const y = height - 24 + jitter(6);
    marks = `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fontSizePx}" font-family="sans-serif" fill="${fill}" stroke="${stroke}" stroke-width="0.5">${safeText}</text>`;
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${marks}</svg>`;
}
