import { useMemo } from "react";
import { T, SectionRule, Tip } from "./ui.jsx";
import { computeRecord } from "../color/paints.js";
/* ---------------- Colour record --------------------------------- */
function useColorRecord(hex, activeBox) {
  return useMemo(() => (hex ? computeRecord(hex, activeBox) : null), [hex, activeBox]);
}
function dELabel(dE) {
  if (dE < 3) return { t: "excellent match", c: "#4DB6AC" };
  if (dE < 6) return { t: "close, adjust slightly", c: T.ochre };
  if (dE < 12) return { t: "base for a mixture", c: "#C9962E" };
  return { t: "mixing required", c: T.vermilion };
}
function ColorRecord({ hex, sourceLabel, onSave, activeBox }) {
  const rec = useColorRecord(hex, activeBox);
  if (!rec)
    return (
      <div style={{ color: T.faint, fontStyle: "italic", padding: "24px 0", lineHeight: 1.6 }}>
        Drop a pin on a lesson painting or your own image, or click a hue on the wheel. Each pin
        keeps its colour identification, theory guidance and mixing advice.
      </div>
    );
  const [L, a, b] = rec.lab;
  const th = rec.theory;
  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        <div style={{
          width: 84, minHeight: 84, borderRadius: 6, background: rec.hex,
          border: `1px solid ${T.line}`, boxShadow: "inset 0 0 18px rgba(0,0,0,.25)",
        }} />
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 22, color: T.bone, letterSpacing: 1 }}>{rec.hex}</div>
          <div className="mono" style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            RGB {rec.rgb.join(" · ")}
          </div>
          <div className="mono" style={{ fontSize: 12, color: T.muted }}>
            L*a*b* {L.toFixed(0)} {a.toFixed(0)} {b.toFixed(0)}
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="mono" style={{
              fontSize: 13, color: T.ground, background: T.ochre, padding: "2px 8px", borderRadius: 3,
            }}>
              Munsell ≈ {rec.munsell}
            </span>
            <Tip text={'Munsell notation: hue, then value/chroma. 7.5R 5.2/19 reads as a red of hue step 7.5, value 5.2 (mid), chroma 19 (intense). Interpolated here from the 2,734 measured renotation colours.'} side="bottom" />
          </div>
        </div>
      </div>
      {sourceLabel && (
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8, fontStyle: "italic" }}>{sourceLabel}</div>
      )}

      <SectionRule>Colour theory</SectionRule>
      <div style={{ padding: "10px 0 2px", fontSize: 13, color: T.bone, lineHeight: 1.65 }}>
        <div>
          <span style={{ color: T.muted }}>Temperature · </span>{th.temp}
          <span style={{ color: T.muted }}> &nbsp;Value · </span>{th.valueZone}
        </div>
        <div style={{ marginTop: 6 }}>
          <span style={{ color: T.muted }}>Hue family · </span>{th.hueFamily}
          <span style={{ color: T.muted }}>, complement </span>
          <span style={{
            display: "inline-block", width: 12, height: 12, borderRadius: 2,
            background: th.complement.hex, border: `1px solid ${T.line}`,
            verticalAlign: "-1px", marginRight: 4,
          }} />
          {th.complement.name}
          <span style={{ color: T.muted }}> (mix toward it to neutralise or shadow this hue)</span>
        </div>
        <div style={{ marginTop: 6, color: T.muted, fontSize: 12 }}>{th.chromaNote}</div>
        {th.tenebrism && (
          <div style={{
            marginTop: 8, fontSize: 12, color: T.bone, background: T.panel,
            border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.ochre}`,
            padding: "8px 10px", borderRadius: 3, lineHeight: 1.55,
          }}>
            {th.tenebrism}
          </div>
        )}
      </div>

      <SectionRule>Nearest oil paints<Tip text={"ΔE is CIEDE2000 perceptual difference: under 2 barely distinguishable, under 6 close, over 12 needs mixing. O/SO/ST/T = opaque to transparent; Series is the maker's price band."} /></SectionRule>
      {activeBox && (
        <div style={{ fontSize: 10, color: T.ochre, marginTop: 6, letterSpacing: 0.5 }}>
          Matching your paintbox · {activeBox.size} tubes
        </div>
      )}
      {rec.matches.map((m, i) => {
        const q = dELabel(m.dE);
        return (
          <div key={i} style={{
            display: "flex", gap: 12, alignItems: "center",
            padding: "10px 0", borderBottom: `1px solid ${T.line}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 4, background: m.x,
              border: `1px solid ${T.line}`, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.bone, fontSize: 14, fontWeight: 600 }}>{m.n}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>
                {m.m} · <span className="mono">{m.p}</span> · {m.o} · Series {m.s}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="mono" style={{ color: T.bone, fontSize: 13 }}>ΔE {m.dE.toFixed(1)}</div>
              <div style={{ color: q.c, fontSize: 10, letterSpacing: 0.5 }}>{q.t}</div>
            </div>
          </div>
        );
      })}

      {rec.mix && (
        <div>
          <SectionRule>Mixing recommendation<Tip text={'Previewed with Kubelka-Munk pigment mixing on reconstructed reflectance spectra, so the swatch behaves like paint, not light. Brands vary, so confirm on the palette.'} /></SectionRule>
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 4, background: rec.mix.a.x, border: `1px solid ${T.line}` }} />
            <span style={{ color: T.muted, fontSize: 15 }}>+</span>
            <div style={{ width: 30, height: 30, borderRadius: 4, background: rec.mix.b.x, border: `1px solid ${T.line}` }} />
            <span style={{ color: T.muted, fontSize: 15 }}>→</span>
            <div style={{
              width: 44, height: 44, borderRadius: 4, background: rec.mix.hex,
              border: `2px solid ${T.ochre}`,
            }} />
            <div style={{ marginLeft: 4 }}>
              <div className="mono" style={{ color: T.bone, fontSize: 14 }}>{rec.mix.ratio}</div>
              <div className="mono" style={{ color: T.muted, fontSize: 11 }}>ΔE {rec.mix.dE.toFixed(1)}</div>
            </div>
          </div>
          <div style={{ color: T.bone, fontSize: 13, lineHeight: 1.5 }}>
            {rec.mix.a.n} <span style={{ color: T.faint }}>({rec.mix.a.m})</span> with{" "}
            {rec.mix.b.n} <span style={{ color: T.faint }}>({rec.mix.b.m})</span>, roughly {rec.mix.ratio} by volume.
          </div>
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 6, fontStyle: "italic" }}>
            Mixed with a Kubelka-Munk pigment model, so the preview behaves like paint rather
            than light. Real pigments still vary by brand, so confirm on the palette.
          </div>
        </div>
      )}

      <button onClick={() => onSave(rec.hex)} style={{
        marginTop: 14, width: "100%", padding: "9px 0", background: "transparent",
        border: `1px solid ${T.ochre}`, color: T.ochre, borderRadius: 4,
        cursor: "pointer", fontSize: 12, letterSpacing: 2, textTransform: "uppercase",
        fontFamily: "inherit",
      }}>
        Save to palette
      </button>
    </div>
  );
}

export { ColorRecord, useColorRecord };
