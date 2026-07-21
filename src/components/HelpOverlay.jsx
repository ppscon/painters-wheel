import { T } from "./ui.jsx";
/* ---------------- Tooltips and help ------------------------------- */
const HELP_SECTIONS = [
  ["Lessons", "Four paintings teach the four pillars. Hover (or touch-drag) for the loupe, click (or lift your finger) to drop a numbered pin, and click a pin to recall its record. The view buttons switch between colour, plain value, and 3, 5 or 9-step posterisation; the histogram beneath shows how the picture's values mass into shadow, mid and light zones."],
  ["Your Canvas", "Load any image of your own; it stays in your browser and is never uploaded. You get the same pinning, value views and histogram, plus an automatic extraction of the picture's eight dominant colour clusters."],
  ["Colour Wheel", "The RYB wheel is a mixing lab: pick a hue, then lean it warm or cool along the wheel, cancel its chroma toward the complement, or take it up and down in value, comparing darkening with black against darkening with the complement. The Munsell pages toggle opens all 40 constant-hue pages of the measured renotation data."],
  ["Zorn Palette", "The four-tube portrait method: white, yellow ochre, cadmium red and ivory black. The mixing lab derives the classic earth tones live, the relativity demo shows one grey reading blue against a warm ground, and the block-in walks the five stages of a classical portrait."],
  ["Paintbox", "Tick the tubes you own and switch matching restriction on; every paint match, mixing recommendation and nearest-tube readout then searches only your box. Needs at least two tubes to activate."],
  ["The colour record", "Every pinned or picked colour gets its hex, RGB, Lab and Munsell notation, temperature and value-zone guidance, the three nearest tube paints with difference scores, and, when no single tube is close enough, a two-paint mixing recommendation with ratios."],
  ["Your data", "Pins, the saved palette and your paintbox persist in this browser only; nothing is sent to a server. Clearing site data resets them."],
];
const HELP_GLOSSARY = [
  ["Hue", "Which colour family a colour belongs to: red, yellow-green, blue and so on."],
  ["Value", "Lightness on a dark-to-light scale; the structural backbone of a painting."],
  ["Chroma", "Intensity or saturation; how far a colour sits from neutral grey."],
  ["Munsell H V/C", "A colour specified as hue, value/chroma, e.g. 7.5R 5.2/19. Here it is interpolated from the 2,734 measured renotation colours."],
  ["\u0394E", "Perceptual colour difference (CIEDE2000). Under 2 is barely distinguishable, under 6 is close, over 12 means mixing is required."],
  ["Notan", "A design reduced to flat light and dark shapes; the 3-step view produces one."],
  ["Kubelka-Munk", "The pigment-mixing model used for every mix preview, which is why complements neutralise and blue plus yellow makes a painter's green rather than light's grey."],
  ["Opacity codes", "O opaque, SO semi-opaque, ST semi-transparent, T transparent. Series is the maker's price band."],
];
function HelpOverlay({ onClose }) {
  return (
    <div
      className="pw-help-overlay"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,7,5,.72)", zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8,
          maxWidth: 660, width: "100%", maxHeight: "84vh", overflowY: "auto",
          padding: "22px 24px", boxShadow: "0 18px 60px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="display" style={{ fontSize: 24, color: T.bone }}>How to use The Painter's Wheel</div>
          <button onClick={onClose} aria-label="Close help" style={{
            background: "transparent", border: "none", color: T.muted, fontSize: 20,
            cursor: "pointer", fontFamily: "inherit", padding: "0 2px",
          }}>
            ×
          </button>
        </div>
        {HELP_SECTIONS.map(([t, d]) => (
          <div key={t} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre }}>{t}</div>
            <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, marginTop: 4 }}>{d}</div>
          </div>
        ))}
        <div style={{ marginTop: 18, borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 8 }}>
            Glossary
          </div>
          {HELP_GLOSSARY.map(([t, d]) => (
            <div key={t} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: `1px solid ${T.line}` }}>
              <span style={{ color: T.bone, fontSize: 12, fontWeight: 600, width: 110, flexShrink: 0 }}>{t}</span>
              <span style={{ color: T.muted, fontSize: 12, lineHeight: 1.55 }}>{d}</span>
            </div>
          ))}
        </div>
        <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.55, marginTop: 12 }}>
          Look for the small ? markers throughout the app; each explains the term or number it
          sits beside.
        </p>
      </div>
    </div>
  );
}

export { HelpOverlay };
