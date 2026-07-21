import { describe, it, expect } from "vitest";
import { posterLUT, greyToL, lToGrey } from "../src/components/SamplerCanvas.jsx";

describe("posterise LUTs", () => {
  it("produce exactly n monotone levels on equal L* bands", () => {
    for (const n of [3, 5, 9]) {
      const lut = posterLUT(n);
      expect(new Set(lut).size).toBe(n);
      for (let i = 1; i < 256; i++) expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]);
    }
  });
  it("grey/L* helpers invert each other", () => {
    for (const L of [10, 35, 50, 70, 90]) {
      expect(Math.abs(greyToL(lToGrey(L)) - L)).toBeLessThan(0.6);
    }
  });
});
