import { useMemo, useState } from "react";
import { T, SectionRule, Tip } from "./ui.jsx";
import { computeRecord, paintPool } from "../color/paints.js";
import { buildLadder, bestRung, bestCorrection } from "../color/mixlab.js";
import { hexToRgb, rgbToLab, deltaE2000 } from "../color/math.js";
/* ---------------- Colour record --------------------------------- */
function useColorRecord(hex, activeBox, calib) {
  return useMemo(() => (hex ? computeRecord(hex, activeBox, calib) : null), [hex, activeBox, calib]);
}
function dELabel(dE) {
  if (dE < 3) return { t: "excellent match", c: "#4DB6AC" };
  if (dE < 6) return { t: "close, adjust slightly", c: T.ochre };
  if (dE < 12) return { t: "base for a mixture", c: "#C9962E" };
  return { t: "mixing required", c: T.vermilionSoft };
}
const TINT_ROUTE = {
  mid: "Closest at its mid tint — begin near equal paint and white.",
  pale: "Closest at its pale tint — a little paint in plenty of white.",
};

/* The graded ladder: one recommended mix as physical piles at fixed
   ratios, each rung with its predicted colour, Munsell notation and
   distance to target. */
function MixLadder({ source, adjuster, targetLab }) {
  const ladder = useMemo(
    () => buildLadder(source.x, adjuster.x, targetLab),
    [source.x, adjuster.x, targetLab]
  );
  const best = bestRung(ladder);
  return (
    <div>
      <div style={{ fontSize: 12, color: T.bone, margin: "10px 0 8px", lineHeight: 1.5 }}>
        {source.n}
        {source.m && <span style={{ color: T.faint }}> ({source.m})</span>}
        <span style={{ color: T.muted }}> stepped toward </span>
        {adjuster.n}
        {adjuster.m && <span style={{ color: T.faint }}> ({adjuster.m})</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ladder.map((step) => (
          <div key={step.ratio} style={{
            width: 66, borderRadius: 4, overflow: "hidden",
            border: `1px solid ${step === best ? T.ochre : T.line}`,
          }}>
            <div style={{ height: 34, background: step.hex, position: "relative" }}>
              {step === best && (
                <span style={{
                  position: "absolute", top: 2, right: 3, fontSize: 8, letterSpacing: 1,
                  color: rgbToLab(...hexToRgb(step.hex))[0] > 55 ? T.ground : T.bone,
                }}>
                  BEST
                </span>
              )}
            </div>
            <div style={{ padding: "4px 5px 5px", background: T.panel }}>
              <div className="mono" style={{ fontSize: 11, color: T.bone }}>{step.ratio}</div>
              <div style={{ fontSize: 9, color: T.muted }}>{step.label}</div>
              <div className="mono" style={{ fontSize: 8, color: T.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {step.munsell}
              </div>
              <div className="mono" style={{ fontSize: 9, color: step === best ? T.ochre : T.muted }}>
                ΔE {step.dE.toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ color: T.faint, fontSize: 11, lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>
        Lay these out as separate piles on the palette; the marked rung is the closest predicted
        landing. Ratios are {source.n} : {adjuster.n} by volume.
      </div>
    </div>
  );
}

/* The observe-correct loop. Recording what actually came off the
   palette makes that observation the new mixing source; the best
   single addition from the working pool is searched out and the
   ladder re-graded from reality instead of prediction. Keyed on the
   target hex by the caller, so state resets when the target moves. */
function MixLab({ rec, activeBox, calib, mixLog, onRecordMix, onClearMixLog }) {
  const [sample, setSample] = useState(rec.hex);
  const [obsHex, setObsHex] = useState(null);
  const pool = useMemo(() => paintPool(activeBox, calib), [activeBox, calib]);
  const correction = useMemo(
    () => (obsHex ? bestCorrection(obsHex, rec.lab, pool) : null),
    [obsHex, rec.lab, pool]
  );
  const source = obsHex
    ? { x: obsHex, n: "Your palette sample", m: null }
    : rec.mix ? rec.mix.a : rec.matches[0];
  const adjuster = obsHex ? (correction && correction.paint) : rec.mix ? rec.mix.b : null;
  const record = () => {
    const mixed = sample.toUpperCase();
    onRecordMix({
      id: Date.now(),
      target: rec.hex.toUpperCase(),
      mixed,
      dE: deltaE2000(rec.lab, rgbToLab(...hexToRgb(mixed))),
      at: new Date().toISOString(),
    });
    setObsHex(mixed);
  };
  return (
    <div>
      {adjuster && (
        <div>
          <SectionRule>Mixing ladder<Tip text={"Seven piles from straight source to 1:4, each with its Kubelka-Munk predicted colour, Munsell notation and ΔE to the target. Mix the marked rung first, then walk a rung either way on the palette."} /></SectionRule>
          <MixLadder source={source} adjuster={adjuster} targetLab={rec.lab} />
        </div>
      )}
      <SectionRule>I mixed this<Tip text={"After mixing, match this swatch to the pile on your palette (or sample a photo of it). The observation becomes the new starting point and the app searches your paints for the best single addition to close the remaining gap."} /></SectionRule>
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0 4px" }}>
        <input type="color" value={sample} aria-label="Colour you actually mixed"
          onChange={(e) => setSample(e.target.value)}
          style={{ width: 44, height: 34, padding: 0, border: `1px solid ${T.line}`, borderRadius: 4, background: T.ground, cursor: "pointer" }} />
        <span className="mono" style={{ fontSize: 12, color: T.muted }}>{sample.toUpperCase()}</span>
        <button onClick={record} style={{
          marginLeft: "auto", fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
          color: T.ochre, background: "transparent", border: `1px solid ${T.ochre}`,
          borderRadius: 3, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit",
        }}>
          Record mix
        </button>
      </div>
      {obsHex && (
        <div style={{
          marginTop: 6, fontSize: 12, color: T.bone, background: T.panel,
          border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.ochre}`,
          padding: "8px 10px", borderRadius: 3, lineHeight: 1.55,
        }}>
          {correction ? (
            <span>
              Correcting from your sample: add {correction.paint.n}
              <span style={{ color: T.faint }}> ({correction.paint.m})</span> at {correction.ratio} —
              predicted ΔE {correction.dE.toFixed(1)}. The ladder above now walks that addition.
            </span>
          ) : (
            <span>Recorded. No corrective tube found in the current pool.</span>
          )}
          <button onClick={() => setObsHex(null)} style={{
            display: "block", marginTop: 6, fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
            color: T.faint, background: "transparent", border: `1px dashed ${T.line}`,
            borderRadius: 3, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit",
          }}>
            Back to the recommendation
          </button>
        </div>
      )}
      {mixLog.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: T.faint }}>
              Recent observations
            </span>
            <button onClick={onClearMixLog} style={{
              fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
              background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 3,
              padding: "3px 7px", cursor: "pointer", fontFamily: "inherit",
            }}>
              Clear
            </button>
          </div>
          {mixLog.slice(0, 5).map((o) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.line}` }}>
              <span title={`Target ${o.target}`} style={{ width: 18, height: 18, borderRadius: 3, background: o.target, border: `1px solid ${T.line}`, flexShrink: 0 }} />
              <span style={{ color: T.faint, fontSize: 11 }}>→</span>
              <span title={`Mixed ${o.mixed}`} style={{ width: 18, height: 18, borderRadius: 3, background: o.mixed, border: `1px solid ${T.line}`, flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 10, color: T.muted, flex: 1 }}>{o.mixed}</span>
              <span className="mono" style={{ fontSize: 10, color: o.dE < 3 ? "#4DB6AC" : T.muted }}>ΔE {o.dE.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorRecord({ hex, sourceLabel, onSave, activeBox, calib, mixLog, onRecordMix, onClearMixLog, onOpenMunsell }) {
  const rec = useColorRecord(hex, activeBox, calib);
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
            {onOpenMunsell && !rec.munsell.startsWith("N ") && (
              <button onClick={() => onOpenMunsell(rec.munsell)} style={{
                display: "block", marginTop: 5, background: "transparent", border: "none",
                color: T.ochre, fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
                cursor: "pointer", padding: 0, fontFamily: "inherit", textDecoration: "underline",
              }}>
                View hue page {"→"}
              </button>
            )}
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

      <SectionRule>Nearest oil paints<Tip text={"ΔE is CIEDE2000 perceptual difference: under 2 barely distinguishable, under 6 close, over 12 needs mixing. O/SO/ST/T = opaque to transparent; Series is the maker's price band. Calibrated tubes match against your measured masstone and tints."} /></SectionRule>
      {activeBox && (
        <div style={{ fontSize: 10, color: T.ochre, marginTop: 6, letterSpacing: 0.5 }}>
          Matching your paintbox · {activeBox.size} tubes
        </div>
      )}
      {rec.matches.map((m, i) => {
        const q = dELabel(m.dE);
        return (
          <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 4, background: m.matchX || m.x,
                border: `1px solid ${T.line}`, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.bone, fontSize: 14, fontWeight: 600 }}>
                  {m.n}
                  {m.calibrated && (
                    <span style={{
                      marginLeft: 6, fontSize: 8, letterSpacing: 1, textTransform: "uppercase",
                      color: T.ochre, border: `1px solid ${T.ochre}`, borderRadius: 2,
                      padding: "1px 4px", verticalAlign: "2px",
                    }}>
                      Personal
                    </span>
                  )}
                </div>
                <div style={{ color: T.muted, fontSize: 12 }}>
                  {m.m} · <span className="mono">{m.p}</span> · {m.o} · Series {m.s}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="mono" style={{ color: T.bone, fontSize: 13 }}>ΔE {m.dE.toFixed(1)}</div>
                <div style={{ color: q.c, fontSize: 10, letterSpacing: 0.5 }}>{q.t}</div>
              </div>
            </div>
            {TINT_ROUTE[m.matchType] && (
              <div style={{ color: T.ochre, fontSize: 11, marginTop: 4, paddingLeft: 52 }}>
                {TINT_ROUTE[m.matchType]}
              </div>
            )}
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

      {onRecordMix && (
        <MixLab key={rec.hex} rec={rec} activeBox={activeBox} calib={calib}
          mixLog={mixLog || []} onRecordMix={onRecordMix} onClearMixLog={onClearMixLog} />
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
