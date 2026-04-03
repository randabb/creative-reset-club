"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Action = "clarify" | "expand" | "decide" | "express";

const DIM_COLORS = ["#FF9090", "#6B8AFE", "#7ED6A8", "#C4A6FF", "#E8C97A"];
const RAW_PH = ["just dump it...", "don't edit yourself...", "say it ugly first...", "what's the gut reaction...", "think out loud...", "no one's grading this...", "messy is the point..."];
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

interface QA { question: string; answer: string; }
interface Dimension { label: string; description: string; }
interface Discovery { id: string; text: string; dimLabel: string; discipline?: string; createdAt: string; }

type Screen = "picker" | "stickies" | "write";

function uid() { return crypto.randomUUID(); }

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
  const [dimAnswers, setDimAnswers] = useState<Record<string, { question: string; answer: string }[]>>({});
  const [dimQuestions, setDimQuestions] = useState<Record<string, string[]>>({});
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(sp.get("session_id"));
  const sessionIdRef = useRef<string | null>(sp.get("session_id"));

  // Navigation
  const [screen, setScreen] = useState<Screen>("picker");
  const [activeDim, setActiveDim] = useState<string>("");
  const [activeQIdx, setActiveQIdx] = useState<number>(0);
  const [writeText, setWriteText] = useState("");
  const [loadingStickies, setLoadingStickies] = useState(false);
  const [placeholder] = useState(pick(RAW_PH));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Init
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const status: Record<string, "untouched" | "in_progress" | "complete"> = {};
      dimensions.forEach(d => { status[d.label] = "untouched"; });
      setDimStatus(status);

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
            sessionIdRef.current = data.id;
            const url = new URL(window.location.href);
            url.searchParams.set("session_id", data.id);
            window.history.replaceState({}, "", url.toString());
          }
        } catch { /* continue */ }
      }

      if (sessionId) {
        try {
          const res = await fetch(`/api/sessions?id=${sessionId}`);
          const data = await res.json();
          if (data.canvas_state?.discoveries?.length) setDiscoveries(data.canvas_state.discoveries);
        } catch { /* continue */ }
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, canvas_state: { notes: [], connections: [], discoveries, dimAnswers } }),
      });
    } catch { /* silent */ }
  };

  const completedCount = Object.values(dimStatus).filter(s => s === "complete").length;
  const totalQuestions = dimensions.length * 3;
  const answeredCount = Object.values(dimAnswers).reduce((sum, arr) => sum + arr.length, 0);
  const activeDimIdx = dimensions.findIndex(d => d.label === activeDim);
  const activeColor = activeDimIdx >= 0 ? DIM_COLORS[activeDimIdx % DIM_COLORS.length] : "#FF9090";
  const activeQuestions = dimQuestions[activeDim] || [];
  const activeAnswers = dimAnswers[activeDim] || [];

  // Navigate to stickies for a dimension
  const openDimension = async (dimLabel: string) => {
    setActiveDim(dimLabel);
    setScreen("stickies");

    if (!dimQuestions[dimLabel]) {
      setLoadingStickies(true);
      try {
        const res = await fetch("/api/mobile-stickies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: capture, mode, qas: qasParam,
            dimension: dimLabel,
            previousAnswers: (dimAnswers[dimLabel] || []).map(a => a.answer).join("\n") || undefined,
          }),
        });
        const data = await res.json();
        setDimQuestions(prev => ({ ...prev, [dimLabel]: data.questions || [] }));
      } catch {
        setDimQuestions(prev => ({ ...prev, [dimLabel]: ["What's the real situation here?", "What scares you about this?", "What would you do if no one was watching?"] }));
      }
      setLoadingStickies(false);
    }
  };

  // Open write screen
  const openWrite = (qIdx: number) => {
    setActiveQIdx(qIdx);
    setWriteText("");
    setScreen("write");
    setTimeout(() => textareaRef.current?.focus(), 200);
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!writeText.trim()) return;
    const question = activeQuestions[activeQIdx] || "";
    const newAnswer = { question, answer: writeText.trim() };
    const updated = [...(dimAnswers[activeDim] || []), newAnswer];
    setDimAnswers(prev => ({ ...prev, [activeDim]: updated }));

    if (updated.length >= 3) {
      setDimStatus(prev => ({ ...prev, [activeDim]: "complete" }));
    } else {
      setDimStatus(prev => ({ ...prev, [activeDim]: "in_progress" }));
    }

    // Generate discovery
    try {
      const dRes = await fetch("/api/generate-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userResponse: writeText.trim(),
          dimensionLabel: activeDim,
          previousDiscoveries: discoveries.map(d => d.text).join("\n") || undefined,
        }),
      });
      const dData = await dRes.json();
      if (dData.discovery) {
        setDiscoveries(prev => [...prev, { id: uid(), text: dData.discovery, dimLabel: activeDim, createdAt: new Date().toISOString() }]);
      }
    } catch { /* silent */ }

    setWriteText("");
    save();

    // Go back to stickies or picker
    if (updated.length >= 3) {
      setScreen("picker");
    } else {
      setScreen("stickies");
    }
  };

  const heading = completedCount === 0
    ? "Pick where to start."
    : completedCount >= dimensions.length
    ? "You covered everything."
    : "Where next?";

  // ─── WRITE SCREEN ───
  if (screen === "write") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", fontFamily: "'Codec Pro', sans-serif", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <button onClick={() => setScreen("stickies")} style={{ background: "none", border: "none", fontSize: 13, color: "#000332", cursor: "pointer", fontFamily: "inherit", opacity: 0.5 }}>&larr; back</button>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i < activeAnswers.length + 1 ? activeColor : "rgba(0,3,50,0.08)" }} />
            ))}
          </div>
        </div>

        <div style={{ padding: "0 24px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: activeColor, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
            {activeDim.toUpperCase()}
          </div>
          <h2 style={{
            fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700,
            color: "#000332", lineHeight: 1.35, marginBottom: 24,
            animation: "mFadeUp 0.3s ease-out forwards",
          }}>
            {activeQuestions[activeQIdx] || "What comes to mind?"}
          </h2>

          <textarea
            ref={textareaRef}
            value={writeText}
            onChange={e => setWriteText(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1, width: "100%", border: "none", outline: "none",
              resize: "none", background: "transparent",
              fontFamily: "'Codec Pro', sans-serif", fontSize: 17,
              lineHeight: 1.65, color: "#000332", minHeight: 200,
            }}
          />

          <div style={{ padding: "16px 0 32px" }}>
            <div style={{ fontSize: 11, color: "rgba(0,3,50,0.2)", fontFamily: "'DM Mono', monospace", textAlign: "center", marginBottom: 12 }}>
              first drafts only.
            </div>
            <button
              onClick={submitAnswer}
              disabled={!writeText.trim()}
              className="done-btn"
              style={{
                width: "100%", padding: "16px", borderRadius: 100,
                background: writeText.trim() ? activeColor : "rgba(0,3,50,0.06)",
                color: writeText.trim() ? "#000332" : "rgba(0,3,50,0.25)",
                border: "none", fontSize: 15, fontWeight: 700,
                cursor: writeText.trim() ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.2s, transform 0.1s",
              }}
            >Done</button>
          </div>
        </div>

        <style>{`@keyframes mFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .done-btn:active { transform: scale(0.97); }`}</style>
      </div>
    );
  }

  // ─── STICKIES BROWSE SCREEN ───
  if (screen === "stickies") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", fontFamily: "'Codec Pro', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <button onClick={() => setScreen("picker")} style={{ background: "none", border: "none", fontSize: 13, color: "#000332", cursor: "pointer", fontFamily: "inherit", opacity: 0.5 }}>&larr; dimensions</button>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i < activeAnswers.length ? activeColor : "rgba(0,3,50,0.08)", transition: "background 0.3s" }} />
            ))}
          </div>
        </div>

        <div style={{ padding: "0 20px 40px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: activeColor, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
            {activeDim.toUpperCase()}
          </div>
          <p style={{ fontSize: 14, color: "rgba(0,3,50,0.4)", marginBottom: 24, fontWeight: 300 }}>
            Pick the question that pulls you
          </p>

          {loadingStickies ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ width: 20, height: 20, border: `2px solid ${activeColor}30`, borderTopColor: activeColor, borderRadius: "50%", animation: "mSpin 0.7s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "rgba(0,3,50,0.35)" }}>Generating questions...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeQuestions.map((q, i) => {
                const isAnswered = i < activeAnswers.length;
                const isNext = i === activeAnswers.length;
                return (
                  <button
                    key={i}
                    onClick={() => { if (!isAnswered) openWrite(i); }}
                    style={{
                      width: "100%", padding: "20px 20px",
                      background: "#fff", border: "none", borderRadius: 16,
                      textAlign: "left", cursor: isAnswered ? "default" : "pointer",
                      fontFamily: "inherit",
                      opacity: isAnswered ? 0.5 : 1,
                      transform: isNext ? "scale(1.02)" : "scale(1)",
                      boxShadow: isNext ? `0 4px 16px ${activeColor}15` : "0 1px 4px rgba(0,0,0,0.03)",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{
                        fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700,
                        color: "#000332", lineHeight: 1.4, flex: 1,
                      }}>
                        {q}
                      </p>
                      {isAnswered && <span style={{ color: activeColor, fontSize: 16, marginLeft: 8, flexShrink: 0 }}>✓</span>}
                    </div>
                    {isAnswered && activeAnswers[i] && (
                      <p style={{ fontSize: 13, color: "rgba(0,3,50,0.4)", fontWeight: 300, marginTop: 6, lineHeight: 1.45 }}>
                        {activeAnswers[i].answer.slice(0, 80)}{activeAnswers[i].answer.length > 80 ? "..." : ""}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeAnswers.length === 0 && !loadingStickies && (
            <p style={{ textAlign: "center", fontSize: 12, color: "rgba(0,3,50,0.25)", marginTop: 24, fontFamily: "'DM Mono', monospace" }}>
              tap a question to answer it
            </p>
          )}
        </div>

        <style>{`@keyframes mSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── DIMENSION PICKER SCREEN ───
  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F0", fontFamily: "'Codec Pro', sans-serif", padding: "0 0 40px" }}>
      {/* TOP BAR */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", position: "sticky", top: 0, zIndex: 10,
        background: "rgba(250,247,240,0.95)", backdropFilter: "blur(12px)",
      }}>
        <button onClick={() => router.push("/studio")} style={{ background: "none", border: "none", fontSize: 13, color: "#000332", cursor: "pointer", fontFamily: "inherit", opacity: 0.5 }}>&larr;</button>
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
        <div style={{ background: "#000332", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
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
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: "#000332", marginBottom: 24, lineHeight: 1.2 }}>
          {heading}
        </h1>

        {/* DIMENSION CARDS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {dimensions.map((dim, i) => {
            const status = dimStatus[dim.label] || "untouched";
            const isComplete = status === "complete";
            const answers = dimAnswers[dim.label] || [];
            const color = DIM_COLORS[i % DIM_COLORS.length];
            const subtitle = isComplete ? "explored" : answers.length > 0 ? `${answers.length}/3` : "3 questions";

            return (
              <button
                key={dim.label}
                onClick={() => { if (!isComplete) openDimension(dim.label); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  width: "100%", padding: "16px 18px",
                  background: "#fff", border: "none", borderRadius: 14,
                  borderLeft: `4px solid ${color}`,
                  cursor: isComplete ? "default" : "pointer",
                  opacity: isComplete ? 0.65 : 1,
                  fontFamily: "inherit", textAlign: "left",
                  transition: "opacity 0.3s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: "#000332", marginBottom: 2, lineHeight: 1.3 }}>
                    {dim.label}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: isComplete ? 600 : 400, color: isComplete ? color : "rgba(0,3,50,0.4)" }}>
                    {isComplete && "✓ "}{subtitle}
                  </div>
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
                {!isComplete && <span style={{ fontSize: 16, color: "rgba(0,3,50,0.2)" }}>&rarr;</span>}
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

        {/* DISCOVERIES */}
        {discoveries.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(0,3,50,0.3)", marginBottom: 12 }}>
              YOUR DISCOVERIES SO FAR
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...discoveries].reverse().map((d, i) => {
                const colonIdx = d.text.indexOf(":");
                const label = colonIdx > 0 ? d.text.slice(0, colonIdx) : "";
                const rest = colonIdx > 0 ? d.text.slice(colonIdx + 1).trim() : d.text;
                const dIdx = dimensions.findIndex(dim => dim.label === d.dimLabel);
                const dColor = dIdx >= 0 ? DIM_COLORS[dIdx % DIM_COLORS.length] : "#FF9090";
                return (
                  <div key={d.id || i} style={{ borderLeft: `3px solid ${dColor}`, paddingLeft: 12 }}>
                    <div style={{ fontSize: 9, color: "rgba(0,3,50,0.3)", letterSpacing: "0.06em", marginBottom: 2 }}>{d.dimLabel}</div>
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

      <style>{`@keyframes mSynthGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); } 50% { box-shadow: 0 0 12px rgba(255,144,144,0.25); } }`}</style>
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
