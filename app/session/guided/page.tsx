"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const FALLBACKS: Record<string, string[]> = {
  clarity: [
    "What's the core thing you're trying to figure out?",
    "What's hiding underneath that?",
  ],
  expansion: [
    "What excites you about this right now?",
    "What angle haven't you considered yet?",
  ],
  decision: [
    "What's the actual decision here?",
    "What are you really afraid of choosing?",
  ],
  expression: [
    "What's the thing you're trying to say?",
    "What tension does your audience need to feel?",
  ],
};

interface QA {
  question: string;
  answer: string;
}

function GuidedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const capture = searchParams.get("capture") || "";
  const [mode, setMode] = useState(searchParams.get("mode") || "clarity");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MODES: { id: string; icon: string; color: string; label: string }[] = [
    { id: "clarity", icon: "◎", color: "#6B8AFE", label: "Clarity" },
    { id: "expansion", icon: "✦", color: "#FF9090", label: "Expansion" },
    { id: "decision", icon: "⟁", color: "#7ED6A8", label: "Decision" },
    { id: "expression", icon: "◈", color: "#C4A6FF", label: "Expression" },
  ];
  const currentMode = MODES.find(m => m.id === mode) || MODES[0];
  const [modeDropdown, setModeDropdown] = useState(false);

  const [qas, setQas] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [loadingQ, setLoadingQ] = useState(true);
  const [loadingLong, setLoadingLong] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(true);
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reflection, setReflection] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const dimPromiseRef = useRef<Promise<{ label: string; description: string }[]> | null>(null);

  const getFallback = useCallback((qNum: number) => {
    const fb = FALLBACKS[mode] || FALLBACKS.clarity;
    return fb[qNum - 1] || fb[0];
  }, [mode]);

  const fetchQuestion = useCallback(async (qNum: number, prevQAs: QA[]) => {
    setCurrentQuestion("");
    setLoadingQ(true);
    setLoadingLong(false);

    const longTimer = setTimeout(() => setLoadingLong(true), 5000);
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          capture,
          previousQAs: prevQAs,
          questionNumber: qNum,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      setCurrentQuestion(data.question || getFallback(qNum));
    } catch {
      setCurrentQuestion(getFallback(qNum));
    }

    clearTimeout(longTimer);
    clearTimeout(abortTimer);
    setLoadingQ(false);
    setLoadingLong(false);

    // Collapse capture card after Q1 loads
    if (qNum > 1) setCaptureOpen(false);

    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [mode, capture, getFallback]);

  useEffect(() => {
    if (!capture) { router.push("/session/new"); return; }
    fetchQuestion(1, []);
  }, [capture, router, fetchQuestion]);

  const handleNext = async () => {
    if (answer.trim().length < 15) return;

    const newQA: QA = { question: currentQuestion, answer: answer.trim() };
    const updatedQAs = [...qas, newQA];
    const currentQNum = questionNumber;
    setQas(updatedQAs);
    setAnswer("");
    setTyping(false);
    setCaptureOpen(false);
    setCurrentQuestion("");
    setLoadingQ(currentQNum < 2); // only show loading for non-final questions

    // Fetch reflection (non-blocking, 3s timeout)
    let reflectionText = "";
    try {
      const reflRes = await fetch("/api/thinking-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionNumber: currentQNum,
          userAnswer: newQA.answer,
          capture,
          previousQAs: updatedQAs,
        }),
      });
      const reflData = await reflRes.json();
      reflectionText = reflData.reflection || "";
    } catch { /* skip reflection */ }

    // Show reflection if we got one
    if (reflectionText) {
      setLoadingQ(false);
      setReflection(reflectionText);
      await new Promise(r => setTimeout(r, 400));
      setShowReflection(true);
      const holdTime = currentQNum >= 2 ? 3000 : 2500;
      await new Promise(r => setTimeout(r, holdTime));
      setShowReflection(false);
      await new Promise(r => setTimeout(r, 300));
      setReflection("");
    }

    // After Q1: start generating dimensions in background
    if (currentQNum === 1) {
      dimPromiseRef.current = fetch("/api/session-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: capture, mode, qas: updatedQAs }),
      }).then(r => r.json()).then(data => data.dimensions || []).catch(() => []);
    }

    if (currentQNum >= 2) {
      // Re-fire with full data (Q1+Q2) — use whichever finishes
      const fullDimPromise = fetch("/api/session-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: capture, mode, qas: updatedQAs }),
      }).then(r => r.json()).then(data => data.dimensions || []).catch(() => []);

      // Wait for the best available dimensions (full data or Q1-only)
      let dims: { label: string; description: string }[] = [];
      try {
        dims = await Promise.race([
          fullDimPromise,
          new Promise<{ label: string; description: string }[]>(resolve =>
            setTimeout(async () => {
              // If full call is slow, use Q1-only result
              if (dimPromiseRef.current) {
                const fallback = await dimPromiseRef.current;
                if (fallback.length > 0) resolve(fallback);
              }
            }, 3000)
          ),
        ]);
        if (!dims.length) dims = await fullDimPromise;
      } catch {
        dims = [];
      }

      // Navigate directly to canvas, skip plan page
      const params = new URLSearchParams({
        capture,
        mode,
        qas: JSON.stringify(updatedQAs),
        dimensions: JSON.stringify(dims),
      });
      router.push(`/session/canvas?${params.toString()}`);
      return;
    }

    const nextQ = currentQNum + 1;
    setQuestionNumber(nextQ);
    await fetchQuestion(nextQ, updatedQAs);
  };

  const useFallback = () => {
    setCurrentQuestion(getFallback(questionNumber));
    setLoadingQ(false);
    setLoadingLong(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const canSubmit = answer.trim().length >= 15;
  const showHint = typing && answer.trim().length > 0 && answer.trim().length < 15;
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px 80px",
      fontFamily: "'Codec Pro', sans-serif",
    }}>
      {/* Logo + mode label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em" }}>
          primer
        </div>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setModeDropdown(!modeDropdown)}
            style={{
              background: "none", border: `1px solid ${currentMode.color}30`,
              borderRadius: 100, padding: "4px 12px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: currentMode.color,
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {currentMode.icon} {currentMode.label} <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
          </button>
          {modeDropdown && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 4,
              background: "#fff", borderRadius: 10, padding: 6,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 10,
              minWidth: 160,
            }}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setModeDropdown(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "8px 12px", border: "none",
                    background: mode === m.id ? "rgba(0,3,50,0.04)" : "transparent",
                    borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, color: "#000332", fontWeight: mode === m.id ? 600 : 400,
                  }}
                >
                  <span style={{ color: m.color, fontSize: 14 }}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 560, width: "100%" }}>
        {/* Capture card */}
        <div style={{
          background: "#000332", borderRadius: 14, marginBottom: 28,
          overflow: "hidden", transition: "all 0.25s ease",
        }}>
          <button
            onClick={() => setCaptureOpen(!captureOpen)}
            style={{
              width: "100%", padding: "16px 20px",
              background: "transparent", border: "none",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#FF9090" }}>
              Your original thought
            </span>
            <span style={{ fontSize: 14, color: "rgba(250,247,240,0.4)", transition: "transform 0.2s", transform: captureOpen ? "rotate(180deg)" : "" }}>
              ▾
            </span>
          </button>
          {captureOpen && (
            <div style={{ padding: "0 20px 18px" }}>
              <p style={{ fontSize: 14, color: "rgba(250,247,240,0.7)", lineHeight: 1.7, fontWeight: 300 }}>
                {capture}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 36, justifyContent: "center" }}>
          {[1, 2].map((i) => (
            <div key={i} style={{
              width: 48, height: 3, borderRadius: 2,
              background: "rgba(0,3,50,0.08)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: 2,
                background: "#FF9090",
                transform: i <= questionNumber ? "scaleX(1)" : "scaleX(0)",
                transformOrigin: "left",
                transition: "transform 0.4s ease-out",
              }} />
            </div>
          ))}
        </div>

        {/* Previous Q&As */}
        {qas.map((qa, i) => (
          <div key={i} style={{ marginBottom: 20, opacity: 0.4 }}>
            <p style={{ fontSize: 14, color: "#000332", fontStyle: "italic", fontWeight: 300, marginBottom: 6 }}>
              {qa.question}
            </p>
            <p style={{
              fontSize: 14, color: "#000332", lineHeight: 1.65, fontWeight: 300,
              paddingLeft: 14, borderLeft: "2px solid #FF9090",
            }}>
              {qa.answer}
            </p>
          </div>
        ))}

        {/* Reflection, loading, or question */}
        {reflection ? (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            opacity: showReflection ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}>
            <p style={{
              fontSize: 15, color: "#000332",
              fontFamily: "'Codec Pro', sans-serif", lineHeight: 1.55, maxWidth: 400, fontWeight: 400,
              margin: "0 auto",
            }}>
              {reflection}
            </p>
          </div>
        ) : loadingQ ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: 20, height: 20, border: "2px solid rgba(255,144,144,0.2)",
              borderTopColor: "#FF9090", borderRadius: "50%",
              animation: "qSpin 0.8s linear infinite",
              margin: "0 auto 14px",
            }} />
            <p style={{ fontSize: 14, color: "rgba(0,3,50,0.4)", fontWeight: 300 }}>
              {questionNumber === 1 ? "Reading your thinking..." : "Going deeper..."}
            </p>
            {loadingLong && (
              <button
                onClick={useFallback}
                style={{
                  marginTop: 16, background: "none", border: "1px solid rgba(0,3,50,0.12)",
                  borderRadius: 100, padding: "8px 20px", fontSize: 12,
                  color: "rgba(0,3,50,0.45)", cursor: "pointer",
                  fontFamily: "'Codec Pro', sans-serif",
                }}
              >
                Taking a while? Continue with next question
              </button>
            )}
            <style>{`@keyframes qSpin { to { transform: rotate(360deg); } }
            @keyframes guidedFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          </div>
        ) : (
          <>
            {/* Question */}
            <div key={`q${questionNumber}`} style={{ textAlign: "center", marginBottom: 28, animation: "guidedFadeIn 0.3s ease-out forwards" }}>
              <p style={{
                fontSize: 21, fontWeight: 400, fontStyle: "italic",
                color: "#000332", lineHeight: 1.45, letterSpacing: "-0.01em",
              }}>
                {currentQuestion}
              </p>
            </div>

            {/* Answer textarea */}
            <div style={{ position: "relative" }}>
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => { setAnswer(e.target.value); setTyping(true); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey && canSubmit) handleNext();
                }}
                placeholder="Write your answer..."
                style={{
                  width: "100%", minHeight: 140, padding: "20px 20px",
                  border: `1.5px solid ${focused ? "#FF9090" : "rgba(0,3,50,0.1)"}`,
                  borderRadius: 12, background: "#fff",
                  fontFamily: "'Codec Pro', sans-serif",
                  fontSize: 15, lineHeight: 1.75, color: "#000332",
                  resize: "vertical", outline: "none",
                  transition: "border-color 0.2s ease",
                }}
              />
              {/* Word count */}
              {typing && wordCount > 0 && (
                <div style={{
                  position: "absolute", bottom: 10, right: 14,
                  fontSize: 11, color: "rgba(0,3,50,0.2)",
                }}>
                  {wordCount} {wordCount === 1 ? "word" : "words"}
                </div>
              )}
            </div>

            {/* Hint */}
            {showHint && (
              <p style={{
                fontSize: 12, color: "#FF9090", opacity: 0.7,
                marginTop: 8, fontWeight: 300,
              }}>
                Go a little deeper. A few more sentences.
              </p>
            )}

            {/* Next button */}
            <button
              onClick={handleNext}
              disabled={!canSubmit}
              style={{
                marginTop: 20, width: "100%",
                padding: "16px", borderRadius: 100,
                background: canSubmit ? "#FF9090" : "rgba(0,3,50,0.06)",
                color: canSubmit ? "#000332" : "rgba(0,3,50,0.25)",
                border: "none", fontSize: 15, fontWeight: 700,
                cursor: canSubmit ? "pointer" : "default",
                fontFamily: "'Codec Pro', sans-serif",
                transition: "all 0.25s ease",
              }}
            >
              {questionNumber >= 2 ? "Finish thinking" : "Next"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GuidedPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <GuidedInner />
    </Suspense>
  );
}
