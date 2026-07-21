import { describe, it, expect } from "vitest";
import { mixSubtractive, mixPaints, mixMulti } from "../src/color/km.js";
import { rgbToLab, hexToRgb } from "../src/color/math.js";

describe("Kubelka-Munk mixing", () => {
  it("ultramarine + cadmium yellow makes a dull green (reference parity)", () => {
    const km = mixSubtractive([["#23348C", 1], ["#EFB204", 1]]);
    expect(km).toBe("#275349");
    expect(rgbToLab(...hexToRgb(km))[1]).toBeLessThan(0);
  });
  it("yellow cut with black drifts olive", () => {
    const yb = mixSubtractive([["#EFB204", 4], ["#23201C", 1]]);
    const pure = rgbToLab(...hexToRgb("#EFB204"));
    expect(rgbToLab(...hexToRgb(yb))[1]).toBeLessThan(pure[1]);
  });
  it("is idempotent and weight-scale invariant", () => {
    expect(mixSubtractive([["#C6912C", 3], ["#C6912C", 7]])).toBe("#C6912C");
    expect(mixSubtractive([["#23348C", 1], ["#EFB204", 1]]))
      .toBe(mixSubtractive([["#23348C", 10], ["#EFB204", 10]]));
  });
  it("is commutative and mixPaints/mixMulti delegate", () => {
    const ab = mixSubtractive([["#23348C", 1], ["#EFB204", 2]]);
    expect(mixSubtractive([["#EFB204", 2], ["#23348C", 1]])).toBe(ab);
    expect(mixPaints("#23348C", "#EFB204", 0.5)).toBe(mixSubtractive([["#23348C", 1], ["#EFB204", 1]]));
    expect(mixMulti([["#23348C", 1], ["#EFB204", 1]])).toBe(mixSubtractive([["#23348C", 1], ["#EFB204", 1]]));
  });
});
