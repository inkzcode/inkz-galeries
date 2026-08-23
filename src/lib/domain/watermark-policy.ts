// Traduction d'un niveau de protection (brief §13) en paramètres concrets
// de génération de preview. Logique pure — le rendu réel (sharp) vit dans
// lib/imaging, qui consomme ces paramètres.
//
// Rappel volontairement répété partout où ce sujet est documenté (voir
// aussi lib/imaging/README.md) : un watermark ne rend pas le vol
// mathématiquement impossible, il combine plusieurs frictions.

export type WatermarkLevelValue = "NONE" | "LIGHT" | "STANDARD" | "STRONG";

export type WatermarkPlan = {
  /** Redimensionnement du long côté de la preview, en pixels. */
  maxLongEdgePx: number;
  /** Qualité JPEG/WebP (0-100). */
  quality: number;
  /** null = pas de watermark du tout (niveau NONE). */
  watermark: {
    opacity: number;
    /** Répété en mosaïque sur toute l'image plutôt qu'une seule fois. */
    tiled: boolean;
    /** Espacement entre motifs si tiled=true, en pixels (à l'échelle de maxLongEdgePx). */
    tileSpacingPx: number;
    fontSizePx: number;
  } | null;
};

const PLANS: Record<WatermarkLevelValue, WatermarkPlan> = {
  NONE: {
    maxLongEdgePx: 2400,
    quality: 88,
    watermark: null,
  },
  LIGHT: {
    maxLongEdgePx: 1800,
    quality: 84,
    watermark: { opacity: 0.14, tiled: false, tileSpacingPx: 0, fontSizePx: 26 },
  },
  STANDARD: {
    maxLongEdgePx: 1600,
    quality: 80,
    watermark: { opacity: 0.2, tiled: true, tileSpacingPx: 260, fontSizePx: 22 },
  },
  STRONG: {
    maxLongEdgePx: 1200,
    quality: 74,
    watermark: { opacity: 0.28, tiled: true, tileSpacingPx: 170, fontSizePx: 24 },
  },
};

export function getWatermarkPlan(level: WatermarkLevelValue): WatermarkPlan {
  return PLANS[level];
}

// Texte discret ajouté sous l'image côté interface (pas dans les pixels) —
// voir brief §13. Reste identique quel que soit le niveau : le rappel legal
// doit être visible même en "Légère".
export const WATERMARK_DISCLAIMER =
  "Aperçu protégé — la suppression du filigrane ne confère aucun droit d'utilisation sur cette photographie.";
