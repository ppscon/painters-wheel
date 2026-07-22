import { useMemo, useRef } from "react";
import { T, SectionRule } from "./ui.jsx";
import { computeRecord, PAINT_LABS } from "../color/paints.js";
import { buildLadder, bestRung, bestCorrection, calibrationDefaults } from "../color/mixlab.js";
import { hexToRgb, rgbToLab, deltaE2000 } from "../color/math.js";

/* ---------------- Guide ------------------------------------------
   The full manual: every tool, its purpose and how to use it. All
   example numbers (matches, ladder rungs, the correction, calibration
   seeds) are computed live by the same engine the app runs on, so the
   guide can never drift from what the app actually does. */

const EX_TARGET = "#C08A5A"; // a warm flesh half-tone
const EX_OBSERVED = "#B47747"; // "what came off the palette" in the worked example
const EX_CAL_TUBE = "#7A3B22"; // W&N Burnt Sienna masstone

const SECTIONS = [
  ["record", "Colour record"],
  ["mixlab", "Mix Lab"],
  ["tabs", "The six tabs"],
  ["calibration", "Calibration"],
  ["sync", "Sync & data"],
  ["numbers", "The numbers"],
];

function Swatch({ hex, size = 16 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: 3,
      background: hex, border: `1px solid ${T.line}`, verticalAlign: "-3px",
    }} />
  );
}

function P({ children, style }) {
  return (
    <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, margin: "8px 0", maxWidth: "70ch", ...style }}>
      {children}
    </p>
  );
}

