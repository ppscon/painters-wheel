import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MUNSELL_POINTS } from "./munsellData.js";

/* ================================================================
   THE PAINTER'S WHEEL: Phase 2.0
   Lessons gateway (Contrast · Value · Hue · Chroma) with pin-based
   study, colour theory guidance, paint matching and mixing advice
   ================================================================ */

const T = {
  ground: "#1B1512",
  panel: "#252017",
  panel2: "#2C2519",
  line: "#3D3527",
  bone: "#EDE4D3",
  muted: "#9C8F78",
  faint: "#6E6350",
  ochre: "#C9962E",
  vermilion: "#C8452C",
};

/* ---------------- Colour math ----------------------------------- */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, c * 255));
}
function rgbToLab(r, g, b) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  let Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  let Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  X /= 0.95047; Z /= 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = Math.atan2(b1, a1p) * deg; if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * deg; if (h2p < 0) h2p += 360;
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbp += h1p + h2p < 360 ? 360 : -360;
    hbp /= 2;
  } else hbp = h1p + h2p;
  const Tt =
    1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * Tt;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(
    Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) +
    Rt * (dCp / Sc) * (dHp / Sh)
  );
}
/* ---------------- Munsell renotation lookup ----------------------
   labToMunsell interpolates the real renotation dataset (2,734 points,
   see munsellData): value from the ASTM D1535 polynomial (inverted
   numerically), hue and chroma from inverse-distance weighting of the
   six nearest neighbours in CIELAB, with hue averaged circularly.  */
const MUNSELL_HUE_NAMES = (() => {
  const steps = ["2.5", "5", "7.5", "10"];
  const out = [];
  for (const f of FAMILIES) for (const s of steps) out.push(s + f);
  return out;
})();
const MUNSELL_N = MUNSELL_POINTS.length / 6;
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
  return `${within}${FAMILIES[famIdx]} ${V.toFixed(1)}/${chroma.toFixed(1)}`;
}
function labToRgbHex(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const d = 6 / 29;
  const inv = (t) => (t > d ? t * t * t : 3 * d * d * (t - 4 / 29));
  const X = 0.95047 * inv(fx), Y = inv(fy), Z = 1.08883 * inv(fz);
  let r = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  let g = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  let bb = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
  const clipped = r < -0.005 || g < -0.005 || bb < -0.005 || r > 1.005 || g > 1.005 || bb > 1.005;
  const enc = (c) => {
    c = Math.min(1, Math.max(0, c));
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return c * 255;
  };
  return { hex: rgbToHex(enc(r), enc(g), enc(bb)), clipped };
}
const MUNSELL_BY_HUE = (() => {
  const by = Array.from({ length: 40 }, () => []);
  for (let i = 0; i < MUNSELL_N; i++) {
    const o = i * 6;
    by[MUNSELL_POINTS[o]].push({
      v: MUNSELL_POINTS[o + 1] / 10,
      c: MUNSELL_POINTS[o + 2] / 10,
      L: MUNSELL_POINTS[o + 3] / 10,
      a: MUNSELL_POINTS[o + 4] / 10,
      b: MUNSELL_POINTS[o + 5] / 10,
    });
  }
  return by;
})();

