import { hexToRgb, rgbToLab } from "../color/math.js";
import { computeRecord } from "../color/paints.js";
/* ---------------- Study sheet ------------------------------------- */
const SHEET = {
  paper: "#FBF7EE", ink: "#2B241A", sub: "#6E6350",
  line: "#D8CFBC", accent: "#8A6614",
};
function StudySheet({ title, subtitle, image, pins, activeBox, onClose }) {
  const recs = pins.map((p) => ({ p, r: computeRecord(p.hex, activeBox) }));
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="pw-sheet-overlay" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,7,5,.72)", zIndex: 60,
      overflowY: "auto", padding: 18, display: "flex", justifyContent: "center",
    }}>
      <div className="pw-sheet" onClick={(e) => e.stopPropagation()} style={{
        background: SHEET.paper, color: SHEET.ink, width: "100%", maxWidth: 780,
        borderRadius: 6, padding: "26px 30px", height: "fit-content",
        boxShadow: "0 18px 60px rgba(0,0,0,.6)",
      }}>
        <div className="pw-sheet-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => window.print()} style={{
            padding: "7px 16px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            background: SHEET.accent, color: SHEET.paper, border: "none", borderRadius: 3,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Print / save as PDF
          </button>
          <button onClick={onClose} style={{
            padding: "7px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            background: "transparent", color: SHEET.sub, border: `1px solid ${SHEET.line}`,
            borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
          }}>
            Close
          </button>
        </div>

        <div style={{ borderBottom: `2px solid ${SHEET.ink}`, paddingBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: SHEET.accent }}>
            The Painter's Wheel · Study sheet
          </div>
          <div className="display" style={{ fontSize: 26, color: SHEET.ink, marginTop: 2 }}>{title}</div>
          <div style={{ fontSize: 12, color: SHEET.sub, fontStyle: "italic" }}>{subtitle} · {today}</div>
        </div>

        <div style={{ position: "relative", lineHeight: 0, marginTop: 14 }}>
          <img src={image} alt={title} style={{ width: "100%", borderRadius: 4, display: "block" }} />
          {pins.map((p) => (
            <span key={p.id} style={{
              position: "absolute", left: `${p.fx * 100}%`, top: `${p.fy * 100}%`,
              transform: "translate(-50%, -100%)",
              width: 20, height: 20, borderRadius: "50%", background: p.hex,
              border: `2px solid ${SHEET.paper}`, boxShadow: `0 0 0 1px ${SHEET.ink}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, lineHeight: 1,
                color: rgbToLab(...hexToRgb(p.hex))[0] > 55 ? "#2B241A" : "#FBF7EE",
              }}>
                {p.num}
              </span>
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          {recs.map(({ p, r }) => (
            <div key={p.id} style={{ border: `1px solid ${SHEET.line}`, borderRadius: 4, padding: "10px 12px", breakInside: "avoid" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", background: p.hex,
                  boxShadow: `0 0 0 1px ${SHEET.ink}`, display: "inline-flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, lineHeight: 1,
                    color: rgbToLab(...hexToRgb(p.hex))[0] > 55 ? "#2B241A" : "#FBF7EE",
                  }}>
                    {p.num}
                  </span>
                </span>
                <span style={{
                  width: 30, height: 30, borderRadius: 3, background: p.hex,
                  border: `1px solid ${SHEET.line}`, flexShrink: 0,
                }} />
                <span style={{ minWidth: 0 }}>
                  <span className="mono" style={{ display: "block", fontSize: 12, color: SHEET.ink }}>{r.hex}</span>
                  <span className="mono" style={{ display: "block", fontSize: 10, color: SHEET.sub }}>Munsell ≈ {r.munsell}</span>
                </span>
              </div>
              {p.label && (
                <div style={{ fontSize: 10.5, color: SHEET.ink, fontStyle: "italic", marginTop: 4 }}>{p.label}</div>
              )}
              <div style={{ fontSize: 10, color: SHEET.sub, marginTop: 6 }}>
                {r.theory.temp} · {r.theory.valueZone}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: r.matches[0].x, border: `1px solid ${SHEET.line}`, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: SHEET.ink, lineHeight: 1.35 }}>
                  {r.matches[0].n} <span style={{ color: SHEET.sub }}>({r.matches[0].m}) ΔE {r.matches[0].dE.toFixed(1)}</span>
                </span>
              </div>
              {r.mix && (
                <div style={{ fontSize: 10.5, color: SHEET.ink, lineHeight: 1.45, marginTop: 5, paddingTop: 5, borderTop: `1px dashed ${SHEET.line}` }}>
                  <span style={{ color: SHEET.accent, fontWeight: 600 }}>Mix </span>
                  {r.mix.a.n} + {r.mix.b.n}, {r.mix.ratio}
                  <span style={{ color: SHEET.sub }}> · ΔE {r.mix.dE.toFixed(1)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, paddingTop: 8, borderTop: `1px solid ${SHEET.line}`, fontSize: 9.5, color: SHEET.sub, lineHeight: 1.5 }}>
          {activeBox ? `Matched against your paintbox (${activeBox.size} tubes)` : "Matched against the full 76-paint database"} ·
          mixes previewed with Kubelka-Munk pigment mixing; confirm ratios on the palette ·
          painters-wheel.vercel.app
        </div>
      </div>
    </div>
  );
}

export { StudySheet };
