"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Action = "clarify" | "expand" | "decide" | "express";

const ACT: Record<Action, { icon: string; color: string; label: string }> = {
  clarify: { icon: "◎", color: "#6B8AFE", label: "Clarify" },
  expand: { icon: "✦", color: "#FF9090", label: "Expand" },
  decide: { icon: "⟁", color: "#7ED6A8", label: "Decide" },
  express: { icon: "◈", color: "#C4A6FF", label: "Express" },
};

const DIM_COLORS = ["#FF9090", "#6B8AFE", "#7ED6A8", "#C4A6FF", "#E8C97A"];

interface QA { question: string; answer: string; }
interface Dimension { label: string; description: string; }
interface Discovery { id: string; text: string; dimLabel: string; discipline?: string; createdAt: string; }

function MobileCanvasInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const capture = sp.get("capture") || "";
  const mode = sp.get("mode") || "clarity";
  let qasParam: QA[] = [];
  try { qasParam = JSON.parse(sp.get("qas") || "[]"); } catch { qasParam = []; }
  let dimsParam: Dimension[] = [];
  try { dimsParam = JSON.parse(sp.get("dimensions") || "[]"); } catch { dimsParam = []; }

  const [dimensions] = useState<Dimension[]>(dimsParam);
  const [dimStatus, setDimStatus] = useState<Record<string, "untouched" | "in_progress" | "complete">>({});
  const [dimAnswers, setDimAnswers] = useState<Record<string, { question: string; answer: string; action: string }[]>>({});
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(sp.get("session_id"));
  const [userId, setUserId] = useState<string | null>(null);

  // Init
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);

      // Init dimension status
      const status: Record<string, "untouched" | "in_progress" | "complete"> = {};
      dimensions.forEach(d => { status[d.label] = "untouched"; });
      setDimStatus(status);

      // Create session if needed
      if (!sessionId && capture) {
        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id, goal: capture, mode, qas: qasParam, dimensions,
              canvas_state: { notes: [], connections: [], discoveries: [] },
            }),
          });
          const data = await res.json();
          if (data.id) {
            setSessionId(data.id);
            const url = new URL(window.location.href);
            url.searchParams.set("session_id", data.id);
            window.history.replaceState({}, "", url.toString());
          }
        } catch { /* continue */ }
      }

      // Load existing session
      if (sessionId) {
        try {
          const res = await fetch(`/api/sessions?id=${sessionId}`);
          const data = await res.json();
          if (data.canvas_state?.discoveries?.length) {
            setDiscoveries(data.canvas_state.discoveries);
          }
        } catch { /* continue */ }
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = Object.values(dimStatus).filter(s => s === "complete").length;
  const totalQuestions = dimensions.length * 3;
  const answeredCount = Object.values(dimAnswers).reduce((sum, arr) => sum + arr.length, 0);

  const heading = completedCount === 0
    ? "Pick where to start."
    : completedCount >= dimensions.length
    ? "You covered everything."
    : "Where next?";

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      fontFamily: "'Codec Pro', sans-serif",
      padding: "0 0 40px",
    }}>
      {/* TOP BAR */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", position: "sticky", top: 0, zIndex: 10,
        background: "rgba(250,247,240,0.95)", backdropFilter: "blur(12px)",
      }}>
        <button onClick={() => router.push("/studio")} style={{
          background: "none", border: "none", fontSize: 13, color: "#000332",
          cursor: "pointer", fontFamily: "inherit", opacity: 0.5,
        }}>&larr;</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em" }}>primer</span>
        <div style={{ display: "flex", gap: 4 }}>
          {dimensions.map((d, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: dimStatus[d.label] === "complete" ? DIM_COLORS[i % DIM_COLORS.length] : "rgba(0,3,50,0.1)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* GOAL CARD */}
        <div style={{
          background: "#000332", borderRadius: 14, padding: "14px 18px",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#FF9090", marginBottom: 4 }}>YOUR GOAL</div>
          <p style={{ fontSize: 14, color: "rgba(250,247,240,0.75)", lineHeight: 1.55, fontWeight: 300 }}>
            {capture.length > 150 ? capture.slice(0, 150) + "..." : capture}
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(0,3,50,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: "linear-gradient(90deg, #FF9090, #6B8AFE, #7ED6A8, #C4A6FF)",
              width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
              transition: "width 0.4s ease-out",
            }} />
          </div>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(0,3,50,0.35)" }}>
            {answeredCount}/{totalQuestions}
          </span>
        </div>

        {/* HEADING */}
        <h1 style={{
          fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400,
          color: "#000332", marginBottom: 24, lineHeight: 1.2,
        }}>
          {heading}
        </h1>

        {/* DIMENSION CARDS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {dimensions.map((dim, i) => {
            const status = dimStatus[dim.label] || "untouched";
            const isComplete = status === "complete";
            const answers = dimAnswers[dim.label] || [];
            const color = DIM_COLORS[i % DIM_COLORS.length];
            const questionsInDim = 3;
            const subtitle = isComplete
              ? "explored"
              : answers.length > 0
              ? `${answers.length}/${questionsInDim}`
              : `${questionsInDim} questions`;

            return (
              <button
                key={dim.label}
                onClick={() => {
                  if (!isComplete) {
                    // Navigate to stickies flow for this dimension (to be built)
                    // For now, just mark as in_progress
                    setDimStatus(prev => ({ ...prev, [dim.label]: "in_progress" }));
                  }
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  width: "100%", padding: "16px 18px",
                  background: "#fff", border: "none", borderRadius: 14,
                  borderLeft: `4px solid ${color}`,
                  cursor: isComplete ? "default" : "pointer",
                  opacity: isComplete ? 0.65 : 1,
                  fontFamily: "inherit", textAlign: "left",
                  transition: "opacity 0.3s, transform 0.15s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700,
                    color: "#000332", marginBottom: 2, lineHeight: 1.3,
                  }}>
                    {dim.label}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: isComplete ? 600 : 400,
                    color: isComplete ? color : "rgba(0,3,50,0.4)",
                  }}>
                    {isComplete && "✓ "}{subtitle}
                  </div>
                  {/* Mini answer previews */}
                  {answers.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {answers.map((a, j) => (
                        <span key={j} style={{
                          fontSize: 10, color: "rgba(0,3,50,0.45)",
                          background: "rgba(0,3,50,0.03)", padding: "2px 8px",
                          borderRadius: 100, maxWidth: 140,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {a.answer.slice(0, 30)}{a.answer.length > 30 ? "..." : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {!isComplete && (
                  <span style={{ fontSize: 16, color: "rgba(0,3,50,0.2)" }}>&rarr;</span>
                )}
              </button>
            );
          })}
        </div>

        {/* SYNTHESIS BUTTON */}
        {completedCount >= dimensions.length && (
          <button
            onClick={() => {
              const params = new URLSearchParams({ capture, mode });
              if (sessionId) params.set("session_id", sessionId);
              router.push(`/session/canvas?${params.toString()}`);
            }}
            style={{
              width: "100%", padding: "16px", borderRadius: 100,
              background: "#FF9090", color: "#000332", border: "none",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", marginBottom: 32,
              animation: "mSynthGlow 2s ease-in-out infinite",
            }}
          >
            See what you found &rarr;
          </button>
        )}

        {/* DISCOVERIES FEED */}
        {discoveries.length > 0 && (
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
              color: "rgba(0,3,50,0.3)", marginBottom: 12,
            }}>
              YOUR DISCOVERIES SO FAR
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...discoveries].reverse().map((d, i) => {
                const colonIdx = d.text.indexOf(":");
                const label = colonIdx > 0 ? d.text.slice(0, colonIdx) : "";
                const rest = colonIdx > 0 ? d.text.slice(colonIdx + 1).trim() : d.text;
                const dimIdx = dimensions.findIndex(dim => dim.label === d.dimLabel);
                const dColor = dimIdx >= 0 ? DIM_COLORS[dimIdx % DIM_COLORS.length] : "#FF9090";
                return (
                  <div key={d.id || i} style={{
                    borderLeft: `3px solid ${dColor}`, paddingLeft: 12,
                  }}>
                    <div style={{ fontSize: 9, color: "rgba(0,3,50,0.3)", letterSpacing: "0.06em", marginBottom: 2 }}>
                      {d.dimLabel}
                    </div>
                    <p style={{ fontSize: 13, color: "#000332", lineHeight: 1.45 }}>
                      {label ? <><strong>{label}:</strong> {rest}</> : rest}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes mSynthGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); }
          50% { box-shadow: 0 0 12px rgba(255,144,144,0.25); }
        }
      `}</style>
    </div>
  );
}

export default function MobileCanvasPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <MobileCanvasInner />
    </Suspense>
  );
}
