import { T } from "./ui.jsx";
import { hexToRgb, rgbToLab } from "../color/math.js";
/* ---------------- Map-style pin ---------------------------------- */
function Pin({ pin, active, onSelect, onDelete }) {
  const [L] = rgbToLab(...hexToRgb(pin.hex));
  const numColor = L > 55 ? "#1B1512" : "#EDE4D3";
  const ring = active ? T.ochre : T.bone;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSelect(pin.id); }}
      title={`Pin ${pin.num} · ${pin.hex}`}
      aria-label={`Pin ${pin.num}${pin.label ? `, ${pin.label}` : ""}, colour ${pin.hex}`}
      style={{
        position: "absolute", left: `${pin.fx * 100}%`, top: `${pin.fy * 100}%`,
        /* top/side padding widens the hit area without moving the tail tip */
        transform: "translate(-50%, -100%)", background: "transparent", border: "none",
        padding: "8px 8px 0", cursor: "pointer", zIndex: active ? 3 : 2, lineHeight: 0,
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: "50%", background: pin.hex,
        border: `2px solid ${ring}`, boxShadow: "0 2px 6px rgba(0,0,0,.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: numColor, lineHeight: 1,
          /* halo keeps the digit legible on mid-value swatches */
          textShadow: numColor === "#1B1512" ? "0 0 3px rgba(255,255,255,.85)" : "0 0 3px rgba(0,0,0,.85)",
        }}>{pin.num}</span>
      </div>
      <div style={{
        width: 0, height: 0, margin: "0 auto",
        borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
        borderTop: `7px solid ${ring}`,
      }} />
      {active && onDelete && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove pin ${pin.num}`}
          title="Remove this pin"
          onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); onDelete(pin.id); }
          }}
          style={{
            position: "absolute", top: -4, right: -8, width: 22, height: 22,
            borderRadius: "50%", background: T.ground, color: T.bone,
            border: `1.5px solid ${T.ochre}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 13, lineHeight: 1, cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,.6)",
          }}
        >
          ×
        </span>
      )}
    </button>
  );
}

export { Pin };
