import { useState } from "react";
const T = {
  ground: "#1B1512",
  panel: "#252017",
  panel2: "#2C2519",
  line: "#3D3527",
  bone: "#EDE4D3",
  muted: "#9C8F78",
  faint: "#6E6350",
  ochre: "#C9962E",
  vermilion: "#C8452C",
};


function SectionRule({ children }) {
  return (
    <div style={{
      marginTop: 18, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase",
      color: T.muted, borderBottom: `1px solid ${T.line}`, paddingBottom: 6,
    }}>
      {children}
    </div>
  );
}


function Tip({ text, side = "top" }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        aria-label="More information"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        style={{
          width: 15, height: 15, borderRadius: "50%", padding: 0, marginLeft: 5,
          background: "transparent", border: `1px solid ${T.faint}`, color: T.faint,
          fontSize: 9, lineHeight: 1, cursor: "help", fontFamily: "inherit",
          verticalAlign: "middle",
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            [side === "top" ? "bottom" : "top"]: "150%",
            left: "50%", transform: "translateX(-50%)",
            width: "min(240px, 72vw)", background: T.ground,
            border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.ochre}`,
            padding: "9px 11px", borderRadius: 4, color: T.bone,
            fontSize: 11, lineHeight: 1.55, zIndex: 30,
            boxShadow: "0 6px 18px rgba(0,0,0,.55)",
            textTransform: "none", letterSpacing: 0, fontStyle: "normal",
            fontWeight: 400, textAlign: "left", whiteSpace: "normal",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export { T, SectionRule, Tip };
