import { useState, useCallback } from "react";
import { T } from "./ui.jsx";
import { SamplerCanvas } from "./SamplerCanvas.jsx";
/* ---------------- Your canvas (upload + analysis) view ------------ */
function UploadView({ pins, activePinId, onAddPin, onSelectPin, onDeletePin, onNewImage, setSampled, source, setSource, fileName, setFileName, onPaletteSheet }) {
  const [autoPalette, setAutoPalette] = useState([]);
  const onPalette = useCallback((p) => setAutoPalette(p), []);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    setAutoPalette([]);
    onNewImage();
    const reader = new FileReader();
    reader.onload = () => setSource({ url: reader.result, crossOrigin: false });
    reader.readAsDataURL(f);
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div className="display" style={{ fontSize: 22, color: T.bone }}>Your Canvas</div>
          <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
            {fileName || "Apply the lessons to a master, a reference photo, or your own painting"}
          </div>
        </div>
        <label style={{
          padding: "8px 16px", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
          background: T.ochre, color: T.ground, borderRadius: 3, cursor: "pointer",
        }}>
          {source ? "Replace image" : "Choose image"}
          <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        </label>
      </div>
      {!source ? (
        <div style={{
          border: `1px dashed ${T.line}`, borderRadius: 6, padding: "70px 24px",
          textAlign: "center", color: T.faint, fontStyle: "italic", lineHeight: 1.7,
        }}>
          The image stays in your browser; nothing is uploaded to a server.
          <br />
          Once loaded you can pin passages exactly as in the lessons, and the dominant colours in
          use are extracted automatically.
        </div>
      ) : (
        <div>
          <SamplerCanvas source={source} pins={pins} activePinId={activePinId}
            onAddPin={onAddPin} onSelectPin={onSelectPin} onDeletePin={onDeletePin}
            extract onPalette={onPalette} />
          {autoPalette.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase",
                color: T.ochre, marginBottom: 8,
              }}>
                Colours in use · dominant clusters
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {autoPalette.map((c, i) => (
                  <button key={i} onClick={() => setSampled(c.hex)} title={c.hex}
                    aria-label={`Dominant colour ${i + 1}, ${c.hex}, ${c.pct.toFixed(0)}% of the surface`} style={{
                      background: "transparent", border: "none", padding: 0,
                      cursor: "pointer", textAlign: "center", fontFamily: "inherit",
                    }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 5, background: c.hex,
                      border: `1px solid ${T.line}`,
                    }} />
                    <div className="mono" style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                      {c.pct.toFixed(0)}%
                    </div>
                  </button>
                ))}
              </div>
              <p style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
                Eight clusters computed by k-means in Lab space; percentages show coverage of the
                picture surface. Click a swatch for its record, or drop pins on specific passages.
              </p>
              {onPaletteSheet && (
                <button
                  onClick={() => onPaletteSheet(autoPalette.map((c, i) => ({
                    id: 100000 + i, num: i + 1, hex: c.hex,
                    label: `${c.pct.toFixed(0)}% of the surface`,
                  })))}
                  style={{
                    marginTop: 4, padding: "8px 16px", fontSize: 11, letterSpacing: 1.5,
                    textTransform: "uppercase", background: "transparent", color: T.ochre,
                    border: `1px solid ${T.ochre}`, borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  Study sheet of these colours
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { UploadView };
