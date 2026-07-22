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

export { LADDER, buildLadder, bestRung, bestCorrection, calibrationDefaults };
