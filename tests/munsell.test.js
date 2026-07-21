import { describe, it, expect } from "vitest";
import { labToMunsell, munsellValueFromY, FAMILIES } from "../src/color/munsell.js";
import { MUNSELL_POINTS } from "../src/munsellData.js";
import { rgbToLab, hexToRgb } from "../src/color/math.js";

describe("renotation lookup", () => {
  it("round-trips stored renotation points (value <=0.15, chroma <=1.0)", () => {
    for (let i = 100; i < MUNSELL_POINTS.length / 6; i += 137) {
      const o = i * 6;
      const out = labToMunsell([MUNSELL_POINTS[o + 3] / 10, MUNSELL_POINTS[o + 4] / 10, MUNSELL_POINTS[o + 5] / 10]);
      const m = out.match(/^([\d.]+)([A-Z]+) ([\d.]+)\/([\d.]+)$/);
      if (!m) continue; // neutral-axis points
      expect(Math.abs(Number(m[3]) - MUNSELL_POINTS[o + 1] / 10)).toBeLessThanOrEqual(0.15);
      expect(Math.abs(Number(m[4]) - MUNSELL_POINTS[o + 2] / 10)).toBeLessThanOrEqual(1.0);
    }
  });
  it("classifies canonical colours", () => {
    expect(labToMunsell(rgbToLab(...hexToRgb("#FF0000")))).toMatch(/R /);
    expect(labToMunsell(rgbToLab(...hexToRgb("#808080")))).toMatch(/^N 5\.[23]\//);
    expect(labToMunsell(rgbToLab(...hexToRgb("#FFFFFF")))).toBe("N 10.0/");
  });
  it("ASTM value inversion agrees with the polynomial", () => {
    const V = 5.0;
    const Y = V * (1.1914 + V * (-0.22533 + V * (0.23352 + V * (-0.020484 + V * 0.00081939))));
    expect(Math.abs(munsellValueFromY(Y) - V)).toBeLessThan(1e-4);
  });
  it("exposes ten hue families", () => {
    expect(FAMILIES).toHaveLength(10);
  });
});
