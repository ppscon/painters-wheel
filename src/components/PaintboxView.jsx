import { T } from "./ui.jsx";
import { PAINTS } from "../color/paints.js";
/* ---------------- Paintbox ---------------------------------------- */
const MAKERS = [...new Set(PAINTS.map((p) => p.m))];
function PaintboxView({ box, setBox, boxOnly, setBoxOnly }) {
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
                      width: 22, height: 22, borderRadius: 3, background: p.x,
                      border: `1px solid ${T.line}`, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", color: on ? T.bone : T.muted, fontSize: 12, lineHeight: 1.25 }}>
                        {p.n}
                      </span>
                      <span className="mono" style={{ display: "block", color: T.faint, fontSize: 9 }}>
                        {p.p} · Series {p.s}
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
