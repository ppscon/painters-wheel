import { T } from "./ui.jsx";
import { SamplerCanvas } from "./SamplerCanvas.jsx";
import { LESSONS } from "../data/lessons.js";
/* ---------------- Lessons view ------------------------------------ */
function LessonsView({ lessonId, setLessonId, pins, activePinId, onAddPin, onSelectPin }) {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 16 }}>
        {LESSONS.map((l) => {
          const active = l.id === lessonId;
          return (
            <button key={l.id} onClick={() => setLessonId(l.id)} style={{
              textAlign: "left", padding: "10px 12px", borderRadius: 5, cursor: "pointer",
              background: active ? T.panel2 : "transparent",
              border: `1px solid ${active ? T.ochre : T.line}`, fontFamily: "inherit",
            }}>
              <div className="mono" style={{ fontSize: 10, color: active ? T.ochre : T.faint, letterSpacing: 1 }}>
                Lesson {l.num}
              </div>
              <div className="display" style={{ fontSize: 19, color: active ? T.bone : T.muted, marginTop: 2 }}>
                {l.concept}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: 4 }}>
        <div className="display" style={{ fontSize: 22, color: T.bone }}>{lesson.title}</div>
        <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>{lesson.artist}</div>
      </div>
      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, margin: "8px 0 14px" }}>{lesson.intro}</p>

      <div style={{
        background: T.panel2, border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.ochre}`,
        borderRadius: 4, padding: "12px 14px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: T.ochre, marginBottom: 8 }}>
          {lesson.howTo ? "How to use the app" : "Exercises"}
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, color: T.bone, fontSize: 13, lineHeight: 1.65 }}>
          {lesson.exercises.map((ex, i) => (
            <li key={i} style={{ marginBottom: 7 }}>{ex}</li>
          ))}
        </ol>
      </div>

      <SamplerCanvas source={lesson.source} pins={pins} activePinId={activePinId}
        onAddPin={onAddPin} onSelectPin={onSelectPin} />
      <p style={{ color: T.faint, fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
        {lesson.credit} Sampled colours reflect the reproduction, not raw pigment; treat matches as
        studio guidance.
      </p>
    </div>
  );
}

export { LessonsView };
