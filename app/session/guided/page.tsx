"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const FALLBACKS: Record<string, string[]> = {
  clarity: [
    "What's the core thing you're trying to figure out?",
    "What are you assuming is true here that you haven't tested?",
    "Why does this matter to you? Go one layer deeper.",
    "Of everything you've said, what's the one thread that makes everything else fall into place?",
  ],
  expansion: [
    "What excites you about this right now?",
    "What would someone completely outside your world find interesting here?",
    "Remove the most obvious part of this. What's left?",
    "Which angle surprised you most?",
  ],
  decision: [
    "What's the actual decision? Say it as simply as you can.",
    "If you had to choose right now, in 10 seconds, what would you pick?",
    "Imagine that choice failed spectacularly. What went wrong?",
    "What would have to be true for you to feel confident?",
  ],
  expression: [
    "What's the thing you're trying to say?",
    "If you could only say one sentence, what would it be?",
    "What does your audience already agree with, and what tension are you introducing?",
    "What's the strongest argument against your position?",
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
  const mode = searchParams.get("mode") || "clarity";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const getFallback = useCallback((qNum: number) => {
    const fb = FALLBACKS[mode] || FALLBACKS.clarity;
    return fb[qNum - 1] || fb[0];
  }, [mode]);

  const fetchQuestion = useCallback(async (qNum: number, prevQAs: QA[]) => {
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
    setLoadingQ(true);

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
      const holdTime = currentQNum >= 4 ? 3000 : 2500;
      await new Promise(r => setTimeout(r, holdTime));
      setShowReflection(false);
      await new Promise(r => setTimeout(r, 300));
      setReflection("");
    }

    if (currentQNum >= 4) {
      const params = new URLSearchParams({
        capture,
        mode,
        qas: JSON.stringify(updatedQAs),
      });
      router.push(`/session/plan?${params.toString()}`);
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
      {/* Logo */}
      <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 40 }}>
        primer
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              width: 48, height: 3, borderRadius: 2,
              background: i < questionNumber ? "#FF9090" : i === questionNumber ? "#FF9090" : "rgba(0,3,50,0.08)",
              opacity: i <= questionNumber ? 1 : 0.4,
              transition: "all 0.3s ease",
            }} />
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
              fontSize: 15, fontStyle: "italic", color: "#000332",
              fontFamily: "Georgia, serif", lineHeight: 1.55, maxWidth: 400,
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
            <style>{`@keyframes qSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Question */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
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
              {questionNumber >= 4 ? "Finish thinking" : "Next"}
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
