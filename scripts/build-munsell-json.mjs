// Regenerates public/munsell.json from the canonical dataset in
// src/munsellData.js (test/tooling-only module). Run after any change
// to the renotation data: node scripts/build-munsell-json.mjs
import { writeFileSync } from "node:fs";
import { MUNSELL_POINTS } from "../src/munsellData.js";
writeFileSync(new URL("../public/munsell.json", import.meta.url), JSON.stringify(Array.from(MUNSELL_POINTS)));
console.log(`public/munsell.json written: ${MUNSELL_POINTS.length} numbers (${MUNSELL_POINTS.length / 6} points)`);
