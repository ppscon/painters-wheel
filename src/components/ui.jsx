import { useState, useEffect, useRef, useId } from "react";
const T = {
  ground: "#1B1512",
  panel: "#252017",
  panel2: "#2C2519",
  line: "#3D3527",
  bone: "#EDE4D3",
  muted: "#9C8F78",
  /* 4.65:1 on panel2, 5.55:1 on ground — the old #6E6350 failed WCAG AA
     (2.57:1 on panel2) at the 10–12px sizes this token is used at. */
  faint: "#9B8D72",
  ochre: "#C9962E",
  vermilion: "#C8452C",
  /* For small text on dark panels; vermilion itself is only 3.1:1 there. */
  vermilionSoft: "#E07B5F",
};

/* Minimal modal behaviour: focus moves in, Tab cycles inside, Escape
   closes, focus returns to the opener, body scroll locks. */
function useModalDialog(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      ref.current
        ? Array.from(ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        : [];
    const first = focusables()[0];
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        const els = focusables();
        if (!els.length) return;
        const firstEl = els[0], lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && opener.focus) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}


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
  const tipId = useId();
  return (
    <span
      style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        aria-label={typeof text === "string" ? `More information: ${text.slice(0, 60)}` : "More information"}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        style={{
          /* 15px visual ring inside a ~27px hit area */
          width: 27, height: 27, borderRadius: "50%", padding: 6, marginLeft: 2,
          background: "transparent", border: "none", cursor: "help", fontFamily: "inherit",
          verticalAlign: "middle", lineHeight: 0,
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 15, height: 15, borderRadius: "50%", border: `1px solid ${T.faint}`,
          color: T.faint, fontSize: 9, lineHeight: 1,
        }}>
          ?
        </span>
      </button>
      {open && (
        <span
          role="tooltip"
          id={tipId}
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

export { T, SectionRule, Tip, useModalDialog };
