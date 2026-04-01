"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "clarity" | "expansion" | "decision" | "expression";

const MODES: { id: Mode; icon: string; color: string; label: string; desc: string }[] = [
  { id: "clarity", icon: "◎", color: "#6B8AFE", label: "Clarity", desc: "Untangle and find the core" },
  { id: "expansion", icon: "✦", color: "#FF9090", label: "Expansion", desc: "Stretch it in new directions" },
  { id: "decision", icon: "⟁", color: "#7ED6A8", label: "Decision", desc: "Evaluate and commit" },
  { id: "expression", icon: "◈", color: "#C4A6FF", label: "Expression", desc: "Articulate it clearly" },
];

function ModeInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const capture = sp.get("capture") || "";

  const [suggested, setSuggested] = useState<{ mode: Mode; reason: string } | null>(null);
  const [selected, setSelected] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!capture) { router.push("/session/new"); return; }
    const fetchSuggestion = async () => {
      try {
        const res = await fetch("/api/suggest-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capture }),
        });
        const data = await res.json();
        setSuggested({ mode: data.mode, reason: data.reason });
        setSelected(data.mode);
      } catch {
        setSuggested({ mode: "clarity", reason: "Let's start by getting clear on what you're thinking through." });
        setSelected("clarity");
      }
      setLoading(false);
    };
    fetchSuggestion();
  }, [capture, router]);

  const confirm = () => {
    if (!selected) return;
    const params = new URLSearchParams({ capture, mode: selected });
    router.push(`/session/guided?${params.toString()}`);
  };

  if (!capture) return null;

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px 80px", fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 40 }}>
        primer
      </div>

      <div style={{ maxWidth: 520, width: "100%" }}>
        {/* Capture card */}
        <div style={{ background: "#000332", borderRadius: 12, padding: "14px 18px", marginBottom: 36 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 6 }}>Your thought</p>
          <p style={{ fontSize: 13, color: "rgba(250,247,240,0.7)", lineHeight: 1.6, fontWeight: 300 }}>
            {capture.length > 120 ? capture.slice(0, 120) + "..." : capture}
          </p>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 400, fontStyle: "italic", color: "#000332", textAlign: "center", marginBottom: 32 }}>
          What kind of thinking do you need?
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ width: 18, height: 18, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "modeSpin 0.7s linear infinite", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "rgba(0,3,50,0.4)", fontWeight: 300 }}>Reading your thinking...</p>
          </div>
        ) : (
          <>
            {/* AI suggestion */}
            {suggested && (
              <div style={{
                background: "#fff", borderRadius: 14, padding: "20px 22px",
                border: `2px solid ${MODES.find(m => m.id === suggested.mode)?.color || "#FF9090"}`,
                marginBottom: 12, cursor: "pointer",
              }} onClick={() => setSelected(suggested.mode)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090" }}>Suggested</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, color: MODES.find(m => m.id === suggested.mode)?.color }}>{MODES.find(m => m.id === suggested.mode)?.icon}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#000332" }}>{MODES.find(m => m.id === suggested.mode)?.label}</span>
                </div>
                <p style={{ fontSize: 14, color: "rgba(0,3,50,0.55)", fontWeight: 300, lineHeight: 1.55 }}>{suggested.reason}</p>
              </div>
            )}

            {/* Confirm or pick different */}
            {selected === suggested?.mode && (
              <button onClick={confirm} style={{
                width: "100%", padding: "16px", borderRadius: 100,
                background: "#FF9090", color: "#000332", border: "none",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", marginBottom: 24,
              }}>
                Yes, let&rsquo;s go
              </button>
            )}

            <p style={{ fontSize: 12, color: "rgba(0,3,50,0.3)", textAlign: "center", marginBottom: 12, fontWeight: 300 }}>
              Or pick a different mode:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MODES.filter(m => m.id !== suggested?.mode).map(m => (
                <button key={m.id} onClick={() => setSelected(m.id)} style={{
                  width: "100%", padding: "16px 20px", textAlign: "left",
                  background: selected === m.id ? "#fff" : "#fff",
                  border: `1.5px solid ${selected === m.id ? "#FF9090" : "rgba(0,3,50,0.08)"}`,
                  borderLeft: `3px solid ${m.color}`,
                  borderRadius: 12, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, color: m.color }}>{m.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#000332" }}>{m.label}</span>
                    <span style={{ fontSize: 13, color: "rgba(0,3,50,0.4)", fontWeight: 300, marginLeft: 4 }}>— {m.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            {selected && selected !== suggested?.mode && (
              <button onClick={confirm} style={{
                width: "100%", padding: "16px", borderRadius: 100,
                background: "#FF9090", color: "#000332", border: "none",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", marginTop: 20,
              }}>
                Let&rsquo;s go
              </button>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes modeSpin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ModePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <ModeInner />
    </Suspense>
  );
}
