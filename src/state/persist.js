const PW_KEY = "painters-wheel-v1";

const PW_STORE = (() => {
  try {
    const k = "__pw_probe";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (e) { return null; }
})();

const LESSON_KEYS = ["contrast", "value", "hue", "chroma", "upload"];
const HEX_RE = /^#[0-9A-F]{6}$/i;

let PIN_SEQ = 1;
function nextPinId() { return PIN_SEQ++; }

function sanitisePin(p) {
  if (!p || typeof p !== "object") return null;
  const { id, num, fx, fy, hex, label } = p;
  if (![id, num, fx, fy].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  if (typeof hex !== "string" || !HEX_RE.test(hex)) return null;
  const pin = { id, num, fx, fy, hex: hex.toUpperCase() };
  if (typeof label === "string" && label) pin.label = label;
  return pin;
}

/* All reading, parsing and shape-validation of saved state lives here,
   behind one try/catch, so nothing can throw at module scope and a
   corrupt painters-wheel-v1 key can never white-screen the app. On a
   parse failure the key is removed so the next load starts clean. */
function loadSaved(store = PW_STORE) {
  const out = {
    pins: { contrast: [], value: [], hue: [], chroma: [], upload: [] },
    palette: [],
    box: new Set(),
    boxOnly: false,
    shop: { targets: [], ticked: [], name: null },
  };
  if (!store) return out;
  try {
    const saved = JSON.parse(store.getItem(PW_KEY) || "null");
    if (saved && typeof saved === "object") {
      if (saved.pins && typeof saved.pins === "object") {
        for (const k of LESSON_KEYS) {
          if (k === "upload") continue; // upload pins are never restored
          if (Array.isArray(saved.pins[k])) {
            out.pins[k] = saved.pins[k].map(sanitisePin).filter(Boolean);
          }
        }
      }
      if (Array.isArray(saved.palette)) {
        out.palette = saved.palette.filter((h) => typeof h === "string" && HEX_RE.test(h));
      }
      if (Array.isArray(saved.box)) {
        out.box = new Set(saved.box.filter((k) => typeof k === "string"));
      }
      out.boxOnly = !!saved.boxOnly;
      if (saved.shop && typeof saved.shop === "object") {
        if (Array.isArray(saved.shop.targets)) {
          out.shop.targets = saved.shop.targets
            .filter((t) => t && typeof t === "object" && typeof t.hex === "string" && HEX_RE.test(t.hex))
            .map((t) => ({ hex: t.hex.toUpperCase(), label: typeof t.label === "string" ? t.label : "" }));
        }
        if (Array.isArray(saved.shop.ticked)) {
          out.shop.ticked = saved.shop.ticked.filter((k) => typeof k === "string");
        }
        if (typeof saved.shop.name === "string") out.shop.name = saved.shop.name;
      }
    }
    for (const k of LESSON_KEYS) {
      for (const p of out.pins[k]) if (p.id >= PIN_SEQ) PIN_SEQ = p.id + 1;
    }
  } catch (e) {
    try { store.removeItem(PW_KEY); } catch (e2) { /* best effort */ }
  }
  return out;
}

export { PW_STORE, PW_KEY, loadSaved, nextPinId };
