/* Shareable study links: #s=<lessonId>.<pin>~<pin>~...
   where each pin is num,fx,fy,hex,label. "~" is the record separator,
   so it must be escaped inside labels — encodeURIComponent leaves it
   alone (RFC 3986 unreserved), hence the explicit %7E replacement. */
const HEX_RE = /^#[0-9A-F]{6}$/;

export function encodeStudy(lessonId, pins) {
  const enc = pins.map((p) =>
    [
      p.num,
      p.fx.toFixed(4),
      p.fy.toFixed(4),
      p.hex.slice(1),
      encodeURIComponent(p.label || "").replace(/~/g, "%7E"),
    ].join(",")
  ).join("~");
  return `#s=${lessonId}.${enc}`;
}

export function decodeStudy(hash, validLessonIds) {
  const m = String(hash).match(/^#s=([a-z]+)\.(.+)$/);
  if (!m || !validLessonIds.includes(m[1])) return null;
  try {
    const pins = m[2].split("~").map((s) => {
      const [num, fx, fy, hx, label] = s.split(",");
      return {
        num: Number(num), fx: Number(fx), fy: Number(fy),
        hex: "#" + String(hx).toUpperCase(),
        label: decodeURIComponent(label || "") || undefined,
      };
    }).filter((p) =>
      p.num > 0 && p.fx >= 0 && p.fx <= 1 && p.fy >= 0 && p.fy <= 1 && HEX_RE.test(p.hex)
    );
    return pins.length ? { lessonId: m[1], pins } : null;
  } catch (e) {
    return null;
  }
}
