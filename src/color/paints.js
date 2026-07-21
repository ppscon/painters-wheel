import { hexToRgb, rgbToLab, deltaE2000 } from "./math.js";
import { labToMunsell } from "./munsell.js";
import { mixPaints, RATIOS } from "./km.js";
import { theoryGuidance } from "./ryb.js";
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

function bestMixFor(targetLab, sortedAll, activeBox) {
  const mixers = activeBox ? MIXERS.filter((p) => activeBox.has(p.m + "::" + p.n)) : MIXERS;
  const pool = [...sortedAll.slice(0, 10), ...mixers];
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


function paintPool(activeBox) {
  if (!activeBox) return PAINT_LABS;
  const p = PAINT_LABS.filter((pt) => activeBox.has(pt.m + "::" + pt.n));
  return p.length ? p : PAINT_LABS;
}

function nearestPaint(hex, activeBox) {
  const lab = rgbToLab(...hexToRgb(hex));
  let best = null;
  for (const pt of paintPool(activeBox)) {
    const dE = deltaE2000(lab, pt.lab);
    if (!best || dE < best.dE) best = { ...pt, dE };
  }
  return best;
}

/* Gamut classification for the Munsell explorer: can the palette reach
   this chip straight from a tube (dE < 6), with a two-paint mix, or
   not at all? dE 6 is the record panel's "close, adjust slightly"
   boundary — beyond it a painter would call the chip out of reach. */
function classifyGamut(hex, activeBox) {
  const lab = rgbToLab(...hexToRgb(hex));
  const all = paintPool(activeBox).map((pt) => ({ ...pt, dE: deltaE2000(lab, pt.lab) })).sort((a, b) => a.dE - b.dE);
  if (all[0].dE < 6) return { kind: "tube", paint: all[0], dE: all[0].dE };
  const mix = all.length >= 2 ? bestMixFor(lab, all, activeBox) : null;
  if (mix && mix.dE < 6) return { kind: "mix", mix, dE: mix.dE };
  return { kind: "out", dE: Math.min(all[0].dE, mix ? mix.dE : Infinity) };
}

function computeRecord(hex, activeBox) {
  const rgb = hexToRgb(hex);
  const lab = rgbToLab(...rgb);
  const munsell = labToMunsell(lab);
  const all = paintPool(activeBox).map((pt) => ({ ...pt, dE: deltaE2000(lab, pt.lab) })).sort((a, b) => a.dE - b.dE);
  const matches = all.slice(0, 3);
  const mix = matches[0].dE > 2.5 && all.length >= 2 ? bestMixFor(lab, all, activeBox) : null;
  const theory = theoryGuidance(lab);
  return { hex, rgb, lab, munsell, matches, mix, theory };
}

export { PAINTS, PAINT_LABS, MIXERS, bestMixFor, paintPool, nearestPaint, computeRecord, classifyGamut };
