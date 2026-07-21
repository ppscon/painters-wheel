
/* ================================================================
   THE PAINTER'S WHEEL: Phase 3.1
   Lessons gateway (Contrast · Value · Hue · Chroma) with pin-based
   study, colour theory guidance, paint matching and mixing advice
   ================================================================ */

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { T } from "./components/ui.jsx";
import { hexToRgb, rgbToLab } from "./color/math.js";
import { labToMunsell } from "./color/munsell.js";
import { nearestPaint } from "./color/paints.js";
import { LESSONS } from "./data/lessons.js";
import { ColorRecord } from "./components/ColorRecord.jsx";
import { WheelView } from "./components/WheelView.jsx";
import { LessonsView } from "./components/LessonsView.jsx";
import { UploadView } from "./components/UploadView.jsx";
import { ZornView } from "./components/ZornView.jsx";
import { PaintboxView } from "./components/PaintboxView.jsx";
import { StudySheet } from "./components/StudySheet.jsx";
import { HelpOverlay } from "./components/HelpOverlay.jsx";
import { PW_STORE, PW_KEY, loadSaved, nextPinId } from "./state/persist.js";
import { encodeStudy, decodeStudy } from "./state/share.js";

/* Compact fixed readout for small screens, where the full colour record
   sits below the painting: swatch, notation and nearest tube at a
   glance, one tap to scroll to the record itself. Hidden ≥ 900px via
   the .pw-mobile-readout media rule. */
function MobileReadout({ hex, activeBox, recordRef }) {
  const munsell = useMemo(() => labToMunsell(rgbToLab(...hexToRgb(hex))), [hex]);
  const paint = useMemo(() => nearestPaint(hex, activeBox), [hex, activeBox]);
  return (
    <div className="pw-mobile-readout" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
      alignItems: "center", gap: 12, padding: "10px 14px",
      background: "rgba(27,21,18,.96)", borderTop: `1px solid ${T.line}`,
      backdropFilter: "blur(6px)",
    }}>
      <span style={{ width: 42, height: 42, borderRadius: 5, background: hex, border: "1px solid rgba(0,0,0,.5)", flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="mono" style={{ fontSize: 12, color: T.bone }}>{hex} · {munsell}</div>
        <div style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {paint ? `${paint.n} · ${paint.m} · ΔE ${paint.dE.toFixed(1)}` : ""}
        </div>
      </div>
      <button
        onClick={() => recordRef.current && recordRef.current.scrollIntoView({ behavior: "smooth", block: "start" })}
        style={{
          padding: "10px 14px", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
          background: "transparent", color: T.ochre, border: `1px solid ${T.ochre}`,
          borderRadius: 4, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
        }}>
        Record
      </button>
    </div>
  );
}