function MunsellExplorer({ onPick }) {
  const [hueIdx, setHueIdx] = useState(29);
  const pts = MUNSELL_BY_HUE[hueIdx].filter((p) => p.v >= 1);
  const values = [...new Set(pts.map((p) => p.v))].sort((x, y) => y - x);
  const maxC = pts.reduce((m, p) => Math.max(m, p.c), 2);
  const chromas = [];
  for (let c = 2; c <= maxC; c += 2) chromas.push(c);
  const byVC = {};
  for (const p of pts) byVC[`${p.v}_${p.c}`] = p;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button onClick={() => setHueIdx((hueIdx + 39) % 40)} style={{
          width: 30, height: 30, borderRadius: 4, background: "transparent", color: T.muted,
          border: `1px solid ${T.line}`, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
        }}>{"\u2039"}</button>
        <input type="range" min="0" max="39" step="1" value={hueIdx}
          onChange={(e) => setHueIdx(Number(e.target.value))}
          style={{ flex: 1, accentColor: T.ochre }} />
        <button onClick={() => setHueIdx((hueIdx + 1) % 40)} style={{
          width: 30, height: 30, borderRadius: 4, background: "transparent", color: T.muted,
          border: `1px solid ${T.line}`, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
        }}>{"\u203a"}</button>
        <span className="display" style={{ fontSize: 22, color: T.bone, width: 80, textAlign: "right", flexShrink: 0 }}>
          {MUNSELL_HUE_NAMES[hueIdx]}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `34px repeat(${chromas.length}, minmax(26px, 1fr))`,
          gap: 3, alignItems: "stretch", minWidth: chromas.length * 30 + 40,
        }}>
          <div />
          {chromas.map((c) => (
            <div key={"h" + c} className="mono" style={{ fontSize: 9, color: T.faint, textAlign: "center" }}>/{c}</div>
          ))}
          {values.map((v) => (
            <React.Fragment key={"row" + v}>
              <div className="mono" style={{ fontSize: 10, color: T.muted, alignSelf: "center", textAlign: "right", paddingRight: 4 }}>
                {v}/
              </div>
              {chromas.map((c) => {
                const p = byVC[`${v}_${c}`];
                if (!p) return <div key={c} />;
                const { hex, clipped } = labToRgbHex(p.L, p.a, p.b);
                return (
                  <button key={c} onClick={() => onPick(hex)}
                    title={`${MUNSELL_HUE_NAMES[hueIdx]} ${v}/${c}${clipped ? " (outside sRGB, clamped)" : ""}`}
                    style={{
                      height: 26, background: hex, cursor: "pointer", padding: 0, borderRadius: 2,
                      border: clipped ? `1px dashed ${T.faint}` : `1px solid ${T.line}`,
                    }} />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.6, marginTop: 10 }}>
        A constant-hue page of the real Munsell renotation data: value rises up the page, chroma
        grows to the right, and the ragged right edge is the real gamut of surface colours at this
        hue. Chips with dashed borders sit outside sRGB and are shown clamped. Click any chip to
        open it in the record panel; slide or step through all 40 hue pages above.
      </p>
    </div>
  );
}

function mixPaints(hexA, hexB, wA) {
  const A = hexToRgb(hexA).map(srgbToLinear);
  const B = hexToRgb(hexB).map(srgbToLinear);
  const rgb = A.map((c, i) => linearToSrgb(c * wA + B[i] * (1 - wA)));
  return rgbToHex(...rgb);
}
const RATIOS = [
  [0.8, "4:1"], [0.667, "2:1"], [0.5, "1:1"], [0.333, "1:2"], [0.2, "1:4"],
];

/* ---------------- Oil paint database ---------------------------- */
const PAINTS = [
  { n: "Titanium White", m: "Winsor & Newton", p: "PW6", x: "#F4F1E9", o: "O", s: "1" },
  { n: "Cadmium Yellow Pale", m: "Winsor & Newton", p: "PY35", x: "#F5C60A", o: "O", s: "4" },
  { n: "Cadmium Yellow", m: "Winsor & Newton", p: "PY35", x: "#EFB204", o: "O", s: "4" },
  { n: "Yellow Ochre", m: "Winsor & Newton", p: "PY43", x: "#C6912C", o: "O", s: "1" },
  { n: "Raw Sienna", m: "Winsor & Newton", p: "PBr7", x: "#A9752F", o: "T", s: "1" },
  { n: "Cadmium Orange", m: "Winsor & Newton", p: "PO20", x: "#E87211", o: "O", s: "4" },
  { n: "Cadmium Red", m: "Winsor & Newton", p: "PR108", x: "#C22D1E", o: "O", s: "4" },
  { n: "Cadmium Red Deep", m: "Winsor & Newton", p: "PR108", x: "#9E1F1C", o: "O", s: "4" },
  { n: "Alizarin Crimson", m: "Winsor & Newton", p: "PR83", x: "#7A1F2B", o: "T", s: "2" },
  { n: "Permanent Rose", m: "Winsor & Newton", p: "PV19", x: "#C4356F", o: "T", s: "3" },
  { n: "Burnt Sienna", m: "Winsor & Newton", p: "PBr7", x: "#7A3B22", o: "T", s: "1" },
  { n: "Burnt Umber", m: "Winsor & Newton", p: "PBr7", x: "#4A342A", o: "O", s: "1" },
  { n: "Raw Umber", m: "Winsor & Newton", p: "PBr7", x: "#4E4436", o: "O", s: "1" },
  { n: "Vandyke Brown", m: "Winsor & Newton", p: "NBr8", x: "#3E3128", o: "T", s: "1" },
  { n: "French Ultramarine", m: "Winsor & Newton", p: "PB29", x: "#23348C", o: "T", s: "2" },
  { n: "Cobalt Blue", m: "Winsor & Newton", p: "PB28", x: "#1F55A6", o: "T", s: "4" },
  { n: "Prussian Blue", m: "Winsor & Newton", p: "PB27", x: "#16283E", o: "T", s: "1" },
  { n: "Cerulean Blue", m: "Winsor & Newton", p: "PB35", x: "#2C7FB0", o: "O", s: "4" },
  { n: "Viridian", m: "Winsor & Newton", p: "PG18", x: "#1E5E4C", o: "T", s: "4" },
  { n: "Sap Green", m: "Winsor & Newton", p: "PG36/PY110", x: "#3F5A22", o: "T", s: "1" },
  { n: "Terre Verte", m: "Winsor & Newton", p: "PG23", x: "#5C6B52", o: "T", s: "1" },
  { n: "Ivory Black", m: "Winsor & Newton", p: "PBk9", x: "#23201C", o: "O", s: "1" },
  { n: "Lamp Black", m: "Winsor & Newton", p: "PBk6", x: "#1E1E20", o: "O", s: "1" },
  { n: "Payne's Gray", m: "Winsor & Newton", p: "PB29/PBk6", x: "#33404E", o: "SO", s: "1" },
  { n: "Cremnitz White (Lead)", m: "Michael Harding", p: "PW1", x: "#F3EFE2", o: "O", s: "4" },
  { n: "Titanium White No.1", m: "Michael Harding", p: "PW6", x: "#F5F2EA", o: "O", s: "1" },
  { n: "Naples Yellow Light", m: "Michael Harding", p: "PBr24", x: "#EFD98F", o: "O", s: "2" },
  { n: "Yellow Ochre", m: "Michael Harding", p: "PY43", x: "#C08A2E", o: "SO", s: "1" },
  { n: "Yellow Ochre Deep", m: "Michael Harding", p: "PY43", x: "#B27A24", o: "SO", s: "1" },
  { n: "Cadmium Red", m: "Michael Harding", p: "PR108", x: "#C6281C", o: "O", s: "5" },
  { n: "Scarlet Lake", m: "Michael Harding", p: "PR188", x: "#D5311F", o: "ST", s: "3" },
  { n: "Crimson Lake", m: "Michael Harding", p: "PR264", x: "#8A1E30", o: "T", s: "3" },
  { n: "Burnt Sienna", m: "Michael Harding", p: "PBr7", x: "#74381F", o: "ST", s: "1" },
  { n: "Burnt Umber", m: "Michael Harding", p: "PBr7", x: "#453226", o: "SO", s: "1" },
  { n: "Raw Umber", m: "Michael Harding", p: "PBr7", x: "#4C4234", o: "SO", s: "1" },
  { n: "Ultramarine Blue", m: "Michael Harding", p: "PB29", x: "#212F86", o: "T", s: "2" },
  { n: "Prussian Blue", m: "Michael Harding", p: "PB27", x: "#152234", o: "ST", s: "2" },
  { n: "Ivory Black", m: "Michael Harding", p: "PBk9", x: "#221F1B", o: "SO", s: "1" },
  { n: "Cremnitz White", m: "Old Holland", p: "PW1", x: "#F2EEE1", o: "O", s: "D" },
  { n: "Naples Yellow Extra", m: "Old Holland", p: "PW4/PY35", x: "#E9CF83", o: "O", s: "B" },
  { n: "Yellow Ochre Light", m: "Old Holland", p: "PY43", x: "#C79232", o: "SO", s: "A" },
  { n: "Gold Ochre", m: "Old Holland", p: "PY42", x: "#BC7F1F", o: "SO", s: "A" },
  { n: "Cadmium Red Scarlet", m: "Old Holland", p: "PR108", x: "#CE2A15", o: "O", s: "D" },
  { n: "Madder Lake Deep", m: "Old Holland", p: "PR83", x: "#6E1D2A", o: "T", s: "C" },
  { n: "Caput Mortuum Violet", m: "Old Holland", p: "PR101", x: "#5A3236", o: "O", s: "A" },
  { n: "Burnt Sienna", m: "Old Holland", p: "PBr7", x: "#77391E", o: "ST", s: "A" },
  { n: "Raw Umber", m: "Old Holland", p: "PBr7", x: "#4A4033", o: "SO", s: "A" },
  { n: "Burnt Umber", m: "Old Holland", p: "PBr7", x: "#443023", o: "SO", s: "A" },
  { n: "Ultramarine Blue", m: "Old Holland", p: "PB29", x: "#20308A", o: "T", s: "B" },
  { n: "Scheveningen Blue Deep", m: "Old Holland", p: "PB27", x: "#14212F", o: "ST", s: "A" },
  { n: "Ivory Black", m: "Old Holland", p: "PBk9", x: "#211E1A", o: "SO", s: "A" },
  { n: "Titanium White", m: "Gamblin", p: "PW6", x: "#F5F3EB", o: "O", s: "1" },
  { n: "Flake White Replacement", m: "Gamblin", p: "PW6/PW4", x: "#F1EDDF", o: "O", s: "2" },
  { n: "Naples Yellow Hue", m: "Gamblin", p: "PW6/PY53/PO62", x: "#EBD28E", o: "O", s: "2" },
  { n: "Yellow Ochre", m: "Gamblin", p: "PY43", x: "#C28E2D", o: "SO", s: "1" },
  { n: "Cadmium Red Medium", m: "Gamblin", p: "PR108", x: "#C1271B", o: "O", s: "4" },
  { n: "Alizarin Permanent", m: "Gamblin", p: "PR177/PV19/PR264", x: "#7C2130", o: "T", s: "2" },
  { n: "Venetian Red", m: "Gamblin", p: "PR101", x: "#99402A", o: "O", s: "1" },
  { n: "Transparent Earth Red", m: "Gamblin", p: "PR101", x: "#8C3A1E", o: "T", s: "2" },
  { n: "Burnt Sienna", m: "Gamblin", p: "PBr7", x: "#78391F", o: "ST", s: "1" },
  { n: "Burnt Umber", m: "Gamblin", p: "PBr7", x: "#46332A", o: "SO", s: "1" },
  { n: "Raw Umber", m: "Gamblin", p: "PBr7", x: "#4D4335", o: "SO", s: "1" },
  { n: "Ultramarine Blue", m: "Gamblin", p: "PB29", x: "#22318B", o: "T", s: "2" },
  { n: "Portland Gray Medium", m: "Gamblin", p: "PW6/PBk9", x: "#8A857C", o: "O", s: "1" },
  { n: "Ivory Black", m: "Gamblin", p: "PBk9", x: "#232019", o: "SO", s: "1" },
  { n: "Titanium White", m: "Rembrandt", p: "PW6", x: "#F5F2EA", o: "O", s: "1" },
  { n: "Naples Yellow Deep", m: "Rembrandt", p: "PBr24/PO20", x: "#DFAE4F", o: "O", s: "2" },
  { n: "Yellow Ochre", m: "Rembrandt", p: "PY42", x: "#C48E2C", o: "SO", s: "1" },
  { n: "Cadmium Red Medium", m: "Rembrandt", p: "PR108", x: "#C2261D", o: "O", s: "4" },
  { n: "Permanent Madder Deep", m: "Rembrandt", p: "PR264", x: "#7E1E2B", o: "T", s: "3" },
  { n: "Burnt Sienna", m: "Rembrandt", p: "PBr7", x: "#76381F", o: "ST", s: "1" },
  { n: "Burnt Umber", m: "Rembrandt", p: "PBr7", x: "#453228", o: "SO", s: "1" },
  { n: "Raw Umber", m: "Rembrandt", p: "PBr7", x: "#4B4234", o: "SO", s: "1" },
  { n: "Ultramarine Deep", m: "Rembrandt", p: "PB29", x: "#1F2D85", o: "T", s: "2" },
  { n: "Prussian Blue", m: "Rembrandt", p: "PB27", x: "#152232", o: "ST", s: "1" },
  { n: "Ivory Black", m: "Rembrandt", p: "PBk9", x: "#221F1B", o: "SO", s: "1" },
];
const PAINT_LABS = PAINTS.map((pt) => ({ ...pt, lab: rgbToLab(...hexToRgb(pt.x)) }));
const MIXERS = PAINT_LABS.filter((p) => /White|Black/.test(p.n));

function bestMixFor(targetLab, sortedAll) {
  const pool = [...sortedAll.slice(0, 10), ...MIXERS];
  const seen = new Set();
  const cands = pool.filter((p) => {
    const k = p.m + p.n;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  let best = null;
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) {
      for (const [w, label] of RATIOS) {
        const hx = mixPaints(cands[i].x, cands[j].x, w);
        const dE = deltaE2000(targetLab, rgbToLab(...hexToRgb(hx)));
        if (!best || dE < best.dE) best = { a: cands[i], b: cands[j], ratio: label, hex: hx, dE };
      }
    }
  }
  return best;
}

/* ---------------- RYB wheel data -------------------------------- */
const RYB = [
  { name: "Yellow", hex: "#F5C400" },
  { name: "Yellow-Orange", hex: "#F09800" },
  { name: "Orange", hex: "#E86A10" },
  { name: "Red-Orange", hex: "#D9451F" },
  { name: "Red", hex: "#C4211A" },
  { name: "Red-Violet", hex: "#8E2F5C" },
  { name: "Violet", hex: "#5B3A80" },
  { name: "Blue-Violet", hex: "#3B3E8F" },
  { name: "Blue", hex: "#1F4E96" },
  { name: "Blue-Green", hex: "#17696B" },
  { name: "Green", hex: "#2E7D3A" },
  { name: "Yellow-Green", hex: "#8FA81E" },
];
const RYB_LABS = RYB.map((h) => rgbToLab(...hexToRgb(h.hex)));
const HARMONIES = {
  complement: { label: "Complement", offsets: [6], color: T.vermilion },
  split: { label: "Split-complement", offsets: [5, 7], color: T.ochre },
  analogous: { label: "Analogous", offsets: [1, 11], color: "#4DB6AC" },
  triad: { label: "Triad", offsets: [4, 8], color: "#7986CB" },
};

/* ---------------- Colour theory guidance ------------------------- */
function theoryGuidance(lab) {
  const [L, a, b] = lab;
  const C = Math.hypot(a, b);
  let hab = Math.atan2(b, a) * (180 / Math.PI);
  if (hab < 0) hab += 360;
  const V = L / 10;
  const temp =
    C < 6 ? "Neutral" :
    hab < 110 || hab > 330 ? "Warm" :
    hab > 150 && hab < 300 ? "Cool" : "Transitional";
  const valueZone =
    V >= 7 ? "High key (the lights)" :
    V >= 3.5 ? "Mid tones" : "Shadow mass";
  const chromaNote =
    C < 8 ? "Near-neutral. Mix it from complements, or umber with white, rather than black alone; pure black deadens neutrals." :
    C < 25 ? "Muted. Earth-colour territory; a single tube plus small adjustments usually suffices." :
    "High chroma. Reserve full-strength notes like this for focal, lit passages; large fields of it flatten a picture.";
  let ci = 0, cd = Infinity;
  for (let i = 0; i < RYB_LABS.length; i++) {
    const d = deltaE2000(lab, RYB_LABS[i]);
    if (d < cd) { cd = d; ci = i; }
  }
  const comp = RYB[(ci + 6) % 12];
  const tenebrism =
    V < 3.5
      ? "In a chiaroscuro scheme, keep this passage soft-edged and low in chroma so the lights carry the drama; Caravaggio holds most of the canvas down here."
      : V >= 7
      ? "This sits in the narrow band of lights; in a tenebrist scheme these small passages do all the compositional work, so guard their edges and purity."
      : null;
  return { temp, valueZone, chromaNote, hueFamily: RYB[ci].name, complement: comp, tenebrism, chroma: C, value: V };
}

/* ---------------- Lesson paintings ------------------------------- */
const IMG_URL = "/lessons/contrast.jpg";
const IMG_VALUE = "/lessons/value.jpg";
const IMG_HUE = "/lessons/hue.jpg";
const IMG_CHROMA = "/lessons/chroma.jpg";

const LESSONS = [
  {
    id: "contrast",
    num: "01",
    concept: "Contrast",
    title: "The Taking of Christ",
    artist: "Caravaggio, c. 1602 · National Gallery of Ireland",
    source: { url: IMG_URL },
    credit: "Public domain, via Wikimedia Commons.",
    howTo: true,
    intro:
      "Caravaggio built pictures from darkness. Before hue or chroma can mean anything, a painting must hold together in light and dark, and nothing demonstrates that more brutally than tenebrism. This first lesson is also your tour of the app: everything you learn to do here works on every painting, including your own.",
    exercises: [
      "Hover over the painting. The loupe magnifies the brushwork and reads the colour beneath the crosshair.",
      "Click to drop Pin 1 on the lantern-lit face at the far right, then Pin 2 on the darkness above the heads. The record panel identifies each; roughly Munsell value 9 against value 0.5, the full range of the picture in two pins.",
      "Press Value view. Colour vanishes and the picture still works: a few small lights against one vast shadow mass. That is contrast carrying the story.",
      "Recall any pin from the Pinned colours panel for its paints, theory and mixing advice, and use Save to palette to collect colours across lessons.",
    ],
  },
  {
    id: "value",
    num: "02",
    concept: "Value",
    title: "Study in Value",
    artist: "From the artist's collection",
    source: { url: IMG_VALUE },
    credit: "Lesson image supplied by the site author.",
    intro:
      "Value is the structure underneath everything else: if the values are right, a painting reads across the room before a single hue is named. Unlike the Caravaggio's compressed shadows, this study uses the full scale from near-black accents to near-white lights, so you can measure how a complete value range behaves.",
    exercises: [
      "Pin the darkest dark and the lightest light you can find, and check their Munsell values in the record. You should span close to ten steps.",
      "Switch to Value view and find the three or four big value masses. Every strong painting can be summarised in that few.",
      "Pin two spots that look like different colours but belong to the same mass. If their values sit within one step, they will fuse at viewing distance regardless of hue.",
      "Pin a handful of mid tones. Most of a well-built picture lives between values 3 and 6; the extremes are spent sparingly, like accents.",
    ],
  },
  {
    id: "hue",
    num: "03",
    concept: "Hue",
    title: "The Azulejo House",
    artist: "From the artist's collection",
    source: { url: IMG_HUE },
    credit: "Lesson image supplied by the site author.",
    intro:
      "This façade runs almost entirely on one hue axis: the blue of the sky, door and tilework against the orange of terracotta and gilded ornament. Complements do more than contrast; each makes the other read warmer or cooler than it measures. Unity comes from limiting hue families, not multiplying them.",
    exercises: [
      "Pin the sky, then the terracotta roof tiles, and compare hue families in the record: blue against red-orange, near-perfect complements.",
      "Pin the blue door and a golden azulejo panel: the same axis restated at higher chroma. The painting repeats one chord rather than adding new notes.",
      "Pin the white wall in sunlight and again in shadow. The wall is never white: the lit side leans warm, the shadow leans toward the sky's blue. That is hue shifting inside a single local colour.",
      "Press Value view: the picture survives structurally but loses its charm. Its drama is hue, the opposite balance to the Caravaggio.",
    ],
  },
  {
    id: "chroma",
    num: "04",
    concept: "Chroma",
    title: "The Pirate",
    artist: "From the artist's collection",
    source: { url: IMG_CHROMA },
    credit: "Lesson image supplied by the site author.",
    intro:
      "Chroma is intensity, and it is spent like money. Almost everything here is greyed: timber, rope, sky and flesh all sit low on the chroma scale, so a single saturated note, the yellow skirt, can carry the whole picture. Beginners reach for more chroma everywhere; masters hoard it.",
    exercises: [
      "Pin the yellow skirt where the light strikes it: the highest-chroma passage in the painting.",
      "Pin the ship's timber and the sky. Their chroma sits near the bottom of the scale; these quiet fields are what make the skirt loud.",
      "Pin the skirt again inside a shadow fold and compare the two records: chroma falls as value falls. Shadow colour is not merely darker, it is duller.",
      "Pin the white blouse and compare it with your sky pin: close in value, separated by temperature and edge. Figure and ground can share value when chroma does the separating.",
    ],
  },
];

/* ---------------- Automatic palette extraction ------------------ */
function extractPalette(srcCanvas, k = 8) {
  const w = 96;
  const h = Math.max(1, Math.round((srcCanvas.height / srcCanvas.width) * w));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(srcCanvas, 0, 0, w, h);
  const d = c.getContext("2d").getImageData(0, 0, w, h).data;
  const pts = [];
  for (let i = 0; i < d.length; i += 4) {
    pts.push({ lab: rgbToLab(d[i], d[i + 1], d[i + 2]), rgb: [d[i], d[i + 1], d[i + 2]] });
  }
  const byL = [...pts].sort((a, b) => a.lab[0] - b.lab[0]);
  let cents = Array.from({ length: k }, (_, i) => byL[Math.floor(((i + 0.5) / k) * byL.length)].lab.slice());
  let assign = new Array(pts.length).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    for (let p = 0; p < pts.length; p++) {
      let bi = 0, bd = Infinity;
      for (let ci = 0; ci < k; ci++) {
        const [L, A, B] = cents[ci], [l, a2, b2] = pts[p].lab;
        const dd = (L - l) ** 2 + (A - a2) ** 2 + (B - b2) ** 2;
        if (dd < bd) { bd = dd; bi = ci; }
      }
      assign[p] = bi;
    }
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let p = 0; p < pts.length; p++) {
      const s = sums[assign[p]];
      s[0] += pts[p].lab[0]; s[1] += pts[p].lab[1]; s[2] += pts[p].lab[2]; s[3]++;
    }
    cents = sums.map((s, ci) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cents[ci]));
  }
  const acc = Array.from({ length: k }, () => [0, 0, 0, 0]);
  for (let p = 0; p < pts.length; p++) {
    const a = acc[assign[p]];
    a[0] += pts[p].rgb[0]; a[1] += pts[p].rgb[1]; a[2] += pts[p].rgb[2]; a[3]++;
  }
  return acc
    .map((a) => (a[3] ? { hex: rgbToHex(a[0] / a[3], a[1] / a[3], a[2] / a[3]), pct: (a[3] / pts.length) * 100 } : null))
    .filter((x) => x && x.pct >= 1)
    .sort((a, b) => b.pct - a.pct);
}

