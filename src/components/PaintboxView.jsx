import { useState, useEffect } from "react";
import { T, Tip } from "./ui.jsx";
import { PAINTS } from "../color/paints.js";
import { calibrationDefaults } from "../color/mixlab.js";
import { hexToRgb, rgbToLab } from "../color/math.js";
import { labToMunsell } from "../color/munsell.js";
/* ---------------- Paintbox ---------------------------------------- */
const MAKERS = [...new Set(PAINTS.map((p) => p.m))];

const CAL_FIELDS = [
  ["masstone", "Masstone", "Paint straight from the tube"],
  ["midTint", "Mid tint", "Roughly equal paint and white"],
  ["paleTint", "Pale tint", "A small amount of paint in white"],
];

/* Calibrate an owned tube against reality: what its masstone and two
   standard tints actually look like, rather than the catalogue
   approximation. Matching then tests all three swatches and mixing
   starts from the real masstone. */
function TubeCalibration({ box, calib, setCalib }) {
  const owned = PAINTS.filter((p) => box.has(p.m + "::" + p.n));
  const [selKey, setSelKey] = useState("");
  const sel = owned.find((p) => p.m + "::" + p.n === selKey) || null;
  const [sw, setSw] = useState(null);
  useEffect(() => {
    setSw(sel ? { ...(calib[selKey] || calibrationDefaults(sel.x)) } : null);
    // Reseed only when the selection changes; a mid-edit calib update
    // (e.g. a sync pull) must not clobber unsaved swatches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);
  const save = () => {
    setCalib({
      ...calib,
      [selKey]: {
        masstone: sw.masstone.toUpperCase(),
        midTint: sw.midTint.toUpperCase(),
        paleTint: sw.paleTint.toUpperCase(),
        updatedAt: new Date().toISOString(),
      },
    });
  };
  const reset = () => {
    const next = { ...calib };
    delete next[selKey];
    setCalib(next);
    setSw(calibrationDefaults(sel.x));
  };
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 14, marginTop: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre }}>
        Tube calibration
        <Tip text="Squeeze out the tube, mix its two tints with titanium white, then adjust each swatch until it matches what is on your palette (a phone photo helps). Matching across the app then answers with your paint, not the catalogue, and tells you which dilution to start from." side="bottom" />
      </div>
      <p style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, margin: "8px 0 10px" }}>
        Teach the app what your tubes really do. {Object.keys(calib).length > 0 && (
          <span className="mono">{Object.keys(calib).length} calibrated.</span>
        )}
      </p>
      {owned.length === 0 ? (
        <div style={{ color: T.faint, fontSize: 12, fontStyle: "italic" }}>
          Tick the tubes you own below first — calibration applies to your own paints.
        </div>
      ) : (
        <div>
          <select value={selKey} onChange={(e) => setSelKey(e.target.value)}
            aria-label="Choose a tube to calibrate" style={{
              width: "100%", boxSizing: "border-box", fontSize: 12, background: T.ground,
              color: T.bone, border: `1px solid ${T.line}`, borderRadius: 3,
              padding: "8px 10px", fontFamily: "inherit",
            }}>
            <option value="">Choose a tube…</option>
            {owned.map((p) => {
              const key = p.m + "::" + p.n;
              return (
                <option key={key} value={key}>
                  {p.n} · {p.m}{calib[key] ? " ✓" : ""}
                </option>
              );
            })}
          </select>
          {sel && sw && (
            <div style={{ marginTop: 10 }}>
              {CAL_FIELDS.map(([field, label, hint]) => (
                <div key={field} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.line}` }}>
                  <input type="color" value={sw[field].toLowerCase()} aria-label={`${label} swatch for ${sel.n}`}
                    onChange={(e) => setSw({ ...sw, [field]: e.target.value.toUpperCase() })}
                    style={{ width: 40, height: 32, padding: 0, border: `1px solid ${T.line}`, borderRadius: 4, background: T.ground, cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.bone, fontSize: 12 }}>{label}</div>
                    <div style={{ color: T.faint, fontSize: 10 }}>{hint}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>
                    {labToMunsell(rgbToLab(...hexToRgb(sw[field])))}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={save} style={{
                  fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.ochre,
                  background: "transparent", border: `1px solid ${T.ochre}`, borderRadius: 3,
                  padding: "6px 10px", cursor: "pointer", fontFamily: "inherit",
                }}>
                  Save calibration
                </button>
                {calib[selKey] && (
                  <button onClick={reset} style={{
                    fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
                    background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 3,
                    padding: "6px 10px", cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Remove — back to catalogue
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaintboxView({ box, setBox, boxOnly, setBoxOnly, calib, setCalib }) {
  const toggle = (key) =>
    setBox((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  const setMaker = (maker, on) =>
    setBox((prev) => {
      const n = new Set(prev);
      for (const p of PAINTS) {
        if (p.m === maker) {
          const k = p.m + "::" + p.n;
          if (on) n.add(k); else n.delete(k);
        }
      }
      return n;
    });
  const active = boxOnly && box.size >= 2;
  return (
    <div>
      <div className="display" style={{ fontSize: 22, color: T.bone }}>My Paintbox</div>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, margin: "8px 0 14px" }}>
        Tick the tubes you actually own. With restriction switched on, every paint match, mixing
        recommendation and nearest-tube readout across the whole app searches only your box, so
        the advice is always something you can reach for. Your selection is saved in this
        browser.
      </p>

      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 12,
      }}>
        {[[false, "Match all paints"], [true, "Match my paintbox"]].map(([v, lbl]) => (
          <button key={lbl} onClick={() => setBoxOnly(v)} style={{
            padding: "7px 14px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
            background: boxOnly === v ? T.ochre : "transparent",
            color: boxOnly === v ? T.ground : T.muted,
            border: `1px solid ${boxOnly === v ? T.ochre : T.line}`,
            borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
          }}>
            {lbl}
          </button>
        ))}
        <span className="mono" style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>
          {box.size} of {PAINTS.length} tubes
        </span>
      </div>
      {boxOnly && box.size < 2 && (
        <div style={{
          marginTop: 8, fontSize: 12, color: T.bone, background: T.panel,
          border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.vermilion}`,
          padding: "8px 10px", borderRadius: 3, lineHeight: 1.5,
        }}>
          Add at least two tubes to activate the restriction; until then matching falls back to
          the full database.
        </div>
      )}
      {active && (
        <div style={{ marginTop: 8, fontSize: 11, color: T.ochre, letterSpacing: 0.5 }}>
          Restriction active: matches everywhere now come from your {box.size} tubes.
        </div>
      )}

      <TubeCalibration box={box} calib={calib} setCalib={setCalib} />

      {MAKERS.map((maker) => {
        const paints = PAINTS.filter((p) => p.m === maker);
        const owned = paints.filter((p) => box.has(p.m + "::" + p.n)).length;
        return (
          <div key={maker} style={{ marginTop: 18 }}>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 10,
              borderBottom: `1px solid ${T.line}`, paddingBottom: 6,
            }}>
              <span style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.muted }}>
                {maker}
              </span>
              <span className="mono" style={{ fontSize: 10, color: T.faint }}>{owned}/{paints.length}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => setMaker(maker, true)} style={{
                  fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
                  background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 3,
                  padding: "2px 8px", cursor: "pointer", fontFamily: "inherit",
                }}>All</button>
                <button onClick={() => setMaker(maker, false)} style={{
                  fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
                  background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 3,
                  padding: "2px 8px", cursor: "pointer", fontFamily: "inherit",
                }}>None</button>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 6, marginTop: 8 }}>
              {paints.map((p) => {
                const key = p.m + "::" + p.n;
                const on = box.has(key);
                return (
                  <button key={key} onClick={() => toggle(key)} aria-pressed={on}
                    aria-label={`${p.n}, ${p.m}${on ? ", in your paintbox" : ""}`} style={{
                    display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                    padding: "7px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                    background: on ? T.panel2 : "transparent",
                    border: `1px solid ${on ? T.ochre : T.line}`,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 3,
                      background: calib[key] ? calib[key].masstone : p.x,
                      border: `1px solid ${T.line}`, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", color: on ? T.bone : T.muted, fontSize: 12, lineHeight: 1.25 }}>
                        {p.n}
                      </span>
                      <span className="mono" style={{ display: "block", color: T.faint, fontSize: 9 }}>
                        {p.p} · Series {p.s}{calib[key] ? " · " : ""}
                        {calib[key] && <span style={{ color: T.ochre }}>calibrated</span>}
                      </span>
                    </span>
                    <span style={{ color: on ? T.ochre : T.line, fontSize: 13, flexShrink: 0 }}>
                      {on ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PaintboxView };
