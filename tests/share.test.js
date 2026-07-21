import { describe, it, expect } from "vitest";
import { encodeStudy, decodeStudy } from "../src/state/share.js";

const LESSONS = ["contrast", "value", "hue", "chroma"];
const pin = (num, label) => ({ num, fx: 0.25, fy: 0.75, hex: "#AABBCC", label });

describe("share URL round-trip", () => {
  it("round-trips pins with plain labels", () => {
    const hash = encodeStudy("value", [pin(1, "cheek highlight"), pin(2)]);
    const out = decodeStudy(hash, LESSONS);
    expect(out.lessonId).toBe("value");
    expect(out.pins).toHaveLength(2);
    expect(out.pins[0].label).toBe("cheek highlight");
    expect(out.pins[0].hex).toBe("#AABBCC");
    expect(out.pins[1].label).toBeUndefined();
  });

  it("round-trips labels containing the ~ separator and commas", () => {
    const label = "sky ~ warm, upper-left";
    const out = decodeStudy(encodeStudy("hue", [pin(1, label)]), LESSONS);
    expect(out.pins).toHaveLength(1);
    expect(out.pins[0].label).toBe(label);
  });

  it("rejects unknown lessons and malformed hashes", () => {
    expect(decodeStudy(encodeStudy("zorn", [pin(1)]), LESSONS)).toBeNull();
    expect(decodeStudy("#s=value.", LESSONS)).toBeNull();
    expect(decodeStudy("#other", LESSONS)).toBeNull();
    expect(decodeStudy("", LESSONS)).toBeNull();
  });

  it("filters out-of-range or invalid pins, keeps valid ones", () => {
    const hash = "#s=contrast." + [
      "1,0.5000,0.5000,AABBCC,",     // valid
      "0,0.5000,0.5000,AABBCC,",     // num < 1
      "2,1.5000,0.5000,AABBCC,",     // fx out of range
      "3,0.5000,0.5000,GGGGGG,",     // bad hex
    ].join("~");
    const out = decodeStudy(hash, LESSONS);
    expect(out.pins).toHaveLength(1);
    expect(out.pins[0].num).toBe(1);
  });
});
