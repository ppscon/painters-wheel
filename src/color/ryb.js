import { hexToRgb, rgbToLab, deltaE2000 } from "./math.js";
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
  complement: { label: "Complement", offsets: [6], color: "#C8452C" },
  split: { label: "Split-complement", offsets: [5, 7], color: "#C9962E" },
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

export { RYB, RYB_LABS, HARMONIES, theoryGuidance };
