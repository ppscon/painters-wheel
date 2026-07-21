import { describe, it, expect } from "vitest";
import { deltaE2000, rgbToLab, hexToRgb, rgbToHex, labToRgbHex } from "../src/color/math.js";

// Sharma, Cui & Dalal (2005) CIEDE2000 reference pairs
const SHARMA = [
  [[50.0, 2.6772, -79.7751], [50.0, 0.0, -82.7485], 2.0425],
  [[50.0, 3.1571, -77.2803], [50.0, 0.0, -82.7485], 2.8615],
  [[50.0, 2.8361, -74.02], [50.0, 0.0, -82.7485], 3.4412],
];
describe("CIEDE2000", () => {
  it("matches the Sharma reference pairs to 1e-3", () => {
    for (const [a, b, expected] of SHARMA) {
      expect(Math.abs(deltaE2000(a, b) - expected)).toBeLessThan(1e-3);
    }
  });
  it("is symmetric and zero on identity", () => {
    const a = rgbToLab(198, 145, 44), b = rgbToLab(35, 52, 140);
    expect(deltaE2000(a, a)).toBe(0);
    expect(Math.abs(deltaE2000(a, b) - deltaE2000(b, a))).toBeLessThan(1e-9);
  });
});
describe("sRGB round trips", () => {
  it("hex -> Lab -> hex is stable for in-gamut colours", () => {
    for (const hex of ["#C6912C", "#23348C", "#F4F1E9", "#23201C", "#7A3B22"]) {
      const [L, a, b] = rgbToLab(...hexToRgb(hex));
      expect(labToRgbHex(L, a, b).hex).toBe(hex);
    }
  });
  it("flags out-of-sRGB colours as clipped", () => {
    expect(labToRgbHex(50, 90, -100).clipped).toBe(true);
  });
});
