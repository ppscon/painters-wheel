
/* ================================================================
   THE PAINTER'S WHEEL: Phase 3.0
   Lessons gateway (Contrast · Value · Hue · Chroma) with pin-based
   study, colour theory guidance, paint matching and mixing advice
   ================================================================ */

import { useState, useEffect, useCallback } from "react";
import { T } from "./components/ui.jsx";
import { hexToRgb, rgbToLab } from "./color/math.js";
import { labToMunsell } from "./color/munsell.js";
import { LESSONS } from "./data/lessons.js";
import { ColorRecord } from "./components/ColorRecord.jsx";
import { WheelView } from "./components/WheelView.jsx";
import { LessonsView } from "./components/LessonsView.jsx";
import { UploadView } from "./components/UploadView.jsx";
import { ZornView } from "./components/ZornView.jsx";
import { PaintboxView } from "./components/PaintboxView.jsx";
import { StudySheet } from "./components/StudySheet.jsx";
import { HelpOverlay } from "./components/HelpOverlay.jsx";
import { PW_STORE, PW_KEY, PW_INIT_PINS, PW_INIT_BOX, PW_INIT_BOXONLY, nextPinId } from "./state/persist.js";

/* ---------------- App -------------------------------------------- */
export default function App() {
  const [tab, setTab] = useState("lessons");
  const [lessonId, setLessonId] = useState("contrast");
  const [wheelHex, setWheelHex] = useState(null);
  const [clusterHex, setClusterHex] = useState(null);
  const [zornHex, setZornHex] = useState(null);
  const [pins, setPins] = useState(PW_INIT_PINS);
  const [activePin, setActivePin] = useState(null);
  const [palette, setPalette] = useState((PW_SAVED && PW_SAVED.palette) || []);
  const [viewHex, setViewHex] = useState(null);
  const [box, setBox] = useState(PW_INIT_BOX);
  const [boxOnly, setBoxOnly] = useState(PW_INIT_BOXONLY);
  const activeBox = boxOnly && box.size >= 2 ? box : null;
  const [helpOpen, setHelpOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploadSource, setUploadSource] = useState(null);
  const [uploadName, setUploadName] = useState(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(l);
    return () => l.remove();
  }, []);

  useEffect(() => {
    if (!PW_STORE) return;
    try {
      PW_STORE.setItem(PW_KEY, JSON.stringify({ pins: { ...pins, upload: [] }, palette, box: [...box], boxOnly }));
    } catch (e) { /* storage full or unavailable; persistence is best-effort */ }
  }, [pins, palette, box, boxOnly]);

  const ctxKey = tab === "lessons" ? lessonId : tab === "upload" ? "upload" : null;
  const ctxPins = ctxKey ? pins[ctxKey] : [];
  const activePinObj =
    activePin && activePin.ctx === ctxKey ? ctxPins.find((p) => p.id === activePin.id) : null;

  const addPin = (key) => ({ fx, fy, hex }) => {
    setPins((prev) => {
      const num = prev[key].length ? Math.max(...prev[key].map((p) => p.num)) + 1 : 1;
      const pin = { id: nextPinId(), num, fx, fy, hex };
      setActivePin({ ctx: key, id: pin.id });
      return { ...prev, [key]: [...prev[key], pin] };
    });
    setViewHex(null);
    setClusterHex(null);
  };
  const selectPin = (key) => (id) => {
    setActivePin({ ctx: key, id });
    setViewHex(null);
    setClusterHex(null);
  };
  const deletePin = (key, id) => {
    setPins((prev) => ({ ...prev, [key]: prev[key].filter((p) => p.id !== id) }));
    setActivePin((ap) => (ap && ap.ctx === key && ap.id === id ? null : ap));
  };
  const clearUploadPins = useCallback(() => {
    setPins((prev) => ({ ...prev, upload: [] }));
    setActivePin((ap) => (ap && ap.ctx === "upload" ? null : ap));
  }, []);

  const lessonTitle = (LESSONS.find((l) => l.id === lessonId) || {}).title;
  const activeHex =
    viewHex ||
    (tab === "wheel" ? wheelHex : tab === "zorn" ? zornHex : activePinObj ? activePinObj.hex : tab === "upload" ? clusterHex : null);
  const sourceLabel =
    viewHex ? "From saved palette" :
    tab === "wheel" ? (wheelHex ? "From the RYB wheel" : null) :
    tab === "zorn" ? (zornHex ? "From the Zorn palette study" : null) :
    activePinObj ? `Pin ${activePinObj.num} · ${tab === "lessons" ? lessonTitle : "your image"}` :
    tab === "upload" && clusterHex ? "Dominant cluster from your image" : null;

  const sheetImage =
    tab === "lessons" ? (LESSONS.find((l) => l.id === lessonId) || LESSONS[0]).source.url :
    tab === "upload" && uploadSource ? uploadSource.url : null;
  const sheetTitle = tab === "lessons" ? lessonTitle : (uploadName || "Your canvas");
  const sheetSubtitle = tab === "lessons"
    ? (LESSONS.find((l) => l.id === lessonId) || LESSONS[0]).artist
    : "From your upload";

  const save = (hex) =>
    setPalette((p) => (p.includes(hex) || p.length >= 14 ? p : [...p, hex]));

  const TABS = [
    ["lessons", "Lessons"],
    ["upload", "Your Canvas"],
    ["wheel", "Colour Wheel"],
    ["zorn", "Zorn Palette"],
    ["box", "Paintbox"],
  ];

  return (
    <div style={{
      minHeight: "100vh", background: T.ground, color: T.bone,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      backgroundImage: "radial-gradient(ellipse at 50% -10%, rgba(201,150,46,.07), transparent 55%)",
    }}>
      <style>{`
        .display { font-family: 'Cormorant Garamond', Georgia, serif; }
        .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        button:focus-visible, label:focus-visible { outline: 2px solid ${T.ochre}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        @media (max-width: 900px) { .pw-main { grid-template-columns: 1fr !important; } }
        @media print {
          body * { visibility: hidden !important; }
          .pw-sheet, .pw-sheet * { visibility: visible !important; }
          .pw-sheet-overlay { position: absolute !important; inset: 0 !important; padding: 0 !important; background: none !important; display: block !important; }
          .pw-sheet { max-width: none !important; border-radius: 0 !important; box-shadow: none !important; }
          .pw-sheet-actions { display: none !important; }
        }
      `}</style>

      <header style={{ padding: "34px 24px 18px", borderBottom: `1px solid ${T.line}`, textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: T.ochre }}>
          Colour theory for oil painters
        </div>
        <h1 className="display" style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 500, margin: "6px 0 4px", color: T.bone }}>
          The Painter's Wheel
        </h1>
        <div className="display" style={{ fontStyle: "italic", fontSize: 17, color: T.muted }}>
          Four paintings, four lessons: contrast, value, hue and chroma, and the paints that carry them
        </div>
        <button onClick={() => setHelpOpen(true)} title="Help" aria-label="Open help" style={{
          position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%",
          background: "transparent", border: `1px solid ${T.line}`, color: T.muted,
          fontSize: 14, cursor: "pointer", fontFamily: "inherit",
        }}>
          ?
        </button>
      </header>

      <nav style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", borderBottom: `1px solid ${T.line}` }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setViewHex(null); }} style={{
            padding: "13px 22px", background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === k ? T.ochre : "transparent"}`,
            color: tab === k ? T.bone : T.muted, cursor: "pointer",
            fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "inherit",
          }}>
            {label}
          </button>
        ))}
      </nav>

      <main className="pw-main" style={{
        maxWidth: 1180, margin: "0 auto", padding: 24,
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 24,
      }}>
        <section style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 6, padding: 20 }}>
          {tab === "wheel" && (
            <WheelView activeBox={activeBox} selected={wheelHex} setSelected={(h) => { setWheelHex(h); setViewHex(null); }} />
          )}
          {tab === "lessons" && (
            <LessonsView lessonId={lessonId} setLessonId={setLessonId}
              pins={pins[lessonId]} activePinId={activePinObj ? activePinObj.id : null}
              onAddPin={addPin(lessonId)} onSelectPin={selectPin(lessonId)} />
          )}
          {tab === "upload" && (
            <UploadView pins={pins.upload} activePinId={activePinObj ? activePinObj.id : null}
              onAddPin={addPin("upload")} onSelectPin={selectPin("upload")}
              onNewImage={clearUploadPins}
              source={uploadSource} setSource={setUploadSource}
              fileName={uploadName} setFileName={setUploadName}
              setSampled={(h) => { setClusterHex(h); setActivePin(null); setViewHex(null); }} />
          )}
          {tab === "zorn" && (
            <ZornView activeBox={activeBox} setSampled={(h) => { setZornHex(h); setViewHex(null); setActivePin(null); }} />
          )}
          {tab === "box" && (
            <PaintboxView box={box} setBox={setBox} boxOnly={boxOnly} setBoxOnly={setBoxOnly} />
          )}
        </section>

        <aside>
          <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 12 }}>
              Colour record
            </div>
            <ColorRecord hex={activeHex} sourceLabel={sourceLabel} onSave={save} activeBox={activeBox} />
          </div>

          {ctxKey && ctxPins.length > 0 && (
            <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre }}>
                  Pinned colours
                </span>
                {sheetImage && (
                  <button onClick={() => setSheetOpen(true)} style={{
                    fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.ochre,
                    background: "transparent", border: `1px solid ${T.ochre}`, borderRadius: 3,
                    padding: "3px 9px", cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Study sheet
                  </button>
                )}
              </div>
              {ctxPins.map((p) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                  borderBottom: `1px solid ${T.line}`,
                }}>
                  <button onClick={() => selectPin(ctxKey)(p.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, flex: 1,
                    background: "transparent", border: "none", padding: 0,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", background: p.hex,
                      border: `2px solid ${activePinObj && activePinObj.id === p.id ? T.ochre : T.line}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: rgbToLab(...hexToRgb(p.hex))[0] > 55 ? T.ground : T.bone,
                      }}>
                        {p.num}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: T.bone }}>{p.hex}</span>
                    <span className="mono" style={{ fontSize: 11, color: T.faint }}>
                      {labToMunsell(rgbToLab(...hexToRgb(p.hex)))}
                    </span>
                  </button>
                  <button onClick={() => deletePin(ctxKey, p.id)} title="Remove pin" style={{
                    background: "transparent", border: "none", color: T.faint,
                    cursor: "pointer", fontSize: 14, padding: "0 2px", fontFamily: "inherit",
                  }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18, marginTop: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 10 }}>
              Saved palette
            </div>
            {palette.length === 0 ? (
              <div style={{ color: T.faint, fontSize: 12, fontStyle: "italic" }}>
                Saved colours appear here as a working palette across all lessons.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {palette.map((h) => (
                  <button key={h} onClick={() => setViewHex(h)} title={h} style={{
                    width: 34, height: 34, borderRadius: 4, background: h, cursor: "pointer",
                    border: `2px solid ${viewHex === h ? T.bone : T.line}`, padding: 0,
                  }} />
                ))}
                <button onClick={() => { setPalette([]); setViewHex(null); }} style={{
                  fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
                  background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 4,
                  padding: "0 10px", cursor: "pointer", fontFamily: "inherit",
                }}>
                  Clear
                </button>
              </div>
            )}
          </div>

          <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.6, marginTop: 14 }}>
            Paint swatches are approximate masstone values compiled for guidance; verify against
            manufacturer colour charts before purchase. Munsell notation is interpolated from
            the real renotation dataset (2,734 measured colours, illuminant C adapted to D65).
          </p>
        </aside>
      </main>
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {sheetOpen && sheetImage && ctxPins.length > 0 && (
        <StudySheet title={sheetTitle} subtitle={sheetSubtitle} image={sheetImage}
          pins={ctxPins} activeBox={activeBox} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}
