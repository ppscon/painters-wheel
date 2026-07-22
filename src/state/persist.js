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
const MIX_LOG_MAX = 12;

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

/* Shape-validates a saved-state blob (from localStorage OR a remote
   sync payload) into safe, fully-typed state. Never throws. Also
   advances the pin id sequence past any restored pins. */
function sanitiseSaved(saved) {
  const out = {
    pins: { contrast: [], value: [], hue: [], chroma: [], upload: [] },
    palette: [],
    box: new Set(),
    boxOnly: false,
    shop: { targets: [], ticked: [], name: null },
    calib: {},
    mixLog: [],
  };
  try {
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
      if (saved.calib && typeof saved.calib === "object" && !Array.isArray(saved.calib)) {
        for (const k of Object.keys(saved.calib)) {
          const c = saved.calib[k];
          if (!k.includes("::") || !c || typeof c !== "object") continue;
          const { masstone, midTint, paleTint, updatedAt } = c;
          if (![masstone, midTint, paleTint].every((h) => typeof h === "string" && HEX_RE.test(h))) continue;
          out.calib[k] = {
            masstone: masstone.toUpperCase(),
            midTint: midTint.toUpperCase(),
            paleTint: paleTint.toUpperCase(),
            ...(typeof updatedAt === "string" ? { updatedAt } : {}),
          };
        }
      }
      if (Array.isArray(saved.mixLog)) {
        out.mixLog = saved.mixLog
          .filter((o) =>
            o && typeof o === "object" &&
            [o.id, o.dE].every((n) => typeof n === "number" && Number.isFinite(n)) &&
            [o.target, o.mixed].every((h) => typeof h === "string" && HEX_RE.test(h)))
          .slice(0, MIX_LOG_MAX)
          .map((o) => ({
            id: o.id, target: o.target.toUpperCase(), mixed: o.mixed.toUpperCase(), dE: o.dE,
            ...(typeof o.at === "string" ? { at: o.at } : {}),
          }));
      }
    }
    for (const k of LESSON_KEYS) {
      for (const p of out.pins[k]) if (p.id >= PIN_SEQ) PIN_SEQ = p.id + 1;
    }
  } catch (e) { /* malformed field; whatever validated so far stands */ }
  return out;
}

/* Reads and validates localStorage behind one try/catch, so nothing
   can throw at module scope and a corrupt painters-wheel-v1 key can
   never white-screen the app. On a parse failure the key is removed
   so the next load starts clean. */
function loadSaved(store = PW_STORE) {
  if (!store) return sanitiseSaved(null);
  try {
    return sanitiseSaved(JSON.parse(store.getItem(PW_KEY) || "null"));
  } catch (e) {
    try { store.removeItem(PW_KEY); } catch (e2) { /* best effort */ }
    return sanitiseSaved(null);
  }
}

export { PW_STORE, PW_KEY, MIX_LOG_MAX, loadSaved, sanitiseSaved, nextPinId };
