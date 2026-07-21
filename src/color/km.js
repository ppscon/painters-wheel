import { hexToRgb, rgbToHex, srgbToLinear, linearToSrgb } from "./math.js";
function mixPaints(hexA, hexB, wA) {
  return mixSubtractive([[hexA, wA], [hexB, 1 - wA]]);
}
const RATIOS = [
  [0.8, "4:1"], [0.667, "2:1"], [0.5, "1:1"], [0.333, "1:2"], [0.2, "1:4"],
];

/* ---------------- Subtractive pigment mixing ----------------------
   Kubelka-Munk mixing on reconstructed reflectance spectra (380 to
   730nm at 10nm). An sRGB colour decomposes into seven weights (white,
   cyan, magenta, yellow, red, green, blue) over smooth basis spectra
   derived by curvature-minimising optimisation against the CIE 1931
   observer under D65. Mixing happens in K/S space, so complements
   genuinely neutralise and blue plus yellow makes a painter's green. */
const SPD_BASES = [
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0.9931,0.9988,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[0.7954,0.8269,0.8583,0.8897,0.9207,0.9506,0.9766,0.9943,1,1,1,1,1,1,1,1,1,1,1,0.9495,0.7841,0.5346,0.2779,0.0886,0.003,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001],
[1,1,1,1,1,1,1,1,0.9924,0.8984,0.7119,0.4736,0.2434,0.0757,0.0001,0.0001,0.0001,0.0001,0.0267,0.127,0.2992,0.5105,0.7158,0.8753,0.9685,1,1,1,1,1,1,1,1,1,1,1],
[0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0101,0.063,0.1704,0.324,0.503,0.6809,0.832,0.9373,0.9898,1,1,1,1,1,1,0.9989,0.9923,0.9801,0.9635,0.944,0.9227,0.9005,0.8778,0.8549,0.8318,0.8088,0.7857,0.7626,0.7395],
[0.2123,0.1797,0.1471,0.1146,0.0824,0.0514,0.0244,0.0061,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0485,0.2136,0.4649,0.7238,0.9142,0.9989,1,1,1,1,1,1,1,1,1,1,1],
[0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0092,0.1039,0.2898,0.5267,0.7558,0.9234,0.9999,1,1,1,0.9722,0.8714,0.6999,0.49,0.2859,0.1266,0.0327,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001],
[1,1,1,1,1,1,1,0.9908,0.9386,0.8313,0.6771,0.4972,0.3184,0.1667,0.0614,0.0096,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0012,0.0078,0.0202,0.0371,0.057,0.0786,0.1012,0.1243,0.1476,0.171,0.1945,0.218,0.2415,0.265]
];
const SPD_TO_RGB = [
[0.000055,0.000185,0.000935,0.003093,0.009498,0.017333,0.022049,0.016332,0.001992,-0.016172,-0.033908,-0.046126,-0.06377,-0.083848,-0.091762,-0.082518,-0.052909,-0.012717,0.037385,0.091633,0.147853,0.181405,0.210525,0.209899,0.181175,0.131965,0.093653,0.057116,0.033444,0.018222,0.009292,0.004021,0.002067,0.001094,0.000454,0.000256],
[-0.000047,-0.000158,-0.000807,-0.002708,-0.008479,-0.016061,-0.02201,-0.020032,-0.011141,0.003784,0.022141,0.038972,0.063373,0.096,0.126307,0.14861,0.149082,0.142439,0.122124,0.095484,0.067457,0.035721,0.013159,-0.002364,-0.009393,-0.009878,-0.008372,-0.005602,-0.003442,-0.00192,-0.000995,-0.000435,-0.000224,-0.000119,-0.000049,-0.000028],
[0.000326,0.001107,0.005672,0.019167,0.060922,0.121236,0.184704,0.208611,0.197135,0.147097,0.091733,0.046442,0.02296,0.006643,-0.005811,-0.012439,-0.015509,-0.016696,-0.015684,-0.013632,-0.011303,-0.008065,-0.005852,-0.003935,-0.002484,-0.001436,-0.00085,-0.000457,-0.000247,-0.000129,-0.000064,-0.000027,-0.000014,-0.000007,-0.000003,-0.000002]
];
const SPEC_CACHE = new Map();
function hexToSpectrum(hex) {
  if (SPEC_CACHE.has(hex)) return SPEC_CACHE.get(hex);
  const [r8, g8, b8] = hexToRgb(hex);
  const r = srgbToLinear(r8), g = srgbToLinear(g8), b = srgbToLinear(b8);
  const w = Math.min(r, g, b);
  const r1 = r - w, g1 = g - w, b1 = b - w;
  const s = new Float64Array(36);
  const add = (bi, wt) => {
    if (wt > 0) { const B = SPD_BASES[bi]; for (let i = 0; i < 36; i++) s[i] += wt * B[i]; }
  };
  add(0, w);
  if (r1 <= g1 && r1 <= b1) {
    const c = Math.min(g1, b1); add(1, c); add(5, g1 - c); add(6, b1 - c);
  } else if (g1 <= r1 && g1 <= b1) {
    const m = Math.min(r1, b1); add(2, m); add(4, r1 - m); add(6, b1 - m);
  } else {
    const y = Math.min(r1, g1); add(3, y); add(4, r1 - y); add(5, g1 - y);
  }
  for (let i = 0; i < 36; i++) s[i] = Math.min(1, Math.max(1e-4, s[i]));
  SPEC_CACHE.set(hex, s);
  return s;
}
function mixSubtractive(parts) {
  let tw = 0;
  for (const p of parts) tw += p[1];
  if (!(tw > 0)) return parts.length ? parts[0][0] : "#000000";
  const ks = new Float64Array(36);
  for (const [hex, wt] of parts) {
    if (wt <= 0) continue;
    const s = hexToSpectrum(hex);
    const f = wt / tw;
    for (let i = 0; i < 36; i++) {
      const R = s[i];
      ks[i] += (f * (1 - R) * (1 - R)) / (2 * R);
    }
  }
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 36; i++) {
    const R = 1 + ks[i] - Math.sqrt(ks[i] * ks[i] + 2 * ks[i]);
    r += SPD_TO_RGB[0][i] * R;
    g += SPD_TO_RGB[1][i] * R;
    b += SPD_TO_RGB[2][i] * R;
  }
  return rgbToHex(linearToSrgb(Math.max(0, r)), linearToSrgb(Math.max(0, g)), linearToSrgb(Math.max(0, b)));
}


function mixMulti(parts) {
  return mixSubtractive(parts);
}

export { RATIOS, mixPaints, hexToSpectrum, mixSubtractive, mixMulti };
