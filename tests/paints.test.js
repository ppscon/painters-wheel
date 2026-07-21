import { describe, it, expect } from "vitest";
import { PAINTS, PAINT_LABS, paintPool, bestMixFor, computeRecord } from "../src/color/paints.js";
import { rgbToLab, hexToRgb, deltaE2000 } from "../src/color/math.js";

const ZORNBOX = new Set([
  "Winsor & Newton::Titanium White", "Winsor & Newton::Yellow Ochre",
  "Winsor & Newton::Cadmium Red", "Winsor & Newton::Ivory Black",
]);
describe("paintbox pooling", () => {
  it("filters to the box and falls back on empty intersection", () => {
    expect(paintPool(null)).toHaveLength(PAINT_LABS.length);
    expect(paintPool(ZORNBOX)).toHaveLength(4);
    expect(paintPool(new Set(["Nope::Nothing"]))).toHaveLength(PAINT_LABS.length);
  });
  it("bestMixFor never leaves the box", () => {
    const flesh = rgbToLab(...hexToRgb("#D9A882"));
    const all = paintPool(ZORNBOX).map((pt) => ({ ...pt, dE: deltaE2000(flesh, pt.lab) })).sort((a, b) => a.dE - b.dE);
    const mix = bestMixFor(flesh, all, ZORNBOX);
    for (const p of [mix.a, mix.b]) expect(ZORNBOX.has(p.m + "::" + p.n)).toBe(true);
  });
});
describe("computeRecord", () => {
  it("self-matches an exact tube at dE 0 with no mix suggested", () => {
    const r = computeRecord("#7A3B22", null);
    expect(r.matches[0].dE).toBeLessThan(0.01);
    expect(r.mix).toBeNull();
  });
  it("has a consistent database", () => {
    expect(PAINTS.length).toBe(PAINT_LABS.length);
    for (const p of PAINTS) expect(p.x).toMatch(/^#[0-9A-F]{6}$/);
  });
});
