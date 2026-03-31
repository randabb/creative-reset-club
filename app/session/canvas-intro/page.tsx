"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CanvasIntroInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const capture = searchParams.get("capture") || "";
  const mode = searchParams.get("mode") || "clarity";
  const qas = searchParams.get("qas") || "[]";

  const enter = () => {
    localStorage.setItem("primer-canvas-intro-seen", "true");
    const params = new URLSearchParams({ capture, mode, qas });
    router.push(`/session/plan?${params.toString()}`);
  };

  const actions = [
    { icon: "◎", color: "#6B8AFE", label: "Clarify", desc: "Cut to the core of a note" },
    { icon: "✦", color: "#FF9090", label: "Expand", desc: "Stretch it in a new direction" },
    { icon: "⟁", color: "#7ED6A8", label: "Decide", desc: "Stress-test and evaluate" },
    { icon: "◈", color: "#C4A6FF", label: "Express", desc: "Articulate it clearly" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#000332",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px",
      fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        {/* Pulsing core */}
        <div style={{ position: "relative", width: 52, height: 52, margin: "0 auto 36px" }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%", background: "#FF9090",
            position: "absolute", top: 18, left: 18,
            animation: "ciPulse 3s ease-in-out infinite",
          }} />
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid rgba(255,144,144,0.3)",
            position: "absolute", top: 10, left: 10,
            animation: "ciRing 3s ease-in-out infinite",
          }} />
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            border: "1px solid rgba(255,144,144,0.15)",
            position: "absolute", top: 0, left: 0,
            animation: "ciRing 3s ease-in-out infinite 0.5s",
          }} />
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 400, fontStyle: "italic",
          color: "#FAF7F0", lineHeight: 1.35, letterSpacing: "-0.01em",
          marginBottom: 16,
        }}>
          Your thinking is ready for the canvas.
        </h1>

        <p style={{
          fontSize: 15, color: "rgba(250,247,240,0.45)",
          fontWeight: 300, lineHeight: 1.65, marginBottom: 44,
          maxWidth: 420, margin: "0 auto 44px",
        }}>
          Everything you wrote will appear as moveable notes. Drag them around, connect ideas, and use the four thinking actions to go further.
        </p>

        {/* Action guide */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10, marginBottom: 36, textAlign: "left",
        }}>
          {actions.map((a) => (
            <div key={a.label} style={{
              padding: "16px 18px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <span style={{ fontSize: 20, color: a.color, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FAF7F0", marginBottom: 2 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: "rgba(250,247,240,0.45)", fontWeight: 300 }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "rgba(250,247,240,0.25)", marginBottom: 28 }}>
          Select a note, then choose an action.
        </p>

        <button
          onClick={enter}
          style={{
            background: "#FF9090", color: "#000332",
            border: "none", padding: "16px 40px", borderRadius: 100,
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Codec Pro', sans-serif",
          }}
        >
          Enter your canvas
        </button>
      </div>

      <style>{`
        @keyframes ciPulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.15); opacity:0.8; } }
        @keyframes ciRing { 0%,100% { transform:scale(1); opacity:0.3; } 50% { transform:scale(1.15); opacity:0; } }
      `}</style>
    </div>
  );
}

export default function CanvasIntroPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#000332", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(250,247,240,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <CanvasIntroInner />
    </Suspense>
  );
}