/* ---------------- Colour record --------------------------------- */
function useColorRecord(hex) {
  return useMemo(() => {
    if (!hex) return null;
    const rgb = hexToRgb(hex);
    const lab = rgbToLab(...rgb);
    const munsell = labToMunsell(lab);
    const all = PAINT_LABS.map((pt) => ({ ...pt, dE: deltaE2000(lab, pt.lab) })).sort((a, b) => a.dE - b.dE);
    const matches = all.slice(0, 3);
    const mix = matches[0].dE > 2.5 ? bestMixFor(lab, all) : null;
    const theory = theoryGuidance(lab);
    return { hex, rgb, lab, munsell, matches, mix, theory };
  }, [hex]);
}
function dELabel(dE) {
  if (dE < 3) return { t: "excellent match", c: "#4DB6AC" };
  if (dE < 6) return { t: "close, adjust slightly", c: T.ochre };
  if (dE < 12) return { t: "base for a mixture", c: "#C9962E" };
  return { t: "mixing required", c: T.vermilion };
}
function SectionRule({ children }) {
  return (
    <div style={{
      marginTop: 18, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase",
      color: T.muted, borderBottom: `1px solid ${T.line}`, paddingBottom: 6,
    }}>
      {children}
    </div>
  );
}

function ColorRecord({ hex, sourceLabel, onSave }) {
  const rec = useColorRecord(hex);
  if (!rec)
    return (
      <div style={{ color: T.faint, fontStyle: "italic", padding: "24px 0", lineHeight: 1.6 }}>
        Drop a pin on a lesson painting or your own image, or click a hue on the wheel. Each pin
        keeps its colour identification, theory guidance and mixing advice.
      </div>
    );
  const [L, a, b] = rec.lab;
  const th = rec.theory;
  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        <div style={{
          width: 84, minHeight: 84, borderRadius: 6, background: rec.hex,
          border: `1px solid ${T.line}`, boxShadow: "inset 0 0 18px rgba(0,0,0,.25)",
        }} />
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 22, color: T.bone, letterSpacing: 1 }}>{rec.hex}</div>
          <div className="mono" style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            RGB {rec.rgb.join(" · ")}
          </div>
          <div className="mono" style={{ fontSize: 12, color: T.muted }}>
            L*a*b* {L.toFixed(0)} {a.toFixed(0)} {b.toFixed(0)}
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="mono" style={{
              fontSize: 13, color: T.ground, background: T.ochre, padding: "2px 8px", borderRadius: 3,
            }}>
              Munsell ≈ {rec.munsell}
            </span>
          </div>
        </div>
      </div>
      {sourceLabel && (
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8, fontStyle: "italic" }}>{sourceLabel}</div>
      )}

      <SectionRule>Colour theory</SectionRule>
      <div style={{ padding: "10px 0 2px", fontSize: 13, color: T.bone, lineHeight: 1.65 }}>
        <div>
          <span style={{ color: T.muted }}>Temperature · </span>{th.temp}
          <span style={{ color: T.muted }}> &nbsp;Value · </span>{th.valueZone}
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: T.muted }}>Hue family · </span>{th.hueFamily}
          <span style={{ color: T.muted }}>, complement </span>
          <span style={{
            display: "inline-block", width: 12, height: 12, borderRadius: 2,
            background: th.complement.hex, border: `1px solid ${T.line}`,
            verticalAlign: "-1px", marginRight: 4,
          }} />
          {th.complement.name}
          <span style={{ color: T.muted }}> (mix toward it to neutralise or shadow this hue)</span>
        </div>
        <div style={{ marginTop: 6, color: T.muted, fontSize: 12 }}>{th.chromaNote}</div>
        {th.tenebrism && (
          <div style={{
            marginTop: 8, fontSize: 12, color: T.bone, background: T.panel,
            border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.ochre}`,
            padding: "8px 10px", borderRadius: 3, lineHeight: 1.55,
          }}>
            {th.tenebrism}
          </div>
        )}
      </div>

      <SectionRule>Nearest oil paints</SectionRule>
      {rec.matches.map((m, i) => {
        const q = dELabel(m.dE);
        return (
          <div key={i} style={{
            display: "flex", gap: 12, alignItems: "center",
            padding: "10px 0", borderBottom: `1px solid ${T.line}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 4, background: m.x,
              border: `1px solid ${T.line}`, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.bone, fontSize: 14, fontWeight: 600 }}>{m.n}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>
                {m.m} · <span className="mono">{m.p}</span> · {m.o} · Series {m.s}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="mono" style={{ color: T.bone, fontSize: 13 }}>ΔE {m.dE.toFixed(1)}</div>
              <div style={{ color: q.c, fontSize: 10, letterSpacing: 0.5 }}>{q.t}</div>
            </div>
          </div>
        );
      })}

      {rec.mix && (
        <div>
          <SectionRule>Mixing recommendation</SectionRule>
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 4, background: rec.mix.a.x, border: `1px solid ${T.line}` }} />
            <span style={{ color: T.muted, fontSize: 15 }}>+</span>
            <div style={{ width: 30, height: 30, borderRadius: 4, background: rec.mix.b.x, border: `1px solid ${T.line}` }} />
            <span style={{ color: T.muted, fontSize: 15 }}>→</span>
            <div style={{
              width: 44, height: 44, borderRadius: 4, background: rec.mix.hex,
              border: `2px solid ${T.ochre}`,
            }} />
            <div style={{ marginLeft: 4 }}>
              <div className="mono" style={{ color: T.bone, fontSize: 14 }}>{rec.mix.ratio}</div>
              <div className="mono" style={{ color: T.muted, fontSize: 11 }}>ΔE {rec.mix.dE.toFixed(1)}</div>
            </div>
          </div>
          <div style={{ color: T.bone, fontSize: 13, lineHeight: 1.5 }}>
            {rec.mix.a.n} <span style={{ color: T.faint }}>({rec.mix.a.m})</span> with{" "}
            {rec.mix.b.n} <span style={{ color: T.faint }}>({rec.mix.b.m})</span>, roughly {rec.mix.ratio} by volume.
          </div>
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 6, fontStyle: "italic" }}>
            Ratio computed in linear RGB; real pigment mixing is subtractive and usually lands
            darker and duller, so start here and adjust on the palette.
          </div>
        </div>
      )}

      <button onClick={() => onSave(rec.hex)} style={{
        marginTop: 14, width: "100%", padding: "9px 0", background: "transparent",
        border: `1px solid ${T.ochre}`, color: T.ochre, borderRadius: 4,
        cursor: "pointer", fontSize: 12, letterSpacing: 2, textTransform: "uppercase",
        fontFamily: "inherit",
      }}>
        Save to palette
      </button>
    </div>
  );
}

