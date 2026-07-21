import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#1B1512", color: "#EDE4D3",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{ maxWidth: 460, textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#C9962E" }}>
              The Painter's Wheel
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 500, margin: "10px 0" }}>Something went wrong</h1>
            <p style={{ color: "#9C8F78", fontSize: 14, lineHeight: 1.6 }}>
              An unexpected error stopped the app. Reloading usually fixes it; your pins, palette
              and paintbox are saved in this browser and will still be here.
            </p>
            <p style={{ color: "#9B8D72", fontSize: 11, fontFamily: "ui-monospace, monospace", marginTop: 8, wordBreak: "break-word" }}>
              {String((this.state.error && this.state.error.message) || this.state.error)}
            </p>
            <button onClick={() => window.location.reload()} style={{
              marginTop: 14, padding: "10px 22px", background: "#C9962E", color: "#1B1512",
              border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12,
              letterSpacing: 2, textTransform: "uppercase", fontFamily: "inherit",
            }}>
              Reload
            </button>
            <button
              onClick={() => {
                try { window.localStorage.removeItem("painters-wheel-v1"); } catch (e) { /* ignore */ }
                window.location.reload();
              }}
              style={{
                marginTop: 14, marginLeft: 10, padding: "10px 22px", background: "transparent",
                color: "#9C8F78", border: "1px solid #4A4030", borderRadius: 4, cursor: "pointer",
                fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: "inherit",
              }}>
              Reset saved data
            </button>
            <p style={{ color: "#9B8D72", fontSize: 11, marginTop: 10 }}>
              If reloading doesn't help, resetting clears saved pins and palette — a corrupted save
              can otherwise keep the error coming back.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
