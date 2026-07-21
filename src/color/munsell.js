/* ---------------- Munsell renotation lookup ----------------------
   labToMunsell interpolates the real renotation dataset (2,734 points):
   value from the ASTM D1535 polynomial (inverted numerically), hue and
   chroma from inverse-distance weighting of the six nearest neighbours
   in CIELAB, with hue averaged circularly.

   The dataset (~60KB of numeric literals) is deliberately NOT bundled:
   it is fetched from /munsell.json via loadMunsell() so it stays off
   the critical JS parse path. Until it arrives, labToMunsell returns
   an ellipsis for chromatic colours and MUNSELL_BY_HUE pages are
   empty; initMunsell() fills everything in place. Tests initialise
   synchronously from src/munsellData.js (test/tooling-only module). */
const FAMILIES = ["R", "YR", "Y", "GY", "G", "BG", "B", "PB", "P", "RP"];
const MUNSELL_HUE_NAMES = (() => {
  const steps = ["2.5", "5", "7.5", "10"];
  const out = [];
  for (const f of FAMILIES) for (const s of steps) out.push(s + f);
  return out;
})();
let MUNSELL_POINTS = [];
let MUNSELL_N = 0;
const MUNSELL_BY_HUE = Array.from({ length: 40 }, () => []);
const MUNSELL_CACHE = new Map();
let munsellLoaded = false;
let loadPromise = null;

function initMunsell(points) {
  MUNSELL_POINTS = points;
  MUNSELL_N = points.length / 6;
  for (const page of MUNSELL_BY_HUE) page.length = 0;
  for (let i = 0; i < MUNSELL_N; i++) {
    const o = i * 6;
    MUNSELL_BY_HUE[MUNSELL_POINTS[o]].push({
      v: MUNSELL_POINTS[o + 1] / 10,
      c: MUNSELL_POINTS[o + 2] / 10,
      L: MUNSELL_POINTS[o + 3] / 10,
      a: MUNSELL_POINTS[o + 4] / 10,
      b: MUNSELL_POINTS[o + 5] / 10,
    });
  }
  MUNSELL_CACHE.clear();
  munsellLoaded = true;
}

function isMunsellLoaded() { return munsellLoaded; }

function loadMunsell() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.resolve()
    .then(() => fetch("/munsell.json"))
    .then((r) => {
      if (!r.ok) throw new Error(`munsell.json HTTP ${r.status}`);
      return r.json();
    })
    .then(initMunsell)
    .catch((e) => {
      loadPromise = null; // allow a retry on the next call
      throw e;
    });
  return loadPromise;
}

/* Nearest renotation hue page for a notation like "7.5R 5.2/14".
   Computed on the full 100-step hue circle rather than clamped within
   the named family, so e.g. 0.5R correctly opens 10RP (its nearest
   page) instead of 2.5R. */
function munsellPageIndex(notation) {
  const m = String(notation).match(/^([\d.]+)([A-Z]+)/);
  if (!m) return null;
  const famIdx = FAMILIES.indexOf(m[2]);
  if (famIdx < 0) return null;
  return (Math.round((famIdx * 10 + Number(m[1])) / 2.5) - 1 + 40) % 40;
}
function labToY(L) {
  const fy = (L + 16) / 116;
  const d = 6 / 29;
  return 100 * (fy > d ? fy * fy * fy : 3 * d * d * (fy - 4 / 29));
}
function munsellValueFromY(Y) {
  let lo = 0, hi = 10;
  for (let i = 0; i < 48; i++) {
    const V = (lo + hi) / 2;
    const y = V * (1.1914 + V * (-0.22533 + V * (0.23352 + V * (-0.020484 + V * 0.00081939))));
    if (y < Y) lo = V; else hi = V;
  }
  return (lo + hi) / 2;
}
function labToMunsell([L, a, b]) {
  const Cab = Math.hypot(a, b);
  const V = Math.max(0, munsellValueFromY(labToY(L)));
  if (Cab < 4) return `N ${V.toFixed(1)}/`;
  if (!munsellLoaded) return "…";
  const cacheKey = `${L.toFixed(1)},${a.toFixed(1)},${b.toFixed(1)}`;
  const cached = MUNSELL_CACHE.get(cacheKey);
  if (cached) return cached;
  const best = [];
  for (let i = 0; i < MUNSELL_N; i++) {
    const o = i * 6;
    const dL = L - MUNSELL_POINTS[o + 3] / 10;
    const da = a - MUNSELL_POINTS[o + 4] / 10;
    const db = b - MUNSELL_POINTS[o + 5] / 10;
    const d2 = dL * dL + da * da + db * db;
    if (best.length < 6) {
      best.push({ d2, o });
      best.sort((x, y) => x.d2 - y.d2);
    } else if (d2 < best[5].d2) {
      best[5] = { d2, o };
      best.sort((x, y) => x.d2 - y.d2);
    }
  }
  let sw = 0, sx = 0, sy = 0, sc = 0;
  for (const { d2, o } of best) {
    const w = 1 / (d2 + 1e-6);
    const th = (MUNSELL_POINTS[o] * 9 * Math.PI) / 180;
    sx += w * Math.cos(th);
    sy += w * Math.sin(th);
    sc += w * (MUNSELL_POINTS[o + 2] / 10);
    sw += w;
  }
  const chroma = sc / sw;
  let ang = Math.atan2(sy, sx) * (180 / Math.PI);
  if (ang < 0) ang += 360;
  let units = ((ang / 3.6 + 2.5) % 100 + 100) % 100;
  let famIdx = Math.floor(units / 10) % 10;
  let within = Math.round((units - famIdx * 10) * 2) / 2;
  if (within < 0.25) { within = 10; famIdx = (famIdx + 9) % 10; }
  const out = `${within}${FAMILIES[famIdx]} ${V.toFixed(1)}/${chroma.toFixed(1)}`;
  if (MUNSELL_CACHE.size > 800) MUNSELL_CACHE.clear();
  MUNSELL_CACHE.set(cacheKey, out);
  return out;
}

export {
  FAMILIES, MUNSELL_HUE_NAMES, MUNSELL_N, labToY, munsellValueFromY,
  labToMunsell, MUNSELL_BY_HUE, munsellPageIndex,
  initMunsell, loadMunsell, isMunsellLoaded,
};
