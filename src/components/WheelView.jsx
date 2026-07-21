import React, { useState, useEffect, useMemo } from "react";
import { T, Tip } from "./ui.jsx";
import { hexToRgb, rgbToLab, labToRgbHex } from "../color/math.js";
import { MUNSELL_HUE_NAMES, MUNSELL_BY_HUE, labToMunsell } from "../color/munsell.js";
import { mixMulti } from "../color/km.js";
import { RYB, HARMONIES } from "../color/ryb.js";
import { nearestPaint, classifyGamut } from "../color/paints.js";
import { ZHEX } from "../data/zorn.js";
function MunsellExplorer({ onPick, jump, activeBox }) {
  const [hueIdx, setHueIdx] = useState(29);
  const [showGamut, setShowGamut] = useState(false);
  useEffect(() => { if (jump) setHueIdx(jump.idx); }, [jump]);
  const pts = MUNSELL_BY_HUE[hueIdx].filter((p) => p.v >= 1);
  /* Reachability of every chip on this page for the working palette:
     computed only while the overlay is on, memoised per page + box. */
  const gamut = useMemo(() => {
    if (!showGamut) return null;
    const m = {};
    for (const p of pts) {
      const { hex } = labToRgbHex(p.L, p.a, p.b);
      m[`${p.v}_${p.c}`] = classifyGamut(hex, activeBox);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGamut, hueIdx, activeBox]);
  const values = [...new Set(pts.map((p) => p.v))].sort((x, y) => y - x);
  const maxC = pts.reduce((m, p) => Math.max(m, p.c), 2);
  const chromas = [];
  for (let c = 2; c <= maxC; c += 2) chromas.push(c);
  const byVC = {};
  for (const p of pts) byVC[`${p.v}_${p.c}`] = p;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button onClick={() => setHueIdx((hueIdx + 39) % 40)} style={{
          width: 30, height: 30, borderRadius: 4, background: "transparent", color: T.muted,
          border: `1px solid ${T.line}`, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
        }}>{"\u2039"}</button>
        <input type="range" min="0" max="39" step="1" value={hueIdx} aria-label="Munsell hue page"
          onChange={(e) => setHueIdx(Number(e.target.value))}
          style={{ flex: 1, accentColor: T.ochre }} />
        <button onClick={() => setHueIdx((hueIdx + 1) % 40)} style={{
          width: 30, height: 30, borderRadius: 4, background: "transparent", color: T.muted,
          border: `1px solid ${T.line}`, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
        }}>{"\u203a"}</button>
        <span className="display" style={{ fontSize: 22, color: T.bone, width: 80, textAlign: "right", flexShrink: 0 }}>
          {MUNSELL_HUE_NAMES[hueIdx]}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => setShowGamut((s) => !s)} aria-pressed={showGamut} style={{
          padding: "6px 12px", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
          background: showGamut ? T.ochre : "transparent",
          color: showGamut ? T.ground : T.muted,
          border: `1px solid ${showGamut ? T.ochre : T.line}`,
          borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
        }}>
          Paint gamut overlay
        </button>
        <Tip text={`Marks what ${activeBox ? "your paintbox" : "the full paint range"} can reach on this page: full-strength chips come straight from a tube (ΔE under 6), chips with a small ring need a two-paint mix, and dimmed chips are beyond the pigments — usually the high-chroma edge. Restrict matching in Paintbox to see your own gamut.`} side="bottom" />
        {showGamut && (
          <span style={{ fontSize: 10, color: T.faint, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>tube · plain chip</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              mix
              <span style={{ width: 7, height: 7, borderRadius: "50%", border: `1.5px solid ${T.muted}`, display: "inline-block" }} />
            </span>
            <span style={{ opacity: 0.4 }}>out of reach · dimmed</span>
            <span style={{ color: T.ochre }}>{activeBox ? "your paintbox" : "full range"}</span>
          </span>
        )}
      </div>
      {pts.length === 0 && (
        <div style={{ padding: "50px 24px", textAlign: "center", color: T.faint, fontStyle: "italic" }}>
          Loading the renotation data…
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `34px repeat(${chromas.length}, minmax(26px, 1fr))`,
          gap: 3, alignItems: "stretch", minWidth: chromas.length * 30 + 40,
        }}>
          <div />
          {chromas.map((c) => (
            <div key={"h" + c} className="mono" style={{ fontSize: 9, color: T.faint, textAlign: "center" }}>/{c}</div>
          ))}
          {values.map((v) => (
            <React.Fragment key={"row" + v}>
              <div className="mono" style={{ fontSize: 10, color: T.muted, alignSelf: "center", textAlign: "right", paddingRight: 4 }}>
                {v}/
              </div>
              {chromas.map((c) => {
                const p = byVC[`${v}_${c}`];
                if (!p) return <div key={c} />;
                const { hex, clipped } = labToRgbHex(p.L, p.a, p.b);
                const g = gamut && gamut[`${v}_${c}`];
                const gLabel = !g ? "" :
                  g.kind === "tube" ? ` — straight from ${g.paint.n} (ΔE ${g.dE.toFixed(1)})` :
                  g.kind === "mix" ? ` — mix ${g.mix.a.n} + ${g.mix.b.n} ${g.mix.ratio} (ΔE ${g.dE.toFixed(1)})` :
                  ` — out of reach (best ΔE ${g.dE.toFixed(1)})`;
                return (
                  <button key={c} onClick={() => onPick(hex)}
                    title={`${MUNSELL_HUE_NAMES[hueIdx]} ${v}/${c}${clipped ? " (outside sRGB, clamped)" : ""}${gLabel}`}
                    aria-label={`${MUNSELL_HUE_NAMES[hueIdx]} value ${v} chroma ${c}${gLabel}`}
                    style={{
                      height: 26, background: hex, cursor: "pointer", padding: 0, borderRadius: 2,
                      border: clipped ? `1px dashed ${T.faint}` : `1px solid ${T.line}`,
                      position: "relative",
                      opacity: g && g.kind === "out" ? 0.28 : 1,
                      transition: "opacity .2s",
                    }}>
                    {g && g.kind === "mix" && (
                      <span style={{
                        position: "absolute", right: 2, bottom: 2, width: 7, height: 7,
                        borderRadius: "50%", background: "transparent",
                        border: `1.5px solid ${p.v >= 6 ? "rgba(20,15,10,.85)" : "rgba(245,240,228,.9)"}`,
                        pointerEvents: "none",
                      }} />
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.6, marginTop: 10 }}>
        A constant-hue page of the real Munsell renotation data: value rises up the page, chroma
        grows to the right, and the ragged right edge is the real gamut of surface colours at this
        hue. Chips with dashed borders sit outside sRGB and are shown clamped. Click any chip to
        open it in the record panel; slide or step through all 40 hue pages above.
      </p>
    </div>
  );
}

/* ---------------- Colour wheel view ------------------------------ */
function WheelView({ selected, setSelected, activeBox, munsellJump }) {
  const size = 480, cx = size / 2, cy = size / 2;
  const rOut = 210, rIn = 118;
  const [harmony, setHarmony] = useState("complement");
  const [mode, setMode] = useState("ryb");
  useEffect(() => { if (munsellJump) setMode("munsell"); }, [munsellJump]);
  const [selIdx, setSelIdx] = useState(null);
  const [nudge, setNudge] = useState(0);
  const [neutral, setNeutral] = useState(0);
  const [valAdj, setValAdj] = useState(0);
  const [darkWith, setDarkWith] = useState("complement");

  const pick = (i) => {
    setSelIdx(i);
    setNudge(0); setNeutral(0); setValAdj(0);
  };
  const reset = () => { setNudge(0); setNeutral(0); setValAdj(0); };

  const base = selIdx == null ? null : RYB[selIdx];
  const compIdx = selIdx == null ? null : (selIdx + 6) % 12;
  const leftIdx = selIdx == null ? null : (selIdx + 11) % 12;
  const rightIdx = selIdx == null ? null : (selIdx + 1) % 12;

  const working = useMemo(() => {
    if (selIdx == null) return null;
    const comp = RYB[compIdx].hex;
    const neighbour = RYB[nudge >= 0 ? rightIdx : leftIdx].hex;
    const wn = Math.abs(nudge) / 200;
    let parts = [[base.hex, 1 - wn], [neighbour, wn]];
    const wc = neutral / 200;
    if (wc > 0) parts = parts.map(([h, w]) => [h, w * (1 - wc)]).concat([[comp, wc]]);
    const wv = Math.abs(valAdj) / 130;
    if (valAdj > 0) parts = parts.concat([[ZHEX.white, wv]]);
    if (valAdj < 0) {
      if (darkWith === "black") parts = parts.concat([[ZHEX.black, wv]]);
      else parts = parts.concat([[comp, wv * 0.8], [ZHEX.black, wv * 0.3]]);
    }
    return mixMulti(parts);
  }, [selIdx, compIdx, leftIdx, rightIdx, nudge, neutral, valAdj, darkWith, base]);

  /* Depend on the value only: setSelected is an inline prop that changes
     identity every App render, and re-firing on it clobbers selections
     made elsewhere (saved-palette preview, Munsell chip clicks). */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (working) setSelected(working); }, [working]);

  const lab = working ? rgbToLab(...hexToRgb(working)) : null;
  const chroma = lab ? Math.hypot(lab[1], lab[2]) : 0;
  const value = lab ? lab[0] / 10 : 0;
  const near = working ? nearestPaint(working, activeBox) : null;
  const chromaWord = chroma < 8 ? "neutralised" : chroma < 25 ? "muted" : "full voice";

  const segPath = (i) => {
    const a0 = ((i * 30 - 105) * Math.PI) / 180;
    const a1 = ((i * 30 - 75) * Math.PI) / 180;
    const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(rOut, a0), [x1, y1] = p(rOut, a1);
    const [x2, y2] = p(rIn, a1), [x3, y3] = p(rIn, a0);
    return `M${x0},${y0} A${rOut},${rOut} 0 0 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 0 0 ${x3},${y3} Z`;
  };
  const mid = (i, r) => {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const related = selIdx == null ? [] : HARMONIES[harmony].offsets.map((o) => (selIdx + o) % 12);
  const ladder = selIdx == null ? [] :
    Array.from({ length: 9 }, (_, i) => mixMulti([[base.hex, 1 - i / 16], [RYB[compIdx].hex, i / 16]]));

  const sliderRow = (label, min, max, val, onChange, leftCap, rightCap) => (
    <div style={{ margin: "12px 0 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: T.ochre, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: T.faint, width: 74, textAlign: "right", flexShrink: 0 }}>{leftCap}</span>
        <input type="range" min={min} max={max} step="1" value={val} aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: T.ochre }} />
        <span style={{ fontSize: 10, color: T.faint, width: 74, flexShrink: 0 }}>{rightCap}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["ryb", "RYB wheel"], ["munsell", "Munsell pages"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k} style={{
            padding: "6px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            background: mode === k ? T.ochre : "transparent",
            color: mode === k ? T.ground : T.muted,
            border: `1px solid ${mode === k ? T.ochre : T.line}`,
            borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
          }}>
            {lbl}
          </button>
        ))}
      </div>
      {mode === "munsell" ? (
        <MunsellExplorer onPick={(h) => setSelected(h)} jump={munsellJump} activeBox={activeBox} />
      ) : (
      <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(HARMONIES).map(([k, h]) => (
          <button key={k} onClick={() => setHarmony(k)} style={{
            padding: "5px 12px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            background: harmony === k ? h.color : "transparent",
            color: harmony === k ? T.ground : T.muted,
            border: `1px solid ${harmony === k ? h.color : T.line}`,
            borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
          }}>
            {h.label}
          </button>
        ))}
        <Tip text={'Palette-planning relationships: the complement sits opposite and cancels; split-complements soften that chord; analogous neighbours stay harmonious; a triad balances three hues.'} side="bottom" />
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}>
        {selIdx != null &&
          related.map((ri) => {
            const [x1, y1] = mid(selIdx, (rOut + rIn) / 2);
            const [x2, y2] = mid(ri, (rOut + rIn) / 2);
            return (
              <line key={ri} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={HARMONIES[harmony].color} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.85" />
            );
          })}
        {RYB.map((h, i) => {
          const isSel = i === selIdx, isRel = related.includes(i);
          return (
            <path key={i} d={segPath(i)} fill={h.hex} stroke={T.ground}
              strokeWidth={isSel ? 0 : 2}
              opacity={selIdx == null || isSel || isRel ? 1 : 0.35}
              style={{ cursor: "pointer", transition: "opacity .25s" }}
              tabIndex={0}
              role="button"
              aria-label={`${h.name}${isSel ? ", selected" : ""}`}
              aria-pressed={isSel}
              onClick={() => pick(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); }
              }}>
              <title>{h.name}</title>
            </path>
          );
        })}
        {selIdx != null && (
          <path d={segPath(selIdx)} fill="none" stroke={T.bone} strokeWidth="3" pointerEvents="none" />
        )}
        {related.map((ri) => (
          <path key={"r" + ri} d={segPath(ri)} fill="none"
            stroke={HARMONIES[harmony].color} strokeWidth="2.5" pointerEvents="none" />
        ))}
        {working && (
          <circle cx={cx} cy={cy} r={rIn - 16} fill={working} stroke={T.line} strokeWidth="1.5" />
        )}
        <text x={cx} y={cy - 6} textAnchor="middle"
          fill={working ? (value > 5.5 ? "#1B1512" : "#EDE4D3") : T.muted}
          style={{ fontSize: 13, letterSpacing: 3, textTransform: "uppercase" }}>
          {selIdx != null ? RYB[selIdx].name : "RYB Wheel"}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle"
          fill={working ? (value > 5.5 ? "#3D3527" : "#9C8F78") : T.faint}
          style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          {working ? working : "12 hues \u00b7 click to explore"}
        </text>
      </svg>

      {selIdx == null ? (
        <p style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
          The traditional red, yellow and blue wheel used for palette planning. Click a hue to open
          the mixing lab: nudge its temperature along the wheel, cancel its chroma with the
          complement opposite, and take it up or down in value. The centre of the wheel shows the
          working mix live.
        </p>
      ) : (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre }}>
              Mixing lab
            </div>
            <button onClick={reset} style={{
              fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
              background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 3,
              padding: "3px 10px", cursor: "pointer", fontFamily: "inherit",
            }}>
              Reset
            </button>
          </div>

          {sliderRow("Hue \u00b7 lean along the wheel", -100, 100, nudge, setNudge,
            RYB[leftIdx].name, RYB[rightIdx].name)}
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5 }}>
            Temperature nudges come from the neighbouring spokes, not from new tubes. Local colour
            rarely sits exactly on a spoke; lean it warm or cool.
          </div>

          {sliderRow("Chroma \u00b7 cancel with the complement", 0, 100, neutral, setNeutral,
            "full chroma", `toward ${RYB[compIdx].name}`)}
          <div style={{ display: "flex", gap: 4, margin: "6px 0 4px" }}>
            {ladder.map((h, i) => (
              <button key={i} onClick={() => setNeutral(Math.round((i * 100) / 8))} title={h} style={{
                flex: 1, height: 26, background: h, cursor: "pointer", padding: 0,
                border: `1px solid ${Math.round((i * 100) / 8) === neutral ? T.bone : T.line}`,
                borderRadius: 2,
              }} />
            ))}
          </div>
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5 }}>
            Opposites cancel: mixing toward {RYB[compIdx].name} pulls {RYB[selIdx].name} to a
            neutral grey while barely moving its value. This is how a colour is quietened without
            mud, and why the complement is the first tool for greying a note that shouts.
          </div>

          {sliderRow("Value \u00b7 shade and tint", -100, 100, valAdj, setValAdj,
            "toward dark", "toward white")}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase" }}>Darken</span>
            {["complement", "black"].map((m) => (
              <button key={m} onClick={() => setDarkWith(m)} style={{
                padding: "3px 10px", fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
                background: darkWith === m ? T.bone : "transparent",
                color: darkWith === m ? T.ground : T.muted,
                border: `1px solid ${darkWith === m ? T.bone : T.line}`,
                borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
              }}>
                with {m}
              </button>
            ))}
          </div>
          <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>
            Tints are white; shadows are a choice. Black drags chroma down with the value and can
            deaden a passage; darkening with the complement keeps the dark alive. Flick between
            the two at the same slider position and watch the chroma reading.
          </div>

          <div style={{
            display: "flex", gap: 14, alignItems: "center", marginTop: 14,
            background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 12,
          }}>
            <div style={{
              width: 62, height: 62, borderRadius: 6, background: working,
              border: `1px solid ${T.line}`, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 15, color: T.bone }}>{working}</div>
              <div className="mono" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                Munsell ≈ {labToMunsell(lab)} · Value {value.toFixed(1)} · Chroma {chroma.toFixed(0)} ({chromaWord})
              </div>
              {near && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: near.x, border: `1px solid ${T.line}` }} />
                  <span style={{ fontSize: 11, color: T.muted }}>
                    nearest tube {near.n} ({near.m}) · <span className="mono">ΔE {near.dE.toFixed(1)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>
            The full record for the working mix, with paint matches and a mixing recommendation,
            is in the panel alongside. Mixes use the Kubelka-Munk pigment model, which is why
            complements genuinely neutralise here and darkening with black behaves like paint.
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

export { WheelView };
