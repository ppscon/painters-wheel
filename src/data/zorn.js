import { mixMulti } from "../color/km.js";
/* ---------------- Zorn palette study ------------------------------ */
const ZORN = [
  { key: "white", n: "Titanium White", x: "#F4F1E9", role: "Raises value and builds the opaque structure of the lights." },
  { key: "ochre", n: "Yellow Ochre", x: "#C6912C", role: "The muted earth yellow that anchors every flesh note." },
  { key: "red", n: "Cadmium Red", x: "#C22D1E", role: "The high-chroma warm red that puts the blood in skin." },
  { key: "black", n: "Ivory Black", x: "#23201C", role: "Cool and bluish; it stands in for blue on this palette." },
];
const ZHEX = Object.fromEntries(ZORN.map((z) => [z.key, z.x]));
const zmix = (spec, extraWhite = 0) =>
  mixMulti([...spec.map(([k, w]) => [ZHEX[k], w]), ...(extraWhite > 0 ? [[ZHEX.white, extraWhite]] : [])]);
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

export { ZORN, ZHEX, zmix, ZORN_MIXES, ZORN_ZONES, ZORN_STEPS };
