import { describe, expect, it } from "vitest";
import { getWatermarkPlan } from "./watermark-policy";

describe("getWatermarkPlan", () => {
  it("NONE n'a pas de watermark et garde la meilleure qualité", () => {
    const plan = getWatermarkPlan("NONE");
    expect(plan.watermark).toBeNull();
    expect(plan.maxLongEdgePx).toBeGreaterThan(getWatermarkPlan("STRONG").maxLongEdgePx);
  });

  it("chaque niveau plus fort réduit résolution/qualité et augmente l'opacité", () => {
    const levels = ["NONE", "LIGHT", "STANDARD", "STRONG"] as const;
    for (let i = 1; i < levels.length; i += 1) {
      const previous = getWatermarkPlan(levels[i - 1]);
      const current = getWatermarkPlan(levels[i]);
      expect(current.maxLongEdgePx).toBeLessThanOrEqual(previous.maxLongEdgePx);
      expect(current.quality).toBeLessThanOrEqual(previous.quality);
    }
    expect(getWatermarkPlan("LIGHT").watermark?.opacity).toBeLessThan(
      getWatermarkPlan("STANDARD").watermark!.opacity,
    );
    expect(getWatermarkPlan("STANDARD").watermark?.opacity).toBeLessThan(
      getWatermarkPlan("STRONG").watermark!.opacity,
    );
  });

  it("seul LIGHT n'est pas répété en mosaïque", () => {
    expect(getWatermarkPlan("LIGHT").watermark?.tiled).toBe(false);
    expect(getWatermarkPlan("STANDARD").watermark?.tiled).toBe(true);
    expect(getWatermarkPlan("STRONG").watermark?.tiled).toBe(true);
  });
});
