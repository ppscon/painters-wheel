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

export { LESSONS };
