import { describe, it, expect } from "vitest";
import { makeSyncCode, normaliseSyncCode } from "../src/state/sync.js";

describe("sync codes", () => {
  it("generates well-formed codes", () => {
    for (let i = 0; i < 20; i++) {
      const code = makeSyncCode();
      expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
      expect(code).not.toMatch(/[01OIL U]/);
    }
  });

  it("generated codes normalise to themselves", () => {
    const code = makeSyncCode();
    expect(normaliseSyncCode(code)).toBe(code);
  });

  it("normalises sloppy input", () => {
    expect(normaliseSyncCode("abcde fghjk mnpqr stvwx")).toBe("ABCDE-FGHJK-MNPQR-STVWX");
    expect(normaliseSyncCode("ABCDEFGHJKMNPQRSTVWX")).toBe("ABCDE-FGHJK-MNPQR-STVWX");
    expect(normaliseSyncCode(" abcde-fghjk-mnpqr-stvwx ")).toBe("ABCDE-FGHJK-MNPQR-STVWX");
  });

  it("rejects wrong lengths and empties", () => {
    expect(normaliseSyncCode("SHORT")).toBeNull();
    expect(normaliseSyncCode("")).toBeNull();
    expect(normaliseSyncCode(null)).toBeNull();
    expect(normaliseSyncCode("ABCDE-FGHJK-MNPQR-STVWX-EXTRA")).toBeNull();
  });
});