function Steps({ items }) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
      {items.map((item, i) => (
        <li key={i} style={{
          display: "flex", gap: 12, padding: "8px 0", alignItems: "flex-start",
          borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none",
        }}>
          <span className="mono" style={{
            width: 24, height: 24, borderRadius: "50%", border: `1px solid ${T.ochre}`,
            color: T.ochre, fontSize: 12, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, marginTop: 2,
          }}>
            {i + 1}
          </span>
          <span style={{ color: T.muted, fontSize: 13, lineHeight: 1.65 }}>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Callout({ children }) {
  return (
    <div style={{
      margin: "12px 0", fontSize: 13, color: T.bone, background: T.panel,
      border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.ochre}`,
      padding: "10px 12px", borderRadius: 3, lineHeight: 1.65, maxWidth: "70ch",
    }}>
      {children}
    </div>
  );
}

function GuideView({ munsellLoaded }) {
  const topRef = useRef(null);
  /* Recomputed once the renotation data lands so notations resolve. */
  const ex = useMemo(() => {
    const rec = computeRecord(EX_TARGET, null);
    const ladder = rec.mix ? buildLadder(rec.mix.a.x, rec.mix.b.x, rec.lab) : null;
    return {
      rec,
      ladder,
      best: ladder ? bestRung(ladder) : null,
      obsDE: deltaE2000(rec.lab, rgbToLab(...hexToRgb(EX_OBSERVED))),
      corr: bestCorrection(EX_OBSERVED, rec.lab, PAINT_LABS),
      cal: calibrationDefaults(EX_CAL_TUBE),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [munsellLoaded]);

  const jump = (id) => {
    const el = topRef.current && topRef.current.querySelector(`[data-guide="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={topRef}>
      <div className="display" style={{ fontSize: 22, color: T.bone }}>How everything works</div>
      <P>
        Everything in the app feeds one loop: <strong style={{ color: T.bone }}>see a colour →
        understand it → mix it → check what you mixed</strong>. The wide panel holds the tab you
        are working in; the right-hand column is the colour record — a standing report on
        whatever colour you last touched, anywhere. Every example below is computed live by the
        app&#39;s own colour engine.
      </P>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" }}>
        {SECTIONS.map(([id, label]) => (
          <button key={id} onClick={() => jump(id)} style={{
            fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted,
            background: "transparent", border: `1px solid ${T.line}`, borderRadius: 3,
            padding: "6px 10px", cursor: "pointer", fontFamily: "inherit",
          }}>
            {label}
          </button>
        ))}
      </div>

      <div data-guide="record">
        <SectionRule>The colour record</SectionRule>
        <P>
          Every pinned or picked colour is reported four ways — hex, RGB, L*a*b* and Munsell
          notation, interpolated from the 2,734 measured renotation colours — followed by theory
          guidance (temperature, value zone, complement, chroma), the three nearest tubes from
          the 76-paint database, and, when no tube lands within ΔE 2.5, a two-paint mixing
          recommendation previewed with Kubelka-Munk pigment mixing.
        </P>
        <P>
          Example: for the flesh half-tone <Swatch hex={EX_TARGET} />{" "}
          <span className="mono" style={{ color: T.bone }}>{EX_TARGET}</span>{" "}
          <span className="mono">({ex.rec.munsell})</span>, the nearest tube is{" "}
          <strong style={{ color: T.bone }}>{ex.rec.matches[0].n}</strong> ({ex.rec.matches[0].m})
          at ΔE {ex.rec.matches[0].dE.toFixed(1)} — a base for a mixture, not a match — so the app
          recommends {ex.rec.mix ? (
            <span>
              <strong style={{ color: T.bone }}>{ex.rec.mix.a.n}</strong> with{" "}
              <strong style={{ color: T.bone }}>{ex.rec.mix.b.n}</strong> at {ex.rec.mix.ratio}{" "}
              <Swatch hex={ex.rec.mix.hex} />, ΔE {ex.rec.mix.dE.toFixed(1)}.
            </span>
          ) : "a mix."}
        </P>
        <P>
          Calibrated tubes (see below) match with a <span style={{ color: T.ochre }}>Personal</span>{" "}
          badge and may match at a tint instead of the masstone — the record then names the
          dilution route: <em>&#34;begin near equal paint and white&#34;</em>.
        </P>
      </div>

      <div data-guide="mixlab">
        <SectionRule>The Mix Lab: ladder and observation loop</SectionRule>
        <P>
          The recommended mix is spread into seven graded piles, from the untouched source
          through 8:1, 4:1, 2:1, 1:1, 1:2 to 1:4 — each with its predicted colour, Munsell
          notation and ΔE to target, best rung marked. Lay them out as separate physical piles;
          mix the marked rung first, and if it reads wrong against your painting, walk one rung
          either way.
        </P>
        {ex.ladder && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
            {ex.ladder.map((step) => (
              <div key={step.ratio} style={{
                width: 66, borderRadius: 4, overflow: "hidden",
                border: `1px solid ${step === ex.best ? T.ochre : T.line}`,
              }}>
                <div style={{ height: 30, background: step.hex }} />
                <div style={{ padding: "4px 6px 6px", background: T.panel }}>
                  <div className="mono" style={{ fontSize: 11, color: T.bone }}>{step.ratio}</div>
                  <div style={{ fontSize: 9, color: T.muted }}>{step.label}</div>
                  <div className="mono" style={{ fontSize: 8, color: T.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {step.munsell}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: step === ex.best ? T.ochre : T.muted }}>
                    ΔE {step.dE.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <P>
          Then close the loop. After mixing, open <strong style={{ color: T.bone }}>I mixed
          this</strong>, match the swatch to the pile on your palette (sampling a phone photo of
          the palette works well) and press Record mix. The observation is logged with its ΔE,
          and your real colour becomes the new mixing source: the app searches every tube in
          your pool at every ladder ratio for the single addition that closes the remaining gap,
          and the ladder re-grades from reality instead of prediction.
        </P>
        <P>
          The correction can also be held to <strong style={{ color: T.bone }}>one axis at a
          time</strong> — the classical order: value first, then hue, then chroma. Axis buttons
          appear once an observation is recorded, each showing how far off that dimension sits;
          the suggested first correction is marked. With an axis chosen, the search favours
          additions that move that dimension toward the target while barely disturbing the two
          held ones, and tells you when an axis is already aligned so you can move to the next.
        </P>
        <Callout>
          Worked example, computed live: chasing <Swatch hex={EX_TARGET} />{" "}
          <span className="mono">{EX_TARGET}</span> you mix{" "}
          <Swatch hex={EX_OBSERVED} /> <span className="mono">{EX_OBSERVED}</span> — darker and
          redder, ΔE {ex.obsDE.toFixed(1)} from target. Record it, and the correction search
          answers: {ex.corr ? (
            <span>
              add <strong>{ex.corr.paint.n}</strong> ({ex.corr.paint.m}) at {ex.corr.ratio} —
              predicted landing <Swatch hex={ex.corr.hex} />{" "}
              <span className="mono">{ex.corr.hex}</span>, ΔE {ex.corr.dE.toFixed(1)}. One
              addition instead of starting over.
            </span>
          ) : "no correction found."}
        </Callout>
      </div>

      <div data-guide="tabs">
        <SectionRule>The six tabs</SectionRule>
        <Steps items={[
          <span key="1"><strong style={{ color: T.bone }}>Lessons</strong> — four paintings teach contrast, value, hue and chroma. Hover for the loupe, click to pin (touch: hold, drag, lift; keyboard: arrows + Enter). Switch between colour, plain value and 3/5/9-step posterisation — the 3-step view is a notan — with the value histogram beneath. Ctrl+Z undoes pin changes; Share copies a link that reproduces your pins; Study sheet makes a printable page.</span>,
          <span key="2"><strong style={{ color: T.bone }}>Your Canvas</strong> — the same analysis on your own image. It stays in your browser, never uploaded. Adds automatic extraction of the eight dominant colour clusters, which feed the Shopping List.</span>,
          <span key="3"><strong style={{ color: T.bone }}>Colour Wheel</strong> — the RYB mixing lab: lean a hue warm or cool, cancel chroma toward the complement, compare darkening with black against darkening with the complement. The Munsell toggle opens all 40 constant-hue pages; the gamut overlay marks which chips your palette reaches straight from a tube, via a two-paint mix (ring), or not at all (dimmed).</span>,
          <span key="4"><strong style={{ color: T.bone }}>Zorn Palette</strong> — the four-tube portrait method proven live: derived earth tones with a tint slider, the grey-on-warm relativity demo, and the five-stage block-in walkthrough. Restrict your paintbox to the same four tubes and paint along.</span>,
          <span key="5"><strong style={{ color: T.bone }}>Paintbox</strong> — tick the tubes you own and switch Match my paintbox on (needs two tubes): every match, recommendation, correction and gamut readout then searches only your box. Tube calibration lives here too — next section.</span>,
          <span key="6"><strong style={{ color: T.bone }}>Shopping List</strong> — turns the analysed image into the tube list needed to paint it: each cluster and pin resolves to its best tube or the two components of its best mix, de-duplicated, with tubes you own listed separately. Ticks persist until you analyse a new image.</span>,
        ]} />
      </div>

      <div data-guide="calibration">
        <SectionRule>Tube calibration</SectionRule>
        <P>
          Catalogue swatches are approximations; calibration replaces them with your tube&#39;s
          reality at three dilutions. Squeeze out the tube, mix its two tints with titanium
          white, photograph the piles in daylight, then adjust each swatch until it matches —
          the live Munsell notation beside each helps judge value and chroma. The seeds below
          are the app&#39;s Kubelka-Munk predictions for a Winsor &amp; Newton Burnt Sienna:
        </P>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
          {[["Masstone", "straight from the tube", ex.cal.masstone],
            ["Mid tint", "equal paint and white", ex.cal.midTint],
            ["Pale tint", "a little paint in white", ex.cal.paleTint]].map(([t, d, hex]) => (
            <div key={t} style={{ flex: "1 1 130px", maxWidth: 190, border: `1px solid ${T.line}`, borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: 36, background: hex }} />
              <div style={{ padding: "6px 9px 8px", background: T.panel }}>
                <div style={{ fontSize: 12, color: T.bone, fontWeight: 600 }}>{t}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{d}</div>
                <div className="mono" style={{ fontSize: 9, color: T.faint }}>{hex}</div>
              </div>
            </div>
          ))}
        </div>
        <P>
          Once saved, matching and mixing everywhere use your measured masstone, and matches can
          land on a tint with the dilution route named. This matters most for dark transparent
          colours — an alizarin or burnt sienna masstone reads nearly black on screen, so it is
          the tints that let the app say <em>&#34;this target is your burnt sienna at a pale
          tint&#34;</em> instead of reporting a misleading masstone distance.
        </P>
      </div>

      <div data-guide="sync">
        <SectionRule>Sync and your data</SectionRule>
        <P>
          Everything — pins, saved palette, paintbox, calibrations, mix observations, shopping
          list — lives in this browser. Nothing is sent anywhere until you create a sync code
          (right-hand column): 20 characters, no confusable letters, made to survive a paint
          rag. Enter it on another device and everything comes across, both ways, seconds after
          each change. Keep it private — it is the only key. Last write wins if two devices edit
          at once. Images never leave your device, and the app installs to a home screen and
          works fully offline after the first visit.
        </P>
      </div>

      <div data-guide="numbers">
        <SectionRule>Reading the numbers</SectionRule>
        <Steps items={[
          <span key="de"><strong style={{ color: T.bone }}>ΔE</strong> (CIEDE2000 perceptual difference) — under 2: barely distinguishable, use the tube straight. 2–6: close, adjust slightly. 6–12: clearly different, use as the base of a mixture. Over 12: mixing required.</span>,
          <span key="mun"><strong style={{ color: T.bone }}>Munsell</strong> — <span className="mono">7.5R 5.2/14</span> reads: hue 7.5R, value 5.2 (dark→light, 0–10), chroma 14 (0 is neutral grey; neutrals are written <span className="mono">N 5.2/</span>). Interpolated, not snapped to the nearest chip.</span>,
          <span key="codes"><strong style={{ color: T.bone }}>Tube codes</strong> — <span className="mono">PY43, PB29…</span> are pigment index codes, comparable across brands. O/SO/ST/T is opacity, opaque→transparent: keep darks transparent, save opaque paint for the lights. Series is the maker&#39;s price band.</span>,
          <span key="km"><strong style={{ color: T.bone }}>Kubelka-Munk</strong> — the pigment model behind every preview, mixing reconstructed reflectance spectra: complements genuinely neutralise, and blue + yellow makes a painter&#39;s green rather than light&#39;s grey.</span>,
        ]} />
      </div>

      <P style={{ marginTop: 16, fontStyle: "italic", fontSize: 12 }}>
        Look for the small ? markers throughout the app — each explains the term or number it
        sits beside, in place.
      </P>
    </div>
  );
}

export { GuideView };