/* ---------------- App -------------------------------------------- */
export default function App() {
  const [tab, setTab] = useState("lessons");
  const [lessonId, setLessonId] = useState("contrast");
  const [wheelHex, setWheelHex] = useState(null);
  const [clusterHex, setClusterHex] = useState(null);
  const [zornHex, setZornHex] = useState(null);
  const [saved] = useState(loadSaved);
  const [pins, setPins] = useState(saved.pins);
  const [activePin, setActivePin] = useState(null);
  const [palette, setPalette] = useState(saved.palette);
  const [viewHex, setViewHex] = useState(null);
  const [box, setBox] = useState(saved.box);
  const [boxOnly, setBoxOnly] = useState(saved.boxOnly);
  const activeBox = boxOnly && box.size >= 2 ? box : null;
  const [helpOpen, setHelpOpen] = useState(false);
  const [pinHistory, setPinHistory] = useState([]);
  const [editingPin, setEditingPin] = useState(null);
  const [munsellJump, setMunsellJump] = useState(null);
  const [shareMsg, setShareMsg] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploadSource, setUploadSource] = useState(null);
  const [uploadName, setUploadName] = useState(null);

  const recordRef = useRef(null);

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
    const list = pins[key] || [];
    const num = list.length ? Math.max(...list.map((p) => p.num)) + 1 : 1;
    const pin = { id: nextPinId(), num, fx, fy, hex };
    setPins({ ...pins, [key]: [...list, pin] });
    setPinHistory((h) => [...h.slice(-19), { type: "add", key, pin }]);
    setActivePin({ ctx: key, id: pin.id });
    setViewHex(null);
    setClusterHex(null);
  };
  const selectPin = (key) => (id) => {
    setActivePin({ ctx: key, id });
    setViewHex(null);
    setClusterHex(null);
  };
  const deletePin = (key, id) => {
    const pin = (pins[key] || []).find((p) => p.id === id);
    if (!pin) return;
    setPins({ ...pins, [key]: pins[key].filter((p) => p.id !== id) });
    setPinHistory((h) => [...h.slice(-19), { type: "del", key, pin }]);
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
    activePinObj ? `Pin ${activePinObj.num}${activePinObj.label ? " · " + activePinObj.label : ""} · ${tab === "lessons" ? lessonTitle : "your image"}` :
    tab === "upload" && clusterHex ? "Dominant cluster from your image" : null;


  const undoPin = useCallback(() => {
    if (!pinHistory.length) return;
    const op = pinHistory[pinHistory.length - 1];
    setPinHistory(pinHistory.slice(0, -1));
    setPins((prev) => {
      const list = prev[op.key] || [];
      return op.type === "add"
        ? { ...prev, [op.key]: list.filter((p) => p.id !== op.pin.id) }
        : { ...prev, [op.key]: [...list, op.pin].sort((a, b) => a.num - b.num) };
    });
    setActivePin((ap) => (op.type === "add" && ap && ap.id === op.pin.id ? null : ap));
  }, [pinHistory]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
        e.preventDefault();
        undoPin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoPin]);
  const setPinLabel = (key, id, label) =>
    setPins((prev) => ({ ...prev, [key]: prev[key].map((p) => (p.id === id ? { ...p, label: label || undefined } : p)) }));
  const openMunsellPage = (notation) => {
    const m = String(notation).match(/^([\d.]+)([A-Z]+)/);
    if (!m) return;
    const famIdx = ["R","YR","Y","GY","G","BG","B","PB","P","RP"].indexOf(m[2]);
    if (famIdx < 0) return;
    const step = Math.min(3, Math.max(0, Math.round(Number(m[1]) / 2.5) - 1));
    setTab("wheel");
    setViewHex(null);
    setMunsellJump({ idx: famIdx * 4 + step, t: Date.now() });
  };
  const shareStudy = () => {
    if (tab !== "lessons" || !ctxPins.length) return;
    const url = `${location.origin}${location.pathname}${encodeStudy(lessonId, ctxPins)}`;
    const done = () => { setShareMsg("Copied!"); setTimeout(() => setShareMsg(null), 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => window.prompt("Copy this study link:", url));
    } else {
      window.prompt("Copy this study link:", url);
    }
  };
  useEffect(() => {
    const study = decodeStudy(location.hash, LESSONS.map((l) => l.id));
    if (!study) return;
    const incoming = study.pins.map((p) => ({ ...p, id: nextPinId() }));
    setTab("lessons");
    setLessonId(study.lessonId);
    setPins((prev) => ({ ...prev, [study.lessonId]: incoming }));
    history.replaceState(null, "", location.pathname);
  }, []);
  const exportPalettePng = () => {
    const w = 96, h = 132, c = document.createElement("canvas");
    c.width = w * palette.length; c.height = h;
    const x = c.getContext("2d");
    x.fillStyle = "#FBF7EE"; x.fillRect(0, 0, c.width, h);
    palette.forEach((hex, i) => {
      x.fillStyle = hex; x.fillRect(i * w + 8, 8, w - 16, w - 16);
      x.strokeStyle = "#D8CFBC"; x.strokeRect(i * w + 8.5, 8.5, w - 17, w - 17);
      x.fillStyle = "#2B241A"; x.font = "11px ui-monospace, monospace"; x.textAlign = "center";
      x.fillText(hex, i * w + w / 2, w + 8);
      x.fillStyle = "#6E6350"; x.font = "8px ui-monospace, monospace";
      x.fillText(labToMunsell(rgbToLab(...hexToRgb(hex))), i * w + w / 2, w + 22);
    });
    const a = document.createElement("a");
    a.download = "painters-wheel-palette.png";
    a.href = c.toDataURL("image/png");
    a.click();
  };

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
        @media (max-width: 900px) { .pw-main { grid-template-columns: 1fr !important; padding-bottom: 86px !important; } }
        .pw-mobile-readout { display: none; }
        @media (max-width: 900px) { .pw-mobile-readout { display: flex; } }
        @media print {
          body { background: #FBF7EE !important; }
          header, .pw-main, .pw-help-overlay { display: none !important; }
          .pw-sheet-overlay { position: static !important; inset: auto !important; padding: 0 !important; background: none !important; display: block !important; overflow: visible !important; height: auto !important; }
          .pw-sheet { max-width: none !important; border-radius: 0 !important; box-shadow: none !important; }
          .pw-sheet-actions { display: none !important; }
          .pw-sheet, .pw-sheet * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
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
            <WheelView activeBox={activeBox} munsellJump={munsellJump} selected={wheelHex} setSelected={(h) => { setWheelHex(h); setViewHex(null); }} />
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
          <div ref={recordRef} style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 12 }}>
              Colour record
            </div>
            <ColorRecord hex={activeHex} sourceLabel={sourceLabel} onSave={save} activeBox={activeBox} onOpenMunsell={openMunsellPage} />
          </div>

          {ctxKey && ctxPins.length > 0 && (
            <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre }}>
                  Pinned colours
                </span>
                {pinHistory.length > 0 && (
                  <button onClick={undoPin} title="Undo last pin (Ctrl+Z)" style={{
                    fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.faint,
                    background: "transparent", border: `1px dashed ${T.line}`, borderRadius: 3,
                    padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", marginRight: 6,
                  }}>
                    Undo
                  </button>
                )}
                {tab === "lessons" && ctxPins.length > 0 && (
                  <button onClick={shareStudy} style={{
                    fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.ochre,
                    background: "transparent", border: `1px solid ${T.line}`, borderRadius: 3,
                    padding: "3px 9px", cursor: "pointer", fontFamily: "inherit", marginRight: 6,
                  }}>
                    {shareMsg || "Share"}
                  </button>
                )}
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
                <Fragment key={p.id}>
                <div style={{
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
                  <button onClick={() => setEditingPin(editingPin === p.id ? null : p.id)} title="Label pin" style={{
                    background: "transparent", border: "none", color: T.faint,
                    cursor: "pointer", fontSize: 12, padding: "0 2px", fontFamily: "inherit",
                  }}>
                    {"\u270e"}
                  </button>
                  <button onClick={() => deletePin(ctxKey, p.id)} title="Remove pin" style={{
                    background: "transparent", border: "none", color: T.faint,
                    cursor: "pointer", fontSize: 14, padding: "0 2px", fontFamily: "inherit",
                  }}>
                    ×
                  </button>
                </div>
                {p.label && editingPin !== p.id && (
                  <div style={{ fontSize: 10, color: T.muted, fontStyle: "italic", padding: "2px 0 4px 36px" }}>{p.label}</div>
                )}
                {editingPin === p.id && (
                  <input autoFocus defaultValue={p.label || ""} placeholder="Label this pin"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { setPinLabel(ctxKey, p.id, e.target.value.trim()); setEditingPin(null); }
                      if (e.key === "Escape") setEditingPin(null);
                    }}
                    onBlur={(e) => { setPinLabel(ctxKey, p.id, e.target.value.trim()); setEditingPin(null); }}
                    style={{
                      margin: "4px 0 4px 0", fontSize: 11, background: T.ground, color: T.bone,
                      border: `1px solid ${T.line}`, borderRadius: 3, padding: "3px 7px",
                      fontFamily: "inherit", width: "100%", boxSizing: "border-box",
                    }} />
                )}
                </Fragment>
              ))}
            </div>
          )}

          <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 18, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre }}>
                Saved palette
              </span>
              {palette.length > 0 && (
                <button onClick={exportPalettePng} style={{
                  fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.ochre,
                  background: "transparent", border: `1px solid ${T.line}`, borderRadius: 3,
                  padding: "3px 9px", cursor: "pointer", fontFamily: "inherit",
                }}>
                  Export PNG
                </button>
              )}
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
      {activeHex && tab !== "box" && <MobileReadout hex={activeHex} activeBox={activeBox} recordRef={recordRef} />}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {sheetOpen && sheetImage && ctxPins.length > 0 && (
        <StudySheet title={sheetTitle} subtitle={sheetSubtitle} image={sheetImage}
          pins={ctxPins} activeBox={activeBox} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}
