import { useState } from "react";
import { T, SectionRule } from "./ui.jsx";
import { mixMulti } from "../color/km.js";
import { nearestPaint } from "../color/paints.js";
import { ZORN, ZHEX, zmix, ZORN_MIXES, ZORN_ZONES, ZORN_STEPS } from "../data/zorn.js";
function ZornView({ setSampled, activeBox }) {
  const [tint, setTint] = useState(0);
  const grey = mixMulti([[ZHEX.black, 1], [ZHEX.white, 2.2]]);
  const warmGround = mixMulti([[ZHEX.red, 3], [ZHEX.ochre, 2], [ZHEX.black, 0.6]]);
  return (
    <div>
      <div className="display" style={{ fontSize: 22, color: T.bone }}>The Zorn Palette</div>
      <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
        Four tubes, after Anders Zorn (1860 to 1920)
      </div>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, margin: "8px 0 4px" }}>
        A severely restricted classical palette: white, an earth yellow, a warm red and a cool
        black, with the black standing proxy for blue. Its lineage runs back to the four-colour
        palette Pliny attributed to the Greek masters. The restriction is the point: every mix on
        the canvas shares roots with the same four tubes, so tonal harmony is built in, and the
        painter is pushed onto value rather than superficial colour. Everything below is computed
        live from the four swatches; click any colour to open its full record.
      </p>

      <SectionRule>The four tubes</SectionRule>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 12 }}>
        {ZORN.map((z) => (
          <button key={z.key} onClick={() => setSampled(z.x)} style={{
            textAlign: "left", padding: 10, borderRadius: 5, cursor: "pointer",
            background: T.panel2, border: `1px solid ${T.line}`, fontFamily: "inherit",
          }}>
            <div style={{ height: 44, borderRadius: 4, background: z.x, border: `1px solid ${T.line}` }} />
            <div style={{ color: T.bone, fontSize: 13, fontWeight: 600, marginTop: 7 }}>{z.n}</div>
            <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.45, marginTop: 3 }}>{z.role}</div>
          </button>
        ))}
      </div>

      <SectionRule>Chromatic relativity: the illusion of blue</SectionRule>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, margin: "10px 0" }}>
        Both squares below are the identical Black and White grey. Temperature is judged by
        context: beside warm flesh notes the grey shifts and reads as a silvery blue, which is
        how blue eyes, denim and cool northern light get painted without a blue tube.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { bg: warmGround, cap: "Against a warm ground it reads silvery blue" },
          { bg: T.panel2, cap: "Against a neutral it reads plain grey" },
        ].map((d, i) => (
          <div key={i} style={{ flex: "1 1 180px", textAlign: "center" }}>
            <div style={{ background: d.bg, borderRadius: 6, border: `1px solid ${T.line}`, padding: 26, display: "flex", justifyContent: "center" }}>
              <button onClick={() => setSampled(grey)} title={grey} style={{
                width: 64, height: 64, background: grey, border: "none", borderRadius: 4, cursor: "pointer",
              }} />
            </div>
            <div style={{ fontSize: 11, color: T.faint, marginTop: 6, fontStyle: "italic" }}>{d.cap}</div>
          </div>
        ))}
      </div>

      <SectionRule>The mixing lab: earth tones from four tubes</SectionRule>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, margin: "10px 0 4px" }}>
        The classic earth tubes fall out of the palette by cross-mixing. Each swatch is mixed
        with the Kubelka-Munk pigment model and checked against the nearest real tube in the
        paint database. Slide in
        white to watch the umbers settle into the warm greys the palette is famous for.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 2px" }}>
        <span style={{ fontSize: 11, color: T.muted, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>Tint with white</span>
        <input type="range" min="0" max="6" step="1" value={tint} aria-label="Tint with white"
          onChange={(e) => setTint(Number(e.target.value))}
          style={{ flex: 1, accentColor: T.ochre }} />
        <span className="mono" style={{ fontSize: 11, color: T.faint, width: 62, textAlign: "right", flexShrink: 0 }}>
          {tint === 0 ? "masstone" : `+${tint} white`}
        </span>
      </div>
      {ZORN_MIXES.map((m) => {
        const hex = zmix(m.spec, tint);
        const near = nearestPaint(hex, activeBox);
        return (
          <div key={m.name} style={{
            display: "flex", gap: 12, alignItems: "center", padding: "10px 0",
            borderBottom: `1px solid ${T.line}`, flexWrap: "wrap",
          }}>
            <button onClick={() => setSampled(hex)} title={hex} style={{
              width: 46, height: 46, borderRadius: 5, background: hex,
              border: `1px solid ${T.line}`, cursor: "pointer", flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ color: T.bone, fontSize: 14, fontWeight: 600 }}>{m.name}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>{m.recipe}</div>
              <div style={{ color: T.faint, fontSize: 11, marginTop: 2, lineHeight: 1.45 }}>{m.note}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase" }}>Nearest tube</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", marginTop: 3 }}>
                <div style={{ width: 18, height: 18, borderRadius: 3, background: near.x, border: `1px solid ${T.line}` }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: T.bone, fontSize: 11 }}>{near.n}</div>
                  <div className="mono" style={{ color: T.muted, fontSize: 10 }}>{near.m} · ΔE {near.dE.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>
        Mixes use the Kubelka-Munk pigment model, so they behave like paint on the palette;
        individual pigments still vary by brand, so treat the ratios as starting points.
      </p>

      <SectionRule>Portrait block-in, step by step</SectionRule>
      <ol style={{ margin: "12px 0 0", paddingLeft: 18, color: T.bone, fontSize: 13, lineHeight: 1.65 }}>
        {ZORN_STEPS.map(([t, d], i) => (
          <li key={i} style={{ marginBottom: 9 }}>
            <span style={{ color: T.ochre, fontWeight: 600 }}>{t}. </span>
            <span style={{ color: T.muted }}>{d}</span>
          </li>
        ))}
      </ol>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
        {ZORN_ZONES.map((z) => {
          const hex = zmix(z.spec);
          return (
            <button key={z.name} onClick={() => setSampled(hex)} title={hex} style={{
              textAlign: "left", padding: 10, borderRadius: 5, cursor: "pointer",
              background: T.panel2, border: `1px solid ${T.line}`, fontFamily: "inherit",
            }}>
              <div style={{ height: 38, borderRadius: 4, background: hex, border: `1px solid ${T.line}` }} />
              <div style={{ color: T.bone, fontSize: 12, fontWeight: 600, marginTop: 6 }}>{z.name}</div>
              <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.45, marginTop: 3 }}>{z.note}</div>
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 16, background: T.panel2, border: `1px solid ${T.line}`,
        borderLeft: `3px solid ${T.ochre}`, borderRadius: 4, padding: "12px 14px",
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 8 }}>
          Core lessons
        </div>
        <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.7 }}>
          Harmony is structural: every hue shares the same four roots, so the picture cannot fall
          out of key. Value carries form: if the values are right, the colour reads as right. And
          squint: the block-in is about clean shapes of light against clean shapes of shadow, not
          detail.
        </div>
      </div>
    </div>
  );
}

export { ZornView };