/* ---------------- Colour wheel view ------------------------------ */
function WheelView({ selected, setSelected }) {
  const size = 480, cx = size / 2, cy = size / 2;
  const rOut = 210, rIn = 118;
  const [harmony, setHarmony] = useState("complement");
  const [mode, setMode] = useState("ryb");
  const [selIdx, setSelIdx] = useState(null);
  const [nudge, setNudge] = useState(0);
  const [neutral, setNeutral] = useState(0);
  const [valAdj, setValAdj] = useState(0);
  const [darkWith, setDarkWith] = useState("complement");

  const pick = (i) => {
    setSelIdx(i);
    setNudge(0); setNeutral(0); setValAdj(0);
  };
  const reset = () => { setNudge(0); setNeutral(0); setValAdj(0); };

  const base = selIdx == null ? null : RYB[selIdx];
  const compIdx = selIdx == null ? null : (selIdx + 6) % 12;
  const leftIdx = selIdx == null ? null : (selIdx + 11) % 12;
  const rightIdx = selIdx == null ? null : (selIdx + 1) % 12;

  const working = useMemo(() => {
    if (selIdx == null) return null;
    const comp = RYB[compIdx].hex;
    const neighbour = RYB[nudge >= 0 ? rightIdx : leftIdx].hex;
    const wn = Math.abs(nudge) / 200;
    let parts = [[base.hex, 1 - wn], [neighbour, wn]];
    const wc = neutral / 200;
    if (wc > 0) parts = parts.map(([h, w]) => [h, w * (1 - wc)]).concat([[comp, wc]]);
    const wv = Math.abs(valAdj) / 130;
    if (valAdj > 0) parts = parts.concat([[ZHEX.white, wv]]);
    if (valAdj < 0) {
      if (darkWith === "black") parts = parts.concat([[ZHEX.black, wv]]);
      else parts = parts.concat([[comp, wv * 0.8], [ZHEX.black, wv * 0.3]]);
    }
    return mixMulti(parts);
  }, [selIdx, compIdx, leftIdx, rightIdx, nudge, neutral, valAdj, darkWith, base]);

  useEffect(() => { if (working) setSelected(working); }, [working, setSelected]);

  const lab = working ? rgbToLab(...hexToRgb(working)) : null;
  const chroma = lab ? Math.hypot(lab[1], lab[2]) : 0;
  const value = lab ? lab[0] / 10 : 0;
  const near = working ? nearestPaint(working) : null;
  const chromaWord = chroma < 8 ? "neutralised" : chroma < 25 ? "muted" : "full voice";

  const segPath = (i) => {
    const a0 = ((i * 30 - 105) * Math.PI) / 180;
    const a1 = ((i * 30 - 75) * Math.PI) / 180;
    const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(rOut, a0), [x1, y1] = p(rOut, a1);
    const [x2, y2] = p(rIn, a1), [x3, y3] = p(rIn, a0);
    return `M${x0},${y0} A${rOut},${rOut} 0 0 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 0 0 ${x3},${y3} Z`;
  };
  const mid = (i, r) => {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const related = selIdx == null ? [] : HARMONIES[harmony].offsets.map((o) => (selIdx + o) % 12);
  const ladder = selIdx == null ? [] :
    Array.from({ length: 9 }, (_, i) => mixMulti([[base.hex, 1 - i / 16], [RYB[compIdx].hex, i / 16]]));

  const sliderRow = (label, min, max, val, onChange, leftCap, rightCap) => (
    <div style={{ margin: "12px 0 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: T.ochre, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: T.faint, width: 74, textAlign: "right", flexShrink: 0 }}>{leftCap}</span>
        <input type="range" min={min} max={max} step="1" value={val}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: T.ochre }} />
        <span style={{ fontSize: 10, color: T.faint, width: 74, flexShrink: 0 }}>{rightCap}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["ryb", "RYB wheel"], ["munsell", "Munsell pages"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            padding: "6px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            background: mode === k ? T.ochre : "transparent",
            color: mode === k ? T.ground : T.muted,
            border: `1px solid ${mode === k ? T.ochre : T.line}`,
            borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
          }}>
            {lbl}
          </button>
        ))}
      </div>
      {mode === "munsell" ? (
        <MunsellExplorer onPick={(h) => setSelected(h)} />
      ) : (
      <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(HARMONIES).map(([k, h]) => (
          <button key={k} onClick={() => setHarmony(k)} style={{
            padding: "5px 12px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            background: harmony === k ? h.color : "transparent",
            color: harmony === k ? T.ground : T.muted,
            border: `1px solid ${harmony === k ? h.color : T.line}`,
            borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
          }}>
            {h.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}>
        {selIdx != null &&
          related.map((ri) => {
            const [x1, y1] = mid(selIdx, (rOut + rIn) / 2);
            const [x2, y2] = mid(ri, (rOut + rIn) / 2);
            return (
              <line key={ri} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={HARMONIES[harmony].color} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.85" />
            );
          })}
        {RYB.map((h, i) => {
          const isSel = i === selIdx, isRel = related.includes(i);
          return (
            <path key={i} d={segPath(i)} fill={h.hex} stroke={T.ground}
              strokeWidth={isSel ? 0 : 2}
              opacity={selIdx == null || isSel || isRel ? 1 : 0.35}
              style={{ cursor: "pointer", transition: "opacity .25s" }}
              onClick={() => pick(i)}>
              <title>{h.name}</title>
            </path>
          );
        })}
        {selIdx != null && (
          <path d={segPath(selIdx)} fill="none" stroke={T.bone} strokeWidth="3" pointerEvents="none" />
        )}
        {related.map((ri) => (
          <path key={"r" + ri} d={segPath(ri)} fill="none"
            stroke={HARMONIES[harmony].color} strokeWidth="2.5" pointerEvents="none" />
        ))}
        {working && (
          <circle cx={cx} cy={cy} r={rIn - 16} fill={working} stroke={T.line} strokeWidth="1.5" />
        )}
        <text x={cx} y={cy - 6} textAnchor="middle"
          fill={working ? (value > 5.5 ? "#1B1512" : "#EDE4D3") : T.muted}
          style={{ fontSize: 13, letterSpacing: 3, textTransform: "uppercase" }}>
          {selIdx != null ? RYB[selIdx].name : "RYB Wheel"}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle"
          fill={working ? (value > 5.5 ? "#3D3527" : "#9C8F78") : T.faint}
          style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          {working ? working : "12 hues \u00b7 click to explore"}
        </text>
      </svg>

      {selIdx == null ? (
        <p style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
          The traditional red, yellow and blue wheel used for palette planning. Click a hue to open
          the mixing lab: nudge its temperature along the wheel, cancel its chroma with the
          complement opposite, and take it up or down in value. The centre of the wheel shows the
          working mix live.
        </p>
      ) : (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre }}>
              Mixing lab
            </div>
            <button onClick={reset} style={{
              fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
              background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 3,
              padding: "3px 10px", cursor: "pointer", fontFamily: "inherit",
            }}>
              Reset
            </button>
          </div>

          {sliderRow("Hue \u00b7 lean along the wheel", -100, 100, nudge, setNudge,
            RYB[leftIdx].name, RYB[rightIdx].name)}
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5 }}>
            Temperature nudges come from the neighbouring spokes, not from new tubes. Local colour
            rarely sits exactly on a spoke; lean it warm or cool.
          </div>

          {sliderRow("Chroma \u00b7 cancel with the complement", 0, 100, neutral, setNeutral,
            "full chroma", `toward ${RYB[compIdx].name}`)}
          <div style={{ display: "flex", gap: 4, margin: "6px 0 4px" }}>
            {ladder.map((h, i) => (
              <button key={i} onClick={() => setNeutral(Math.round((i * 100) / 8))} title={h} style={{
                flex: 1, height: 26, background: h, cursor: "pointer", padding: 0,
                border: `1px solid ${Math.round((i * 100) / 8) === neutral ? T.bone : T.line}`,
                borderRadius: 2,
              }} />
            ))}
          </div>
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5 }}>
            Opposites cancel: mixing toward {RYB[compIdx].name} pulls {RYB[selIdx].name} to a
            neutral grey while barely moving its value. This is how a colour is quietened without
            mud, and why the complement is the first tool for greying a note that shouts.
          </div>

          {sliderRow("Value \u00b7 shade and tint", -100, 100, valAdj, setValAdj,
            "toward dark", "toward white")}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase" }}>Darken</span>
            {["complement", "black"].map((m) => (
              <button key={m} onClick={() => setDarkWith(m)} style={{
                padding: "3px 10px", fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
                background: darkWith === m ? T.bone : "transparent",
                color: darkWith === m ? T.ground : T.muted,
                border: `1px solid ${darkWith === m ? T.bone : T.line}`,
                borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
              }}>
                with {m}
              </button>
            ))}
          </div>
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>
            Tints are white; shadows are a choice. Black drags chroma down with the value and can
            deaden a passage; darkening with the complement keeps the dark alive. Flick between
            the two at the same slider position and watch the chroma reading.
          </div>

          <div style={{
            display: "flex", gap: 14, alignItems: "center", marginTop: 14,
            background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 12,
          }}>
            <div style={{
              width: 62, height: 62, borderRadius: 6, background: working,
              border: `1px solid ${T.line}`, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 15, color: T.bone }}>{working}</div>
              <div className="mono" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                Munsell ≈ {labToMunsell(lab)} · Value {value.toFixed(1)} · Chroma {chroma.toFixed(0)} ({chromaWord})
              </div>
              {near && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: near.x, border: `1px solid ${T.line}` }} />
                  <span style={{ fontSize: 11, color: T.muted }}>
                    nearest tube {near.n} ({near.m}) · <span className="mono">ΔE {near.dE.toFixed(1)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>
            The full record for the working mix, with paint matches and a mixing recommendation,
            is in the panel alongside. Mixes are computed optically in linear RGB; real pigment is
            subtractive and lands darker and duller.
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* ---------------- Zorn palette study ------------------------------ */
const ZORN = [
  { key: "white", n: "Titanium White", x: "#F4F1E9", role: "Raises value and builds the opaque structure of the lights." },
  { key: "ochre", n: "Yellow Ochre", x: "#C6912C", role: "The muted earth yellow that anchors every flesh note." },
  { key: "red", n: "Cadmium Red", x: "#C22D1E", role: "The high-chroma warm red that puts the blood in skin." },
  { key: "black", n: "Ivory Black", x: "#23201C", role: "Cool and bluish; it stands in for blue on this palette." },
];
const ZHEX = Object.fromEntries(ZORN.map((z) => [z.key, z.x]));
function mixMulti(parts) {
  let tot = 0;
  const acc = [0, 0, 0];
  for (const [hx, w] of parts) {
    const lin = hexToRgb(hx).map(srgbToLinear);
    acc[0] += lin[0] * w; acc[1] += lin[1] * w; acc[2] += lin[2] * w;
    tot += w;
  }
  return rgbToHex(...acc.map((c) => linearToSrgb(c / tot)));
}
const zmix = (spec, extraWhite = 0) =>
  mixMulti([...spec.map(([k, w]) => [ZHEX[k], w]), ...(extraWhite > 0 ? [[ZHEX.white, extraWhite]] : [])]);
function nearestPaint(hex) {
  const lab = rgbToLab(...hexToRgb(hex));
  let best = null;
  for (const pt of PAINT_LABS) {
    const dE = deltaE2000(lab, pt.lab);
    if (!best || dE < best.dE) best = { ...pt, dE };
  }
  return best;
}
const ZORN_MIXES = [
  { name: "Raw Umber", recipe: "Black + Ochre + a speck of Red", spec: [["black", 5], ["ochre", 4], ["red", 0.6]], note: "A deep neutral greenish brown; tinted with white it settles into a clean warm grey." },
  { name: "Burnt Umber", recipe: "Black + Red + a touch of Ochre", spec: [["black", 5], ["red", 3.5], ["ochre", 1.5]], note: "A rich warm reddish brown for dark hair and deep structural lines." },
  { name: "Green Earth / Olive", recipe: "Ochre + Black", spec: [["ochre", 6], ["black", 4]], note: "Because black behaves as the palette's blue, ochre and black yield a subdued olive." },
  { name: "Indian Red", recipe: "Red + Black", spec: [["red", 5.5], ["black", 4.5]], note: "A cool plum maroon for structural accents and the core shadows of skin." },
];
const ZORN_ZONES = [
  { name: "Golden forehead", spec: [["white", 6], ["ochre", 2.2], ["red", 0.35]], note: "Bone and thin skin: lean on Ochre with White to keep the upper third golden and structured." },
  { name: "Warm mid-face", spec: [["white", 5], ["ochre", 1.6], ["red", 1.1]], note: "Cheeks, nose and ears carry the capillaries: extra Red puts the flush of life here." },
  { name: "Cool lower face", spec: [["white", 5.2], ["ochre", 1.4], ["red", 0.55], ["black", 0.5]], note: "Jaw, mouth and chin drift cool: a touch of Black shifts the halftone toward greenish grey." },
];
const ZORN_STEPS = [
  ["The monochromatic wash", "Thin the Raw Umber mix to a watery consistency and sketch the grand proportions and the boundaries of the shadow shapes. No white at this stage; the canvas itself is your highest value."],
  ["Transparent shadows", "Block every shadow as a flat, simplified shape: Burnt Umber for the warm structural darks, a thin Black and White where cool ambient light bounces in. Keep shadow paint lean and transparent so the darks recede."],
  ["Opaque mid-tones", "Introduce Titanium White and mix a generous pool of base flesh: White + Ochre + a speck of Red. Lay in the broad planes facing the light. Thick opaque lights against thin transparent shadows is the classical contrast."],
  ["The three temperature zones", "Divide the face by its vascular anatomy: golden forehead, flushed mid-face, cool lower face. The zone mixes below are computed live from the four tubes; click any swatch to read it."],
  ["Opaque highlights", "Mix pure White warmed by a pinpoint of Ochre and place it thickly at the apex of form: the nose bridge, the cheekbone fronts, the brow ridge. Leave the marks unblended."],
];
function ZornView({ setSampled }) {
  const [tint, setTint] = useState(0);
  const grey = mixMulti([[ZHEX.black, 1], [ZHEX.white, 2.2]]);
  const warmGround = mixMulti([[ZHEX.red, 3], [ZHEX.ochre, 2], [ZHEX.black, 0.6]]);
  return (
    <div>
      <div className="display" style={{ fontSize: 22, color: T.bone }}>The Zorn Palette</div>
      <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
        Four tubes, after Anders Zorn (1860 to 1920)
      </div>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, margin: "8px 0 4px" }}>
        A severely restricted classical palette: white, an earth yellow, a warm red and a cool
        black, with the black standing proxy for blue. Its lineage runs back to the four-colour
        palette Pliny attributed to the Greek masters. The restriction is the point: every mix on
        the canvas shares roots with the same four tubes, so tonal harmony is built in, and the
        painter is pushed onto value rather than superficial colour. Everything below is computed
        live from the four swatches; click any colour to open its full record.
      </p>

      <SectionRule>The four tubes</SectionRule>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 12 }}>
        {ZORN.map((z) => (
          <button key={z.key} onClick={() => setSampled(z.x)} style={{
            textAlign: "left", padding: 10, borderRadius: 5, cursor: "pointer",
            background: T.panel2, border: `1px solid ${T.line}`, fontFamily: "inherit",
          }}>
            <div style={{ height: 44, borderRadius: 4, background: z.x, border: `1px solid ${T.line}` }} />
            <div style={{ color: T.bone, fontSize: 13, fontWeight: 600, marginTop: 7 }}>{z.n}</div>
            <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.45, marginTop: 3 }}>{z.role}</div>
          </button>
        ))}
      </div>

      <SectionRule>Chromatic relativity: the illusion of blue</SectionRule>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, margin: "10px 0" }}>
        Both squares below are the identical Black and White grey. Temperature is judged by
        context: beside warm flesh notes the grey shifts and reads as a silvery blue, which is
        how blue eyes, denim and cool northern light get painted without a blue tube.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { bg: warmGround, cap: "Against a warm ground it reads silvery blue" },
          { bg: T.panel2, cap: "Against a neutral it reads plain grey" },
        ].map((d, i) => (
          <div key={i} style={{ flex: "1 1 180px", textAlign: "center" }}>
            <div style={{ background: d.bg, borderRadius: 6, border: `1px solid ${T.line}`, padding: 26, display: "flex", justifyContent: "center" }}>
              <button onClick={() => setSampled(grey)} title={grey} style={{
                width: 64, height: 64, background: grey, border: "none", borderRadius: 4, cursor: "pointer",
              }} />
            </div>
            <div style={{ fontSize: 11, color: T.faint, marginTop: 6, fontStyle: "italic" }}>{d.cap}</div>
          </div>
        ))}
      </div>

      <SectionRule>The mixing lab: earth tones from four tubes</SectionRule>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, margin: "10px 0 4px" }}>
        The classic earth tubes fall out of the palette by cross-mixing. Each swatch is computed
        in linear RGB and checked against the nearest real tube in the paint database. Slide in
        white to watch the umbers settle into the warm greys the palette is famous for.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 2px" }}>
        <span style={{ fontSize: 11, color: T.muted, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Tint with white</span>
        <input type="range" min="0" max="6" step="1" value={tint}
          onChange={(e) => setTint(Number(e.target.value))}
          style={{ flex: 1, accentColor: T.ochre }} />
        <span className="mono" style={{ fontSize: 11, color: T.faint, width: 62, textAlign: "right", flexShrink: 0 }}>
          {tint === 0 ? "masstone" : `+${tint} white`}
        </span>
      </div>
      {ZORN_MIXES.map((m) => {
        const hex = zmix(m.spec, tint);
        const near = nearestPaint(hex);
        return (
          <div key={m.name} style={{
            display: "flex", gap: 12, alignItems: "center", padding: "10px 0",
            borderBottom: `1px solid ${T.line}`, flexWrap: "wrap",
          }}>
            <button onClick={() => setSampled(hex)} title={hex} style={{
              width: 46, height: 46, borderRadius: 5, background: hex,
              border: `1px solid ${T.line}`, cursor: "pointer", flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ color: T.bone, fontSize: 14, fontWeight: 600 }}>{m.name}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>{m.recipe}</div>
              <div style={{ color: T.faint, fontSize: 11, marginTop: 2, lineHeight: 1.45 }}>{m.note}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase" }}>Nearest tube</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", marginTop: 3 }}>
                <div style={{ width: 18, height: 18, borderRadius: 3, background: near.x, border: `1px solid ${T.line}` }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: T.bone, fontSize: 11 }}>{near.n}</div>
                  <div className="mono" style={{ color: T.muted, fontSize: 10 }}>{near.m} · ΔE {near.dE.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>
        Computed mixes are optical approximations; real pigment is subtractive and lands darker
        and duller, so treat these as starting ratios for the palette.
      </p>

      <SectionRule>Portrait block-in, step by step</SectionRule>
      <ol style={{ margin: "12px 0 0", paddingLeft: 18, color: T.bone, fontSize: 13, lineHeight: 1.65 }}>
        {ZORN_STEPS.map(([t, d], i) => (
          <li key={i} style={{ marginBottom: 9 }}>
            <span style={{ color: T.ochre, fontWeight: 600 }}>{t}. </span>
            <span style={{ color: T.muted }}>{d}</span>
          </li>
        ))}
      </ol>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
        {ZORN_ZONES.map((z) => {
          const hex = zmix(z.spec);
          return (
            <button key={z.name} onClick={() => setSampled(hex)} title={hex} style={{
              textAlign: "left", padding: 10, borderRadius: 5, cursor: "pointer",
              background: T.panel2, border: `1px solid ${T.line}`, fontFamily: "inherit",
            }}>
              <div style={{ height: 38, borderRadius: 4, background: hex, border: `1px solid ${T.line}` }} />
              <div style={{ color: T.bone, fontSize: 12, fontWeight: 600, marginTop: 6 }}>{z.name}</div>
              <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.45, marginTop: 3 }}>{z.note}</div>
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 16, background: T.panel2, border: `1px solid ${T.line}`,
        borderLeft: `3px solid ${T.ochre}`, borderRadius: 4, padding: "12px 14px",
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 8 }}>
          Core lessons
        </div>
        <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.7 }}>
          Harmony is structural: every hue shares the same four roots, so the picture cannot fall
          out of key. Value carries form: if the values are right, the colour reads as right. And
          squint: the block-in is about clean shapes of light against clean shapes of shadow, not
          detail.
        </div>
      </div>
    </div>
  );
}

