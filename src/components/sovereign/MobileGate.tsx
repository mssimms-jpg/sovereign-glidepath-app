import { useEffect, useState } from "react";

const DISMISS_KEY = "sg_mobile_gate_dismissed_v2";
const BREAKPOINT = 900;

export function MobileGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* private mode — fall through */
    }
    setShow(window.innerWidth < BREAKPOINT);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore — still hide for this session */
    }
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(8, 12, 22, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "linear-gradient(180deg,#101827,#0b1220)",
          border: "1px solid #1f2a44",
          borderRadius: 14,
          padding: "1.5rem 1.25rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 8 }}>🖥️</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>
          Best viewed on a larger screen
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: 14, lineHeight: 1.5, color: "#cbd5e1" }}>
          <strong>Sovereign Glidepath</strong> is a desktop-class dashboard with
          dense tables and interactive charts. For the best experience, please
          open it on a laptop or desktop.
        </p>
        <button
          onClick={dismiss}
          style={{
            display: "inline-block",
            padding: "0.6rem 1.1rem",
            background: "#2563eb",
            color: "white",
            border: 0,
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Continue anyway
        </button>
        <p style={{ margin: "0.85rem 0 0", fontSize: 11, color: "#64748b" }}>
          You can dismiss this and explore — layout may be cramped.
        </p>
      </div>
    </div>
  );
}
