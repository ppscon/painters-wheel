import { useState, useRef, useEffect, useCallback } from "react";
import { T, Tip } from "./ui.jsx";
import { Pin } from "./Pin.jsx";
import { srgbToLinear, linearToSrgb, rgbToHex, rgbToLab } from "../color/math.js";
/* ---------------- Generic sampling canvas with pins --------------- */
const VIEW_MODES = [
  ["colour", "Colour"], ["value", "Value"], ["p3", "3-step"], ["p5", "5-step"], ["p9", "9-step"],
];
const POSTER_STEPS = { p3: 3, p5: 5, p9: 9 };
function greyToL(v) {
  const Y = srgbToLinear(v);
  return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : Y * 903.3;
}
function lToGrey(L) {
  const fy = (L + 16) / 116, d = 6 / 29;
  const Y = fy > d ? fy * fy * fy : 3 * d * d * (fy - 4 / 29);
  return linearToSrgb(Y);
}
const POSTER_LUTS = {};
function posterLUT(n) {
  if (POSTER_LUTS[n]) return POSTER_LUTS[n];
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const L = greyToL(v);
    const band = Math.min(n - 1, Math.floor((L / 100) * n));
    lut[v] = Math.round(lToGrey(((band + 0.5) * 100) / n));
  }
  POSTER_LUTS[n] = lut;
  return lut;
}
function computeLuminosityHist(src) {
  const w = 128, h = Math.max(1, Math.round((src.height / src.width) * w));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const cx = c.getContext("2d");
  cx.drawImage(src, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  const bins = new Array(25).fill(0);
  let shadow = 0, mids = 0, light = 0, total = 0;
  for (let i = 0; i < d.length; i += 4) {
    const L = rgbToLab(d[i], d[i + 1], d[i + 2])[0];
    bins[Math.min(24, Math.floor((L / 100) * 25))]++;
    if (L < 35) shadow++; else if (L < 70) mids++; else light++;
    total++;
  }
  const max = Math.max(...bins, 1);
  return {
    bins: bins.map((b) => b / max),
    shadow: (shadow / total) * 100,
    mids: (mids / total) * 100,
    light: (light / total) * 100,
  };
}
const COARSE = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

function SamplerCanvas({ source, pins, activePinId, onAddPin, onSelectPin, onDeletePin, extract, onPalette }) {
  const wrapRef = useRef(null);
  const dispRef = useRef(null);
  const srcRef = useRef(null);
  const loupeRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [view, setView] = useState("colour");
  const [hist, setHist] = useState(null);
  const [loupe, setLoupe] = useState(null);
  const [hint, setHint] = useState(false);
  const statusRef = useRef(status);
  const addPinRef = useRef(onAddPin);
  useEffect(() => { statusRef.current = status; addPinRef.current = onAddPin; });

  const draw = useCallback((mode) => {
    const src = srcRef.current, disp = dispRef.current;
    if (!src || !disp) return;
    const ctx = disp.getContext("2d");
    const grey = mode !== "colour";
    /* Browsers without 2D-canvas filter support (Safari < 17.6) expose
       ctx.filter as undefined and silently ignore assignments — without
       the fallback below, value views would posterise the red channel. */
    const filterOK = typeof ctx.filter === "string";
    if (grey && filterOK) {
      ctx.filter = "grayscale(1)";
      ctx.drawImage(src, 0, 0);
      ctx.filter = "none";
    } else {
      ctx.drawImage(src, 0, 0);
    }
    const n = POSTER_STEPS[mode];
    if (grey && !filterOK) {
      const img = ctx.getImageData(0, 0, disp.width, disp.height);
      const d = img.data, lut = n ? posterLUT(n) : null;
      for (let i = 0; i < d.length; i += 4) {
        let g = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
        if (lut) g = lut[g];
        d[i] = g; d[i + 1] = g; d[i + 2] = g;
      }
      ctx.putImageData(img, 0, 0);
    } else if (n) {
      const img = ctx.getImageData(0, 0, disp.width, disp.height);
      const d = img.data, lut = posterLUT(n);
      for (let i = 0; i < d.length; i += 4) {
        const g = lut[d[i]];
        d[i] = g; d[i + 1] = g; d[i + 2] = g;
      }
      ctx.putImageData(img, 0, 0);
    }
  }, []);

  useEffect(() => {
    setStatus("loading");
    setHist(null);
    let cancelled = false;
    const img = new Image();
    if (source.crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled || !dispRef.current) return;
      const cap = 2400;
      const scale = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const src = document.createElement("canvas");
      src.width = w; src.height = h;
      src.getContext("2d").drawImage(img, 0, 0, w, h);
      srcRef.current = src;
      const disp = dispRef.current;
      disp.width = w; disp.height = h;
      draw("colour");
      setView("colour");
      setStatus("ready");
      setHist(computeLuminosityHist(src));
      if (extract && onPalette) onPalette(extractPalette(src));
    };
    let triedFallback = false;
    img.onerror = () => {
      if (cancelled) return;
      // Browsers without WebP (older Safari/iPads) fall back to the JPEG.
      if (!triedFallback && /\.webp$/.test(img.src)) {
        triedFallback = true;
        img.src = source.url.replace(/\.webp$/, ".jpg");
        return;
      }
      setStatus("error");
    };
    img.src = source.url;
    return () => { cancelled = true; img.onload = img.onerror = null; };
  }, [source, draw, extract, onPalette]);

  useEffect(() => { if (status === "ready") draw(view); }, [view, status, draw]);

  const toCanvasCoords = (e) => {
    const disp = dispRef.current;
    const rect = disp.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    return { x: Math.round(fx * disp.width), y: Math.round(fy * disp.height), fx, fy };
  };
  const sampleAvg = (x, y, half = 2) => {
    const src = srcRef.current;
    const ctx = src.getContext("2d");
    const x0 = Math.max(0, x - half), y0 = Math.max(0, y - half);
    const w = Math.min(src.width - x0, half * 2 + 1), h = Math.min(src.height - y0, half * 2 + 1);
    const d = ctx.getImageData(x0, y0, w, h).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return rgbToHex(r / n, g / n, b / n);
  };
  /* One sample per animation frame, however fast the pointer moves. */
  const rafId = useRef(0);
  const pendingPt = useRef(null);
  const doSample = useCallback((clientX, clientY, touch) => {
    if (statusRef.current !== "ready" || !srcRef.current || !dispRef.current || !wrapRef.current) return;
    const disp = dispRef.current;
    const rect = disp.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    const x = Math.round(fx * disp.width), y = Math.round(fy * disp.height);
    const hex = sampleAvg(x, y);
    const wrapRect = wrapRef.current.getBoundingClientRect();
    setLoupe({
      x: clientX - wrapRect.left, y: clientY - wrapRect.top,
      w: wrapRect.width, h: wrapRect.height, hex, touch,
    });
    const lc = loupeRef.current;
    if (lc) {
      const lctx = lc.getContext("2d");
      lctx.imageSmoothingEnabled = false;
      lctx.clearRect(0, 0, 120, 120);
      lctx.drawImage(srcRef.current, x - 7, y - 7, 15, 15, 0, 0, 120, 120);
      lctx.strokeStyle = "rgba(237,228,211,.9)";
      lctx.strokeRect(56, 56, 8, 8);
    }
  }, []);
  const queueMove = useCallback((clientX, clientY, touch) => {
    pendingPt.current = { clientX, clientY, touch };
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      const p = pendingPt.current;
      if (p) doSample(p.clientX, p.clientY, p.touch);
    });
  }, [doSample]);
  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);

  const onClick = (e) => {
    if (status !== "ready") return;
    const { x, y, fx, fy } = toCanvasCoords(e);
    onAddPin({ fx, fy, hex: sampleAvg(x, y) });
  };

  /* Keyboard sampling: arrows steer a virtual crosshair (Shift for
     bigger steps), Enter/Space drops a pin, Escape dismisses the loupe.
     Each move is announced to screen readers via the live region. */
  const kbPos = useRef(null);
  const [announce, setAnnounce] = useState("");
  const onKeyDown = (e) => {
    if (status !== "ready") return;
    const step = e.shiftKey ? 0.05 : 0.01;
    let p = kbPos.current || { fx: 0.5, fy: 0.5 };
    if (e.key === "ArrowLeft") p = { ...p, fx: Math.max(0, p.fx - step) };
    else if (e.key === "ArrowRight") p = { ...p, fx: Math.min(1, p.fx + step) };
    else if (e.key === "ArrowUp") p = { ...p, fy: Math.max(0, p.fy - step) };
    else if (e.key === "ArrowDown") p = { ...p, fy: Math.min(1, p.fy + step) };
    else if (e.key === "Enter" || e.key === " ") {
      if (!kbPos.current) return;
      e.preventDefault();
      const disp = dispRef.current;
      const { fx, fy } = kbPos.current;
      const x = Math.round(fx * disp.width), y = Math.round(fy * disp.height);
      const hex = sampleAvg(x, y);
      onAddPin({ fx, fy, hex });
      setAnnounce(`Pin dropped at ${hex}`);
      return;
    } else if (e.key === "Escape") {
      kbPos.current = null;
      setLoupe(null);
      return;
    } else return;
    e.preventDefault();
    kbPos.current = p;
    const disp = dispRef.current;
    const rect = disp.getBoundingClientRect();
    queueMove(rect.left + p.fx * rect.width, rect.top + p.fy * rect.height, false);
    const x = Math.round(p.fx * disp.width), y = Math.round(p.fy * disp.height);
    setAnnounce(`${sampleAvg(x, y)}, ${Math.round(p.fx * 100)}% across, ${Math.round(p.fy * 100)}% down`);
  };

  /* Touch model: hold ~300ms to start sampling (loupe appears), drag to
     inspect, lift to pin. A moving touch is a scroll and is left to the
     browser (touch-action: pan-y); a quick tap just shows a hint. This
     replaces the old behaviour where every touch dropped a pin on lift
     and the canvas trapped page scrolling. Native listeners are used so
     touchmove can preventDefault once sampling has claimed the gesture. */
  useEffect(() => {
    const el = dispRef.current;
    if (!el) return;
    const SLOP = 12, HOLD_MS = 300;
    let gesture = null;
    const start = (e) => {
      const t = e.touches[0];
      if (!t || statusRef.current !== "ready") return;
      gesture = {
        sampling: false, startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY,
        timer: setTimeout(() => {
          if (!gesture) return;
          gesture.sampling = true;
          if (navigator.vibrate) navigator.vibrate(8);
          queueMove(gesture.lastX, gesture.lastY, true);
        }, HOLD_MS),
      };
    };
    const move = (e) => {
      if (!gesture) return;
      const t = e.touches[0];
      gesture.lastX = t.clientX; gesture.lastY = t.clientY;
      if (gesture.sampling) {
        e.preventDefault();
        queueMove(t.clientX, t.clientY, true);
      } else if (Math.hypot(t.clientX - gesture.startX, t.clientY - gesture.startY) > SLOP) {
        clearTimeout(gesture.timer);
        gesture = null; // scroll gesture — the browser owns it now
      }
    };
    const end = (e) => {
      if (!gesture) return;
      clearTimeout(gesture.timer);
      const g = gesture;
      gesture = null;
      e.preventDefault(); // suppress the synthetic click either way
      if (g.sampling) {
        const disp = dispRef.current;
        if (disp && statusRef.current === "ready") {
          const rect = disp.getBoundingClientRect();
          const fx = (g.lastX - rect.left) / rect.width;
          const fy = (g.lastY - rect.top) / rect.height;
          const x = Math.round(fx * disp.width), y = Math.round(fy * disp.height);
          addPinRef.current({ fx, fy, hex: sampleAvg(x, y) });
        }
      } else {
        setHint(true);
        setTimeout(() => setHint(false), 1600);
      }
      setLoupe(null);
    };
    const cancel = () => {
      if (gesture) clearTimeout(gesture.timer);
      gesture = null;
      setLoupe(null);
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end, { passive: false });
    el.addEventListener("touchcancel", cancel);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", cancel);
    };
  }, [queueMove]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T.faint, fontStyle: "italic" }}>
          {COARSE ? "Touch and hold to sample · drag to inspect · lift to pin" : "Click to drop a pin · click a pin to recall it"}
          <Tip text={'Colour shows the picture as painted. Value strips hue. The step views posterise on equal L* bands: 3-step is a notan, 5-step a value plan, 9-step near the Munsell scale. Pins always sample the true colour.'} side="bottom" />
        </span>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {VIEW_MODES.map(([k, lbl]) => (
            <button key={k} onClick={() => setView(k)} style={{
              padding: "6px 10px", fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
              background: view === k ? T.bone : "transparent",
              color: view === k ? T.ground : T.muted,
              border: `1px solid ${view === k ? T.bone : T.line}`,
              borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
            }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div ref={wrapRef} style={{ position: "relative", lineHeight: 0, border: `1px solid ${T.line}`, borderRadius: 4, overflow: "hidden" }}>
        {status === "loading" && (
          <div style={{ padding: 60, textAlign: "center", color: T.faint, fontStyle: "italic" }}>
            Loading the image…
          </div>
        )}
        {status === "error" && (
          <div style={{ padding: 60, textAlign: "center", color: T.vermilion, lineHeight: 1.5 }}>
            The image could not be loaded.
          </div>
        )}
        <canvas ref={dispRef}
          tabIndex={0}
          role="application"
          aria-label="Painting sampler. Use the arrow keys to move the sampling point, hold Shift for larger steps, and press Enter to drop a pin."
          onKeyDown={onKeyDown}
          onMouseMove={(e) => queueMove(e.clientX, e.clientY, false)}
          onMouseLeave={() => setLoupe(null)} onClick={onClick}
          onBlur={() => setLoupe(null)}
          style={{ width: "100%", display: status === "ready" ? "block" : "none", cursor: "crosshair", touchAction: "pan-y" }} />
        <span aria-live="polite" style={{
          position: "absolute", width: 1, height: 1, overflow: "hidden",
          clipPath: "inset(50%)", whiteSpace: "nowrap",
        }}>
          {announce}
        </span>
        {hint && (
          <div style={{
            position: "absolute", left: "50%", top: 12, transform: "translateX(-50%)",
            background: "rgba(10,7,5,.88)", color: T.bone, fontSize: 12, padding: "8px 14px",
            borderRadius: 4, zIndex: 5, pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            Touch and hold to sample a colour
          </div>
        )}
        {status === "ready" && pins.map((p) => (
          <Pin key={p.id} pin={p} active={p.id === activePinId} onSelect={onSelectPin} onDelete={onDeletePin} />
        ))}
        {loupe && (
          <div style={{
            /* Touch: centred above the finger. Mouse: offset right. Either
               way clamped inside the wrapper so it can't be clipped by
               overflow:hidden near the edges of the painting. */
            position: "absolute",
            left: Math.max(4, Math.min((loupe.w || 0) - 124, loupe.touch ? loupe.x - 60 : loupe.x + 22)),
            top: Math.max(4, Math.min((loupe.h || 0) - 124, loupe.touch ? loupe.y - 158 : loupe.y - 60)),
            pointerEvents: "none",
            width: 120, height: 120, borderRadius: "50%", overflow: "hidden", zIndex: 4,
            border: `4px solid ${loupe.hex}`, boxShadow: "0 4px 18px rgba(0,0,0,.7), 0 0 0 1px rgba(0,0,0,.8)",
          }}>
            <canvas ref={loupeRef} width={120} height={120} style={{ width: 120, height: 120 }} />
          </div>
        )}
      </div>
      {hist && status === "ready" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 54 }}>
              {hist.bins.map((b, i) => {
                const g = Math.round(lToGrey(((i + 0.5) * 100) / 25));
                return (
                  <div key={i} style={{
                    flex: 1, height: `${Math.max(3, b * 100)}%`,
                    background: rgbToHex(g, g, g), borderRadius: 1,
                  }} />
                );
              })}
            </div>
            <div style={{ position: "absolute", left: "35%", top: 0, bottom: 0, width: 1, background: T.ochre, opacity: 0.55 }} />
            <div style={{ position: "absolute", left: "70%", top: 0, bottom: 0, width: 1, background: T.ochre, opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span className="mono" style={{ fontSize: 10, color: T.muted }}>Shadow {hist.shadow.toFixed(0)}%</span>
            <span className="mono" style={{ fontSize: 10, color: T.muted }}>Mid {hist.mids.toFixed(0)}%</span>
            <span className="mono" style={{ fontSize: 10, color: T.muted }}>Lights {hist.light.toFixed(0)}%</span>
          </div>
          <p style={{ color: T.faint, fontSize: 11, lineHeight: 1.55, marginTop: 4 }}>
            Luminosity histogram in L*, darks to the left; the ochre rules mark the shadow, mid
            and light zones. The step views above posterise on equal L* bands: 3-step is the
            classic notan, 5-step is a working value plan, 9-step approximates the Munsell value
            scale.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Automatic palette extraction ------------------ */
function extractPalette(srcCanvas, k = 8) {
  const w = 96;
  const h = Math.max(1, Math.round((srcCanvas.height / srcCanvas.width) * w));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(srcCanvas, 0, 0, w, h);
  const d = c.getContext("2d").getImageData(0, 0, w, h).data;
  const pts = [];
  for (let i = 0; i < d.length; i += 4) {
    pts.push({ lab: rgbToLab(d[i], d[i + 1], d[i + 2]), rgb: [d[i], d[i + 1], d[i + 2]] });
  }
  const byL = [...pts].sort((a, b) => a.lab[0] - b.lab[0]);
  let cents = Array.from({ length: k }, (_, i) => byL[Math.floor(((i + 0.5) / k) * byL.length)].lab.slice());
  let assign = new Array(pts.length).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    for (let p = 0; p < pts.length; p++) {
      let bi = 0, bd = Infinity;
      for (let ci = 0; ci < k; ci++) {
        const [L, A, B] = cents[ci], [l, a2, b2] = pts[p].lab;
        const dd = (L - l) ** 2 + (A - a2) ** 2 + (B - b2) ** 2;
        if (dd < bd) { bd = dd; bi = ci; }
      }
      assign[p] = bi;
    }
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let p = 0; p < pts.length; p++) {
      const s = sums[assign[p]];
      s[0] += pts[p].lab[0]; s[1] += pts[p].lab[1]; s[2] += pts[p].lab[2]; s[3]++;
    }
    cents = sums.map((s, ci) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cents[ci]));
  }
  const acc = Array.from({ length: k }, () => [0, 0, 0, 0]);
  /* Track, per cluster, the actual pixel nearest the final centroid so
     each extracted colour carries a real location in the image. */
  const best = Array.from({ length: k }, () => ({ d: Infinity, p: -1 }));
  for (let p = 0; p < pts.length; p++) {
    const ci = assign[p];
    const a = acc[ci];
    a[0] += pts[p].rgb[0]; a[1] += pts[p].rgb[1]; a[2] += pts[p].rgb[2]; a[3]++;
    const [L, A, B] = cents[ci], [l, a2, b2] = pts[p].lab;
    const dd = (L - l) ** 2 + (A - a2) ** 2 + (B - b2) ** 2;
    if (dd < best[ci].d) best[ci] = { d: dd, p };
  }
  return acc
    .map((a, ci) => {
      if (!a[3]) return null;
      const bp = best[ci].p;
      return {
        hex: rgbToHex(a[0] / a[3], a[1] / a[3], a[2] / a[3]),
        pct: (a[3] / pts.length) * 100,
        fx: ((bp % w) + 0.5) / w,
        fy: (Math.floor(bp / w) + 0.5) / h,
      };
    })
    .filter((x) => x && x.pct >= 1)
    .sort((a, b) => b.pct - a.pct);
}

export { SamplerCanvas, posterLUT, greyToL, lToGrey, computeLuminosityHist, extractPalette, POSTER_STEPS };
