import { describe, it, expect } from "vitest";
import { LADDER, buildLadder, bestRung, bestCorrection, bestAxisCorrection, axisReport, calibrationDefaults } from "../src/color/mixlab.js";
import { PAINT_LABS, computeRecord, nearestPaint } from "../src/color/paints.js";
import { rgbToLab, hexToRgb, deltaE2000 } from "../src/color/math.js";

const HEX = /^#[0-9A-F]{6}$/;
const BURNT_SIENNA = "#7A3B22";
const WHITE = "#F4F1E9";

describe("mixing ladder", () => {
  it("runs from straight source to 1:4 with valid rung colours", () => {
    const target = rgbToLab(...hexToRgb("#C08A5A"));
    const ladder = buildLadder(BURNT_SIENNA, WHITE, target);
    expect(ladder).toHaveLength(LADDER.length);
    expect(ladder[0].ratio).toBe("1:0");
    expect(ladder[0].hex).toBe(BURNT_SIENNA);
    expect(ladder[ladder.length - 1].ratio).toBe("1:4");
    for (const step of ladder) {
      expect(step.hex).toMatch(HEX);
      expect(Number.isFinite(step.dE)).toBe(true);
      expect(typeof step.munsell).toBe("string");
    }
  });
  it("lightens monotonically when stepping toward white", () => {
    const ladder = buildLadder(BURNT_SIENNA, WHITE, rgbToLab(...hexToRgb(BURNT_SIENNA)));
    const Ls = ladder.map((s) => rgbToLab(...hexToRgb(s.hex))[0]);
    for (let i = 1; i < Ls.length; i++) expect(Ls[i]).toBeGreaterThan(Ls[i - 1]);
  });
  it("bestRung picks the minimum-dE rung", () => {
    const target = rgbToLab(...hexToRgb("#B07850"));
    const ladder = buildLadder(BURNT_SIENNA, WHITE, target);
    const best = bestRung(ladder);
    for (const step of ladder) expect(best.dE).toBeLessThanOrEqual(step.dE);
  });
});

describe("bestCorrection", () => {
  it("finds an addition that improves on the straight source", () => {
    const target = rgbToLab(...hexToRgb("#C08A5A")); // lighter than burnt sienna
    const straight = deltaE2000(target, rgbToLab(...hexToRgb(BURNT_SIENNA)));
    const c = bestCorrection(BURNT_SIENNA, target, PAINT_LABS);
    expect(c).not.toBeNull();
    expect(c.dE).toBeLessThan(straight);
    expect(c.hex).toMatch(HEX);
    expect(c.paint.n).toBeTruthy();
  });
  it("returns null on an empty pool", () => {
    expect(bestCorrection(BURNT_SIENNA, rgbToLab(...hexToRgb("#FFFFFF")), [])).toBeNull();
  });
});

describe("axis-at-a-time correction", () => {
  const lab = (hex) => rgbToLab(...hexToRgb(hex));
  it("suggests value first when value is off", () => {
    // same hue family, target much lighter
    const r = axisReport(lab("#7A3B22"), lab("#C08A5A"));
    expect(r.suggest).toBe("value");
    expect(r.value).toBeGreaterThan(0.5); // source darker than target
    expect(r.aligned.value).toBe(false);
  });
  it("suggests hue once value is aligned", () => {
    // a red and a green of matched lightness
    const r = axisReport(lab("#B04030"), lab("#2E752F"));
    expect(r.aligned.value).toBe(true);
    expect(r.suggest).toBe("hue");
    expect(r.hue).toBeGreaterThan(1);
  });
  it("reports all aligned for a near-identical colour", () => {
    const r = axisReport(lab("#7A3B22"), lab("#7B3C23"));
    expect(r.suggest).toBeNull();
    expect(r.aligned).toEqual({ value: true, hue: true, chroma: true });
  });
  it("value mode closes the value gap harder than it moves chroma", () => {
    const target = lab("#C08A5A");
    const src = "#B47747";
    const c = bestAxisCorrection(src, target, PAINT_LABS, "value");
    expect(c).not.toBeNull();
    const before = axisReport(lab(src), target);
    const after = axisReport(lab(c.hex), target);
    expect(Math.abs(after.value)).toBeLessThan(Math.abs(before.value));
  });
  it("overall mode matches the unconstrained search", () => {
    const target = lab("#C08A5A");
    const a = bestAxisCorrection("#B47747", target, PAINT_LABS, "overall");
    const b = bestCorrection("#B47747", target, PAINT_LABS);
    expect(a.hex).toBe(b.hex);
    expect(a.ratio).toBe(b.ratio);
  });
});

describe("calibrationDefaults", () => {
  it("predicts progressively lighter tints", () => {
    const d = calibrationDefaults(BURNT_SIENNA);
    for (const h of [d.masstone, d.midTint, d.paleTint]) expect(h).toMatch(HEX);
    const L = (h) => rgbToLab(...hexToRgb(h))[0];
    expect(L(d.midTint)).toBeGreaterThan(L(d.masstone));
    expect(L(d.paleTint)).toBeGreaterThan(L(d.midTint));
  });
});

describe("calibration-aware matching", () => {
  const KEY = "Winsor & Newton::Burnt Sienna";
  const CAL = {
    [KEY]: { masstone: "#6E3520", midTint: "#B08468", paleTint: "#D8C0B0" },
  };
  it("matches against the calibrated masstone instead of the catalogue", () => {
    const r = computeRecord("#6E3520", new Set([KEY]), CAL);
    expect(r.matches[0].dE).toBeLessThan(0.01);
    expect(r.matches[0].matchType).toBe("masstone");
    expect(r.matches[0].calibrated).toBe(true);
    expect(r.matches[0].catalogX).toBe(BURNT_SIENNA);
  });
  it("matches a pale target at the pale tint and says so", () => {
    const r = computeRecord("#D8C0B0", new Set([KEY]), CAL);
    expect(r.matches[0].matchType).toBe("pale");
    expect(r.matches[0].matchX).toBe("#D8C0B0");
    expect(r.matches[0].dE).toBeLessThan(0.01);
  });
  it("nearestPaint is tint-aware too", () => {
    const near = nearestPaint("#B08468", new Set([KEY]), CAL);
    expect(near.matchType).toBe("mid");
    expect(near.dE).toBeLessThan(0.01);
  });
  it("leaves matching untouched with no calibrations", () => {
    const r = computeRecord(BURNT_SIENNA, null, {});
    expect(r.matches[0].dE).toBeLessThan(0.01);
    expect(r.matches[0].matchType).toBe("masstone");
  });
});
