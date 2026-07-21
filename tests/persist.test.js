import { describe, it, expect } from "vitest";
import { loadSaved, PW_KEY } from "../src/state/persist.js";

function fakeStore(initial) {
  const map = new Map(initial ? [[PW_KEY, initial]] : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    has: (k) => map.has(k),
  };
}

const GOOD_PIN = { id: 3, num: 1, fx: 0.5, fy: 0.5, hex: "#AABBCC" };

describe("loadSaved", () => {
  it("returns defaults with no store", () => {
    const out = loadSaved(null);
    expect(out.pins.contrast).toEqual([]);
    expect(out.palette).toEqual([]);
    expect(out.box.size).toBe(0);
    expect(out.boxOnly).toBe(false);
  });

  it("round-trips a valid save", () => {
    const out = loadSaved(fakeStore(JSON.stringify({
      pins: { contrast: [GOOD_PIN] }, palette: ["#112233"], box: ["wn-titanium"], boxOnly: true,
    })));
    expect(out.pins.contrast).toHaveLength(1);
    expect(out.pins.contrast[0].hex).toBe("#AABBCC");
    expect(out.palette).toEqual(["#112233"]);
    expect(out.box.has("wn-titanium")).toBe(true);
    expect(out.boxOnly).toBe(true);
  });

  it("survives corrupt JSON and removes the key so reload self-heals", () => {
    const store = fakeStore("{not json");
    const out = loadSaved(store);
    expect(out.pins.contrast).toEqual([]);
    expect(store.has(PW_KEY)).toBe(false);
  });

  it("survives non-iterable pins (the module-scope crash class)", () => {
    const out = loadSaved(fakeStore(JSON.stringify({ pins: { contrast: 5 } })));
    expect(out.pins.contrast).toEqual([]);
  });

  it("drops malformed pin entries but keeps valid ones", () => {
    const out = loadSaved(fakeStore(JSON.stringify({
      pins: { contrast: [null, { id: 1 }, { ...GOOD_PIN, hex: "nope" }, GOOD_PIN] },
    })));
    expect(out.pins.contrast).toHaveLength(1);
    expect(out.pins.contrast[0].id).toBe(3);
  });

  it("ignores non-array palette and box, never restores upload pins", () => {
    const out = loadSaved(fakeStore(JSON.stringify({
      palette: "abc", box: 5, pins: { upload: [GOOD_PIN] },
    })));
    expect(out.palette).toEqual([]);
    expect(out.box.size).toBe(0);
    expect(out.pins.upload).toEqual([]);
  });

  it("filters non-hex palette entries", () => {
    const out = loadSaved(fakeStore(JSON.stringify({ palette: ["#112233", 42, "red", "#ZZZZZZ"] })));
    expect(out.palette).toEqual(["#112233"]);
  });
});

describe("loadSaved shopping list", () => {
  it("round-trips a saved shopping list", () => {
    const out = loadSaved(fakeStore(JSON.stringify({
      shop: { targets: [{ hex: "#aabbcc", label: "Cluster 1" }], ticked: ["W&N::Yellow Ochre"], name: "study.jpg" },
    })));
    expect(out.shop.targets).toEqual([{ hex: "#AABBCC", label: "Cluster 1" }]);
    expect(out.shop.ticked).toEqual(["W&N::Yellow Ochre"]);
    expect(out.shop.name).toBe("study.jpg");
  });
  it("sanitises malformed shop data to defaults", () => {
    const out = loadSaved(fakeStore(JSON.stringify({
      shop: { targets: [null, { hex: "bad" }, 5], ticked: "nope", name: 42 },
    })));
    expect(out.shop.targets).toEqual([]);
    expect(out.shop.ticked).toEqual([]);
    expect(out.shop.name).toBeNull();
  });
  it("defaults shop when absent", () => {
    const out = loadSaved(fakeStore(JSON.stringify({ palette: [] })));
    expect(out.shop).toEqual({ targets: [], ticked: [], name: null });
  });
});
