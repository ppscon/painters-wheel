import { useMemo, useState } from "react";
import { T, SectionRule } from "./ui.jsx";
import { computeRecord } from "../color/paints.js";

/* ---------------- Shopping list ----------------------------------- */
/* Turns the Your Canvas analysis (dominant clusters + your pins) into
   the tubes needed to paint the image: each colour resolves to either
   its best single tube or the two components of its best mix, then the
   paints aggregate into a de-duplicated list split into ones you
   already own (Paintbox ticks) and ones to buy. */
function buildList(targets, box) {
  const byKey = new Map();
  const add = (paint, target, role, dE) => {
    const key = paint.m + "::" + paint.n;
    if (!byKey.has(key)) byKey.set(key, { key, paint, uses: [] });
    byKey.get(key).uses.push({ target, role, dE });
  };
  for (const t of targets) {
    const rec = computeRecord(t.hex, null);
    const direct = rec.matches[0];
    if (rec.mix && rec.mix.dE + 0.5 < direct.dE) {
      add(rec.mix.a, t, `mix ${rec.mix.ratio}`, rec.mix.dE);
      add(rec.mix.b, t, `mix ${rec.mix.ratio}`, rec.mix.dE);
    } else {
      add(direct, t, "straight tube", direct.dE);
    }
  }
  const all = [...byKey.values()].sort((a, b) => b.uses.length - a.uses.length);
  return {
    toBuy: all.filter((e) => !box.has(e.key)),
    owned: all.filter((e) => box.has(e.key)),
  };
}

function PaintRow({ entry, ticked, onTick }) {
  const { paint, uses } = entry;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
      borderBottom: `1px solid ${T.line}`, opacity: ticked ? 0.45 : 1,
    }}>
      <button onClick={onTick} aria-pressed={ticked}
        aria-label={`${ticked ? "Untick" : "Tick off"} ${paint.n}`} style={{
          width: 22, height: 22, borderRadius: 3, flexShrink: 0, marginTop: 2,
          background: ticked ? T.ochre : "transparent", color: T.ground,
          border: `1px solid ${ticked ? T.ochre : T.line}`, cursor: "pointer",
          fontSize: 13, lineHeight: 1, fontFamily: "inherit",
        }}>
        {ticked ? "✓" : ""}
      </button>
      <span style={{
        width: 30, height: 30, borderRadius: 3, background: paint.x,
        border: `1px solid ${T.line}`, flexShrink: 0,
      }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: T.bone, fontSize: 13, textDecoration: ticked ? "line-through" : "none" }}>
          {paint.n}
        </span>
        <span className="mono" style={{ display: "block", color: T.faint, fontSize: 10 }}>
          {paint.m} · {paint.p} · Series {paint.s}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
          {uses.map((u, i) => (
            <span key={i} title={`${u.target.label} · ${u.role} · ΔE ${u.dE.toFixed(1)}`} style={{
              width: 16, height: 16, borderRadius: 2, background: u.target.hex,
              border: `1px solid ${T.line}`, display: "inline-block",
            }} />
          ))}
          <span style={{ fontSize: 10, color: T.faint }}>
            {uses.length} colour{uses.length > 1 ? "s" : ""} in your image
          </span>
        </span>
      </span>
    </div>
  );
}

function ShoppingListView({ targets, name, ticked, box, onToggleTick }) {
  const [copied, setCopied] = useState(false);
  const tickedSet = useMemo(() => new Set(ticked), [ticked]);
  const list = useMemo(() => buildList(targets, box), [targets, box]);
  const copyList = () => {
    const lines = list.toBuy.map((e) => `${e.paint.n} — ${e.paint.m} (${e.paint.p}, Series ${e.paint.s})`);
    const text = `Paint shopping list${name ? ` — ${name}` : ""}\n${lines.join("\n")}`;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => window.prompt("Copy your shopping list:", text));
    } else {
      window.prompt("Copy your shopping list:", text);
    }
  };
  return (
    <div>
      <div className="display" style={{ fontSize: 22, color: T.bone }}>Shopping List</div>
      <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
        {name ? `The tubes needed to paint ${name}` : "The tubes needed to paint your image"}
      </div>
      {targets.length === 0 ? (
        <div style={{
          border: `1px dashed ${T.line}`, borderRadius: 6, padding: "70px 24px",
          textAlign: "center", color: T.faint, fontStyle: "italic", lineHeight: 1.7, marginTop: 14,
        }}>
          Nothing to shop for yet. Load an image in Your Canvas — its dominant colours (and any pins
          you drop) become the list of paints needed here.
        </div>
      ) : (
        <div>
          <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, marginTop: 10 }}>
            Each colour in your analysis resolves to its best single tube, or to the two components
            of its best Kubelka-Munk mix when no tube is close enough. Tubes you have ticked in the
            Paintbox appear under "already in your paintbox". Hover a small swatch to see which
            colour a paint covers and how closely.
          </p>
          <SectionRule>To buy · {list.toBuy.length} tube{list.toBuy.length === 1 ? "" : "s"}</SectionRule>
          {list.toBuy.length === 0 ? (
            <p style={{ color: T.faint, fontSize: 12, fontStyle: "italic", marginTop: 8 }}>
              Nothing to buy — your paintbox already covers every colour in the analysis.
            </p>
          ) : (
            <div>
              {list.toBuy.map((e) => (
                <PaintRow key={e.key} entry={e} ticked={tickedSet.has(e.key)} onTick={() => onToggleTick(e.key)} />
              ))}
              <button onClick={copyList} style={{
                marginTop: 12, padding: "8px 16px", fontSize: 11, letterSpacing: 1.5,
                textTransform: "uppercase", background: "transparent", color: T.ochre,
                border: `1px solid ${T.ochre}`, borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
              }}>
                {copied ? "Copied!" : "Copy list"}
              </button>
            </div>
          )}
          {list.owned.length > 0 && (
            <div>
              <SectionRule>Already in your paintbox · {list.owned.length}</SectionRule>
              {list.owned.map((e) => (
                <PaintRow key={e.key} entry={e} ticked={true} onTick={() => {}} />
              ))}
            </div>
          )}
          <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.6, marginTop: 14 }}>
            Tick tubes off as you buy them — the list and your ticks are saved in this browser and
            survive reloads. Analysing a new picture in Your Canvas replaces the list and resets
            the ticks.
          </p>
        </div>
      )}
    </div>
  );
}

export { ShoppingListView };
