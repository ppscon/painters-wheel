const PW_STORE = (() => {
  try {
    const k = "__pw_probe";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (e) { return null; }
})();
const PW_KEY = "painters-wheel-v1";
const PW_SAVED = (() => {
  if (!PW_STORE) return null;
  try { return JSON.parse(PW_STORE.getItem(PW_KEY) || "null"); } catch (e) { return null; }
})();
const PW_INIT_PINS = Object.assign(
  { contrast: [], value: [], hue: [], chroma: [], upload: [] },
  (PW_SAVED && PW_SAVED.pins) || {},
  { upload: [] }
);
const PW_INIT_BOX = new Set((PW_SAVED && PW_SAVED.box) || []);
const PW_INIT_BOXONLY = !!(PW_SAVED && PW_SAVED.boxOnly);
let PIN_SEQ = 1;
for (const k in PW_INIT_PINS) for (const p of PW_INIT_PINS[k]) if (p.id >= PIN_SEQ) PIN_SEQ = p.id + 1;
function nextPinId() { return PIN_SEQ++; }

export { PW_STORE, PW_KEY, PW_SAVED, PW_INIT_PINS, PW_INIT_BOX, PW_INIT_BOXONLY, nextPinId };