/* ---------------- Map-style pin ---------------------------------- */
function Pin({ pin, active, onSelect }) {
  const [L] = rgbToLab(...hexToRgb(pin.hex));
  const numColor = L > 55 ? "#1B1512" : "#EDE4D3";
  const ring = active ? T.ochre : T.bone;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSelect(pin.id); }}
      title={`Pin ${pin.num} · ${pin.hex}`}
      style={{
        position: "absolute", left: `${pin.fx * 100}%`, top: `${pin.fy * 100}%`,
        transform: "translate(-50%, -100%)", background: "transparent", border: "none",
        padding: 0, cursor: "pointer", zIndex: active ? 3 : 2, lineHeight: 0,
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: "50%", background: pin.hex,
        border: `2px solid ${ring}`, boxShadow: "0 2px 6px rgba(0,0,0,.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: numColor, lineHeight: 1 }}>{pin.num}</span>
      </div>
      <div style={{
        width: 0, height: 0, margin: "0 auto",
        borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
        borderTop: `7px solid ${ring}`,
      }} />
    </button>
  );
}

/* ---------------- Generic sampling canvas with pins --------------- */
function SamplerCanvas({ source, pins, activePinId, onAddPin, onSelectPin, extract, onPalette }) {
  const wrapRef = useRef(null);
  const dispRef = useRef(null);
  const srcRef = useRef(null);
  const loupeRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [gray, setGray] = useState(false);
  const [loupe, setLoupe] = useState(null);
  const lastPt = useRef(null);
  const suppressClick = useRef(false);

  const draw = useCallback((grayscale) => {
    const src = srcRef.current, disp = dispRef.current;
    if (!src || !disp) return;
    const ctx = disp.getContext("2d");
    ctx.filter = grayscale ? "grayscale(1)" : "none";
    ctx.drawImage(src, 0, 0);
    ctx.filter = "none";
  }, []);

  useEffect(() => {
    setStatus("loading");
    const img = new Image();
    if (source.crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => {
      const cap = 2400;
      const scale = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const src = document.createElement("canvas");
      src.width = w; src.height = h;
      src.getContext("2d").drawImage(img, 0, 0, w, h);
      srcRef.current = src;
      const disp = dispRef.current;
      disp.width = w; disp.height = h;
      draw(false);
      setGray(false);
      setStatus("ready");
      if (extract && onPalette) onPalette(extractPalette(src));
    };
    img.onerror = () => setStatus("error");
    img.src = source.url;
  }, [source, draw, extract, onPalette]);

  useEffect(() => { if (status === "ready") draw(gray); }, [gray, status, draw]);

  const toCanvasCoords = (e) => {
    const disp = dispRef.current;
    const rect = disp.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    return { x: Math.round(fx * disp.width), y: Math.round(fy * disp.height), fx, fy };
  };
  const sampleAvg = (x, y, half = 2) => {
    const src = srcRef.current;
    const ctx = src.getContext("2d");
    const x0 = Math.max(0, x - half), y0 = Math.max(0, y - half);
    const w = Math.min(src.width - x0, half * 2 + 1), h = Math.min(src.height - y0, half * 2 + 1);
    const d = ctx.getImageData(x0, y0, w, h).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return rgbToHex(r / n, g / n, b / n);
  };
  const onMove = (e) => {
    if (status !== "ready") return;
    const { x, y } = toCanvasCoords(e);
    const hex = sampleAvg(x, y);
    const wrapRect = wrapRef.current.getBoundingClientRect();
    setLoupe({ x: e.clientX - wrapRect.left, y: e.clientY - wrapRect.top, hex });
    const lc = loupeRef.current;
    if (lc) {
      const lctx = lc.getContext("2d");
      lctx.imageSmoothingEnabled = false;
      lctx.clearRect(0, 0, 120, 120);
      lctx.drawImage(srcRef.current, x - 7, y - 7, 15, 15, 0, 0, 120, 120);
      lctx.strokeStyle = "rgba(237,228,211,.9)";
      lctx.strokeRect(56, 56, 8, 8);
    }
  };
  const onClick = (e) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (status !== "ready") return;
    const { x, y, fx, fy } = toCanvasCoords(e);
    onAddPin({ fx, fy, hex: sampleAvg(x, y) });
  };

  const onTouch = (e) => {
    if (status !== "ready") return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    lastPt.current = { clientX: t.clientX, clientY: t.clientY };
    onMove(t);
  };
  const onTouchEnd = () => {
    if (status !== "ready" || !lastPt.current) return;
    const { x, y, fx, fy } = toCanvasCoords(lastPt.current);
    onAddPin({ fx, fy, hex: sampleAvg(x, y) });
    lastPt.current = null;
    setLoupe(null);
    suppressClick.current = true;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 11, color: T.faint, fontStyle: "italic" }}>
          Click to drop a pin · click a pin to recall it
        </span>
        <button onClick={() => setGray((g) => !g)} style={{
          padding: "6px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
          background: gray ? T.bone : "transparent", color: gray ? T.ground : T.muted,
          border: `1px solid ${gray ? T.bone : T.line}`, borderRadius: 3,
          cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
        }}>
          {gray ? "Colour view" : "Value view"}
        </button>
      </div>
      <div ref={wrapRef} style={{ position: "relative", lineHeight: 0, border: `1px solid ${T.line}`, borderRadius: 4, overflow: "hidden" }}>
        {status === "loading" && (
          <div style={{ padding: 60, textAlign: "center", color: T.faint, fontStyle: "italic" }}>
            Loading the image…
          </div>
        )}
        {status === "error" && (
          <div style={{ padding: 60, textAlign: "center", color: T.vermilion, lineHeight: 1.5 }}>
            The image could not be loaded.
          </div>
        )}
        <canvas ref={dispRef} onMouseMove={onMove} onMouseLeave={() => setLoupe(null)} onClick={onClick}
          onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={onTouchEnd}
          style={{ width: "100%", display: status === "ready" ? "block" : "none", cursor: "crosshair", touchAction: "none" }} />
        {status === "ready" && pins.map((p) => (
          <Pin key={p.id} pin={p} active={p.id === activePinId} onSelect={onSelectPin} />
        ))}
        {loupe && (
          <div style={{
            position: "absolute", left: loupe.x + 22, top: loupe.y - 60, pointerEvents: "none",
            width: 120, height: 120, borderRadius: "50%", overflow: "hidden", zIndex: 4,
            border: `4px solid ${loupe.hex}`, boxShadow: "0 4px 18px rgba(0,0,0,.7), 0 0 0 1px rgba(0,0,0,.8)",
          }}>
            <canvas ref={loupeRef} width={120} height={120} style={{ width: 120, height: 120 }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Lessons view ------------------------------------ */
function LessonsView({ lessonId, setLessonId, pins, activePinId, onAddPin, onSelectPin }) {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 16 }}>
        {LESSONS.map((l) => {
          const active = l.id === lessonId;
          return (
            <button key={l.id} onClick={() => setLessonId(l.id)} style={{
              textAlign: "left", padding: "10px 12px", borderRadius: 5, cursor: "pointer",
              background: active ? T.panel2 : "transparent",
              border: `1px solid ${active ? T.ochre : T.line}`, fontFamily: "inherit",
            }}>
              <div className="mono" style={{ fontSize: 10, color: active ? T.ochre : T.faint, letterSpacing: 1 }}>
                Lesson {l.num}
              </div>
              <div className="display" style={{ fontSize: 19, color: active ? T.bone : T.muted, marginTop: 2 }}>
                {l.concept}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: 4 }}>
        <div className="display" style={{ fontSize: 22, color: T.bone }}>{lesson.title}</div>
        <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>{lesson.artist}</div>
      </div>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, margin: "8px 0 14px" }}>{lesson.intro}</p>

      <div style={{
        background: T.panel2, border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.ochre}`,
        borderRadius: 4, padding: "12px 14px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 8 }}>
          {lesson.howTo ? "How to use the app" : "Exercises"}
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, color: T.bone, fontSize: 13, lineHeight: 1.65 }}>
          {lesson.exercises.map((ex, i) => (
            <li key={i} style={{ marginBottom: 7 }}>{ex}</li>
          ))}
        </ol>
      </div>

      <SamplerCanvas source={lesson.source} pins={pins} activePinId={activePinId}
        onAddPin={onAddPin} onSelectPin={onSelectPin} />
      <p style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
        {lesson.credit} Sampled colours reflect the reproduction, not raw pigment; treat matches as
        studio guidance.
      </p>
    </div>
  );
}

/* ---------------- Your canvas (upload + analysis) view ------------ */
function UploadView({ pins, activePinId, onAddPin, onSelectPin, onNewImage, setSampled }) {
  const [source, setSource] = useState(null);
  const [autoPalette, setAutoPalette] = useState([]);
  const [fileName, setFileName] = useState(null);
  const onPalette = useCallback((p) => setAutoPalette(p), []);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    setAutoPalette([]);
    onNewImage();
    const reader = new FileReader();
    reader.onload = () => setSource({ url: reader.result, crossOrigin: false });
    reader.readAsDataURL(f);
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div className="display" style={{ fontSize: 22, color: T.bone }}>Your Canvas</div>
          <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
            {fileName || "Apply the lessons to a master, a reference photo, or your own painting"}
          </div>
        </div>
        <label style={{
          padding: "8px 16px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
          background: T.ochre, color: T.ground, borderRadius: 3, cursor: "pointer",
        }}>
          {source ? "Replace image" : "Choose image"}
          <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        </label>
      </div>
      {!source ? (
        <div style={{
          border: `1px dashed ${T.line}`, borderRadius: 6, padding: "70px 24px",
          textAlign: "center", color: T.faint, fontStyle: "italic", lineHeight: 1.7,
        }}>
          The image stays in your browser; nothing is uploaded to a server.
          <br />
          Once loaded you can pin passages exactly as in the lessons, and the dominant colours in
          use are extracted automatically.
        </div>
      ) : (
        <div>
          <SamplerCanvas source={source} pins={pins} activePinId={activePinId}
            onAddPin={onAddPin} onSelectPin={onSelectPin} extract onPalette={onPalette} />
          {autoPalette.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase",
                color: T.ochre, marginBottom: 8,
              }}>
                Colours in use · dominant clusters
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {autoPalette.map((c, i) => (
                  <button key={i} onClick={() => setSampled(c.hex)} title={c.hex} style={{
                    background: "transparent", border: "none", padding: 0,
                    cursor: "pointer", textAlign: "center", fontFamily: "inherit",
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 5, background: c.hex,
                      border: `1px solid ${T.line}`,
                    }} />
                    <div className="mono" style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                      {c.pct.toFixed(0)}%
                    </div>
                  </button>
                ))}
              </div>
              <p style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
                Eight clusters computed by k-means in Lab space; percentages show coverage of the
                picture surface. Click a swatch for its record, or drop pins on specific passages.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- App -------------------------------------------- */
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
let PIN_SEQ = 1;
for (const k in PW_INIT_PINS) for (const p of PW_INIT_PINS[k]) if (p.id >= PIN_SEQ) PIN_SEQ = p.id + 1;
export default function App() {
  const [tab, setTab] = useState("lessons");
  const [lessonId, setLessonId] = useState("contrast");
  const [wheelHex, setWheelHex] = useState(null);
  const [clusterHex, setClusterHex] = useState(null);
  const [zornHex, setZornHex] = useState(null);
  const [pins, setPins] = useState(PW_INIT_PINS);
  const [activePin, setActivePin] = useState(null);
  const [palette, setPalette] = useState((PW_SAVED && PW_SAVED.palette) || []);
  const [viewHex, setViewHex] = useState(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(l);
    return () => l.remove();
  }, []);

  useEffect(() => {
    if (!PW_STORE) return;
    try {
      PW_STORE.setItem(PW_KEY, JSON.stringify({ pins: { ...pins, upload: [] }, palette }));
    } catch (e) { /* storage full or unavailable; persistence is best-effort */ }
  }, [pins, palette]);

  const ctxKey = tab === "lessons" ? lessonId : tab === "upload" ? "upload" : null;
  const ctxPins = ctxKey ? pins[ctxKey] : [];
  const activePinObj =
    activePin && activePin.ctx === ctxKey ? ctxPins.find((p) => p.id === activePin.id) : null;

  const addPin = (key) => ({ fx, fy, hex }) => {
    setPins((prev) => {
      const num = prev[key].length ? Math.max(...prev[key].map((p) => p.num)) + 1 : 1;
      const pin = { id: PIN_SEQ++, num, fx, fy, hex };
      setActivePin({ ctx: key, id: pin.id });
      return { ...prev, [key]: [...prev[key], pin] };
    });
    setViewHex(null);
    setClusterHex(null);
  };
  const selectPin = (key) => (id) => {
    setActivePin({ ctx: key, id });
    setViewHex(null);
    setClusterHex(null);
  };
  const deletePin = (key, id) => {
    setPins((prev) => ({ ...prev, [key]: prev[key].filter((p) => p.id !== id) }));
    setActivePin((ap) => (ap && ap.ctx === key && ap.id === id ? null : ap));
  };
  const clearUploadPins = useCallback(() => {
    setPins((prev) => ({ ...prev, upload: [] }));
    setActivePin((ap) => (ap && ap.ctx === "upload" ? null : ap));
  }, []);

  const lessonTitle = (LESSONS.find((l) => l.id === lessonId) || {}).title;
  const activeHex =
    viewHex ||
    (tab === "wheel" ? wheelHex : tab === "zorn" ? zornHex : activePinObj ? activePinObj.hex : tab === "upload" ? clusterHex : null);
  const sourceLabel =
    viewHex ? "From saved palette" :
    tab === "wheel" ? (wheelHex ? "From the RYB wheel" : null) :
    tab === "zorn" ? (zornHex ? "From the Zorn palette study" : null) :
    activePinObj ? `Pin ${activePinObj.num} · ${tab === "lessons" ? lessonTitle : "your image"}` :
    tab === "upload" && clusterHex ? "Dominant cluster from your image" : null;

  const save = (hex) =>
    setPalette((p) => (p.includes(hex) || p.length >= 14 ? p : [...p, hex]));

  const TABS = [
    ["lessons", "Lessons"],
    ["upload", "Your Canvas"],
    ["wheel", "Colour Wheel"],
    ["zorn", "Zorn Palette"],
  ];

  return (
    <div style={{
      minHeight: "100vh", background: T.ground, color: T.bone,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      backgroundImage: "radial-gradient(ellipse at 50% -10%, rgba(201,150,46,.07), transparent 55%)",
    }}>
      <style>{`
        .display { font-family: 'Cormorant Garamond', Georgia, serif; }
        .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        button:focus-visible, label:focus-visible { outline: 2px solid ${T.ochre}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        @media (max-width: 900px) { .pw-main { grid-template-columns: 1fr !important; } }
      `}</style>

      <header style={{ padding: "34px 24px 18px", borderBottom: `1px solid ${T.line}`, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: T.ochre }}>
          Colour theory for oil painters
        </div>
        <h1 className="display" style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 500, margin: "6px 0 4px", color: T.bone }}>
          The Painter's Wheel
        </h1>
        <div className="display" style={{ fontStyle: "italic", fontSize: 17, color: T.muted }}>
          Four paintings, four lessons: contrast, value, hue and chroma, and the paints that carry them
        </div>
      </header>

      <nav style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", borderBottom: `1px solid ${T.line}` }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setViewHex(null); }} style={{
            padding: "13px 22px", background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === k ? T.ochre : "transparent"}`,
            color: tab === k ? T.bone : T.muted, cursor: "pointer",
            fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "inherit",
          }}>
            {label}
          </button>
        ))}
      </nav>

      <main className="pw-main" style={{
        maxWidth: 1180, margin: "0 auto", padding: 24,
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 24,
      }}>
        <section style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 6, padding: 20 }}>
          {tab === "wheel" && (
            <WheelView selected={wheelHex} setSelected={(h) => { setWheelHex(h); setViewHex(null); }} />
          )}
          {tab === "lessons" && (
            <LessonsView lessonId={lessonId} setLessonId={setLessonId}
              pins={pins[lessonId]} activePinId={activePinObj ? activePinObj.id : null}
              onAddPin={addPin(lessonId)} onSelectPin={selectPin(lessonId)} />
          )}
          {tab === "upload" && (
            <UploadView pins={pins.upload} activePinId={activePinObj ? activePinObj.id : null}
              onAddPin={addPin("upload")} onSelectPin={selectPin("upload")}
              onNewImage={clearUploadPins}
              setSampled={(h) => { setClusterHex(h); setActivePin(null); setViewHex(null); }} />
          )}
          {tab === "zorn" && (
            <ZornView setSampled={(h) => { setZornHex(h); setViewHex(null); setActivePin(null); }} />
          )}
        </section>

        <aside>
          <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 12 }}>
              Colour record
            </div>
            <ColorRecord hex={activeHex} sourceLabel={sourceLabel} onSave={save} />
          </div>

          {ctxKey && ctxPins.length > 0 && (
            <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18, marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 10 }}>
                Pinned colours
              </div>
              {ctxPins.map((p) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                  borderBottom: `1px solid ${T.line}`,
                }}>
                  <button onClick={() => selectPin(ctxKey)(p.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, flex: 1,
                    background: "transparent", border: "none", padding: 0,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", background: p.hex,
                      border: `2px solid ${activePinObj && activePinObj.id === p.id ? T.ochre : T.line}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: rgbToLab(...hexToRgb(p.hex))[0] > 55 ? T.ground : T.bone,
                      }}>
                        {p.num}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: T.bone }}>{p.hex}</span>
                    <span className="mono" style={{ fontSize: 11, color: T.faint }}>
                      {labToMunsell(rgbToLab(...hexToRgb(p.hex)))}
                    </span>
                  </button>
                  <button onClick={() => deletePin(ctxKey, p.id)} title="Remove pin" style={{
                    background: "transparent", border: "none", color: T.faint,
                    cursor: "pointer", fontSize: 14, padding: "0 2px", fontFamily: "inherit",
                  }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18, marginTop: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 10 }}>
              Saved palette
            </div>
            {palette.length === 0 ? (
              <div style={{ color: T.faint, fontSize: 12, fontStyle: "italic" }}>
                Saved colours appear here as a working palette across all lessons.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {palette.map((h) => (
                  <button key={h} onClick={() => setViewHex(h)} title={h} style={{
                    width: 34, height: 34, borderRadius: 4, background: h, cursor: "pointer",
                    border: `2px solid ${viewHex === h ? T.bone : T.line}`, padding: 0,
                  }} />
                ))}
                <button onClick={() => { setPalette([]); setViewHex(null); }} style={{
                  fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
                  background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 4,
                  padding: "0 10px", cursor: "pointer", fontFamily: "inherit",
                }}>
                  Clear
                </button>
              </div>
            )}
          </div>

          <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.6, marginTop: 14 }}>
            Paint swatches are approximate masstone values compiled for guidance; verify against
            manufacturer colour charts before purchase. Munsell notation is interpolated from
            the real renotation dataset (2,734 measured colours, illuminant C adapted to D65).
          </p>
        </aside>
      </main>
    </div>
  );
}
