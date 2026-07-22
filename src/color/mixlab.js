import { hexToRgb, rgbToLab, deltaE2000 } from "./math.js";
import { labToMunsell } from "./munsell.js";
import { mixPaints } from "./km.js";

/* ---------------- Mix Lab ----------------------------------------
   The graded mixing ladder and the observe-correct loop: a mix
   recommendation becomes physical piles at fixed ratios, the painter
   records what actually came off the palette, and the observation
   becomes the source for the next correction. */

/* Titanium White (PW6) masstone; seeds default calibration tints for
   tubes the painter has not measured yet. */
const CAL_WHITE = "#F4F1E9";

/* Ratios are source : adjuster. Weight is the source's share, fed
   straight to mixPaints. "Straight" is the untouched source pile. */
const LADDER = [
  { label: "Straight", ratio: "1:0", w: 1 },
  { label: "Trace", ratio: "8:1", w: 8 / 9 },
  { label: "Small", ratio: "4:1", w: 4 / 5 },
  { label: "Generous", ratio: "2:1", w: 2 / 3 },
  { label: "Equal", ratio: "1:1", w: 1 / 2 },
  { label: "Strong", ratio: "1:2", w: 1 / 3 },
  { label: "Deep", ratio: "1:4", w: 1 / 5 },
];

function buildLadder(sourceHex, adjusterHex, targetLab) {
  return LADDER.map((step) => {
    const hex = step.w === 1 ? sourceHex : mixPaints(sourceHex, adjusterHex, step.w);
    const lab = rgbToLab(...hexToRgb(hex));
    return { ...step, hex, munsell: labToMunsell(lab), dE: deltaE2000(targetLab, lab) };
  });
}

function bestRung(ladder) {
  return ladder.reduce((m, s) => (s.dE < m.dE ? s : m));
}

/* Given an observed palette colour, search every tube in the pool at
   every ladder ratio for the addition that lands closest to target.
   Skips "Straight" (adding nothing) and any tube identical to the
   source. Returns null on an empty pool. */
function bestCorrection(sourceHex, targetLab, pool) {
  let best = null;
  for (const pt of pool) {
    if (pt.x === sourceHex) continue;
    for (const step of LADDER) {
      if (step.w === 1) continue;
      const hex = mixPaints(sourceHex, pt.x, step.w);
      const dE = deltaE2000(targetLab, rgbToLab(...hexToRgb(hex)));
      if (!best || dE < best.dE) best = { paint: pt, ratio: step.ratio, label: step.label, w: step.w, hex, dE };
    }
  }
  return best;
}

/* ---------------- Axis-at-a-time correction ----------------------
   The classical discipline: correct one dimension at a time — value
   first, then hue, then chroma — holding the other two. Axes are
   Lab-native but scaled to Munsell-like units (value = L/10, chroma
   = Cab/5, hue in ~Munsell steps of 9°), so the scoring weights
   carry over from studio practice and nothing waits on the
   renotation dataset. */

function labDims([L, a, b]) {
  const cab = Math.hypot(a, b);
  return { v: L / 10, c: cab / 5, h: (Math.atan2(b, a) * 180) / Math.PI, neutral: cab < 4 };
}

/* Circular hue distance in ~Munsell steps (40 per revolution).
   Neutrals have no hue, so distance to or from one is zero. */
function hueStepDist(d1, d2) {
  if (d1.neutral || d2.neutral) return 0;
  let d = Math.abs(d1.h - d2.h) % 360;
  if (d > 180) d = 360 - d;
  return d / 9;
}

/* How far source sits from target on each axis, which axes already
   count as aligned, and which the classical order says to correct
   next. value/chroma are signed: positive = source is darker / more
   muted than the target. */
function axisReport(sourceLab, targetLab) {
  const s = labDims(sourceLab), t = labDims(targetLab);
  const value = t.v - s.v;
  const hue = hueStepDist(s, t);
  const chroma = t.c - s.c;
  const aligned = {
    value: Math.abs(value) < 0.5,
    hue: hue < 0.5,
    chroma: Math.abs(chroma) < 1,
  };
  const suggest = !aligned.value ? "value" : !aligned.hue ? "hue" : !aligned.chroma ? "chroma" : null;
  return { value, hue, chroma, aligned, suggest };
}

/* Score a predicted mix for one axis: advance that axis toward the
   target, penalise drift on the two held axes. Weights ported from
   the colour-studio prototype's studio-tuned values. Lower is
   better. */
function axisScore(srcD, tgtD, predD, mode) {
  const tH = hueStepDist(predD, tgtD), tV = Math.abs(predD.v - tgtD.v), tC = Math.abs(predD.c - tgtD.c);
  const mH = hueStepDist(predD, srcD), mV = Math.abs(predD.v - srcD.v), mC = Math.abs(predD.c - srcD.c);
  if (mode === "hue") return tH * 5 + mV * 5 + mC * 1.5;
  if (mode === "value") return tV * 12 + mH * 3 + mC * 1.5;
  return tC * 5 + mH * 3 + mV * 7;
}

/* bestCorrection constrained to one axis: the winning addition moves
   the chosen dimension toward target while disturbing the held two
   least, with a small overall-dE tiebreak. mode "overall" (or none)
   falls through to the unconstrained search. */
function bestAxisCorrection(sourceHex, targetLab, pool, mode) {
  if (!mode || mode === "overall") return bestCorrection(sourceHex, targetLab, pool);
  const srcD = labDims(rgbToLab(...hexToRgb(sourceHex)));
  const tgtD = labDims(targetLab);
  let best = null;
  for (const pt of pool) {
    if (pt.x === sourceHex) continue;
    for (const step of LADDER) {
      if (step.w === 1) continue;
      const hex = mixPaints(sourceHex, pt.x, step.w);
      const lab = rgbToLab(...hexToRgb(hex));
      const dE = deltaE2000(targetLab, lab);
      const score = axisScore(srcD, tgtD, labDims(lab), mode) + dE * 0.08;
      if (!best || score < best.score) best = { paint: pt, ratio: step.ratio, label: step.label, w: step.w, hex, dE, score };
    }
  }
  return best;
}

/* Starting swatches for an uncalibrated tube: the catalogue masstone
   and two KM-predicted tints toward titanium white. The painter then
   nudges each toward what the tube really does. */
function calibrationDefaults(masstoneHex) {
  return {
    masstone: masstoneHex.toUpperCase(),
    midTint: mixPaints(masstoneHex, CAL_WHITE, 0.45).toUpperCase(),
    paleTint: mixPaints(masstoneHex, CAL_WHITE, 0.18).toUpperCase(),
  };
}

export { LADDER, buildLadder, bestRung, bestCorrection, bestAxisCorrection, axisReport, calibrationDefaults };
