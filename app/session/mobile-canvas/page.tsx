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

type Screen = "picker" | "stickies" | "write" | "discovery" | "synthesis";

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
  const [loadingNextQ, setLoadingNextQ] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [placeholder] = useState(pick(RAW_PH));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentDiscovery, setCurrentDiscovery] = useState("");
  const [discoveryVisible, setDiscoveryVisible] = useState(false);
  const [briefLines, setBriefLines] = useState<{ dimLabel: string; line: string }[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [transDir, setTransDir] = useState<"left" | "right" | "up" | "fade" | "dark">("right");
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [hasSpeech] = useState(() => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));
  const [synthText, setSynthText] = useState("");
  const [synthLines, setSynthLines] = useState<string[]>([]);
  const [synthRevealed, setSynthRevealed] = useState(0);
  const [synthDone, setSynthDone] = useState(false);
  const [showExports, setShowExports] = useState(false);
  const [toast, setToast] = useState("");

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

  // Fetch one question for a dimension
  const fetchQuestion = async (dimLabel: string, prevQAs: { question: string; answer: string }[]) => {
    try {
      const res = await fetch("/api/mobile-stickies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: capture, mode, qas: qasParam,
          dimension: dimLabel,
          previousQuestionsAndAnswers: prevQAs.length > 0 ? prevQAs : undefined,
        }),
      });
      const data = await res.json();
      return data.question || "What comes to mind?";
    } catch {
      return "What comes to mind?";
    }
  };

  // Navigate to stickies for a dimension
  const openDimension = async (dimLabel: string) => {
    setActiveDim(dimLabel);
    setEditingIdx(null);
    goTo("stickies", "right");

    const existing = dimQuestions[dimLabel] || [];
    const answers = dimAnswers[dimLabel] || [];
    // Only fetch first question if none exist yet
    if (existing.length === 0) {
      setLoadingStickies(true);
      try {
        const q = await fetchQuestion(dimLabel, []);
        setDimQuestions(prev => ({ ...prev, [dimLabel]: [q] }));
      } catch {
        setDimQuestions(prev => ({ ...prev, [dimLabel]: ["What comes to mind?"] }));
      }
      setLoadingStickies(false);
    }
  };

  // Open write screen
  const openWrite = (qIdx: number, existingAnswer?: string) => {
    setActiveQIdx(qIdx);
    setEditingIdx(existingAnswer !== undefined ? qIdx : null);
    setWriteText(existingAnswer || "");
    goTo("write", "up");
    setTimeout(() => textareaRef.current?.focus(), 400);
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!writeText.trim()) return;
    const question = activeQuestions[activeQIdx] || "";
    const newAnswer = { question, answer: writeText.trim() };
    const isEditing = editingIdx !== null;

    let updated: { question: string; answer: string }[];
    if (isEditing) {
      // Replace existing answer
      updated = [...(dimAnswers[activeDim] || [])];
      updated[activeQIdx] = newAnswer;
    } else {
      updated = [...(dimAnswers[activeDim] || []), newAnswer];
    }
    setDimAnswers(prev => ({ ...prev, [activeDim]: updated }));
    setEditingIdx(null);

    if (updated.length >= 3) {
      setDimStatus(prev => ({ ...prev, [activeDim]: "complete" }));
    } else {
      setDimStatus(prev => ({ ...prev, [activeDim]: "in_progress" }));
    }

    // Generate discovery and show discovery moment
    setWriteText("");
    setCurrentDiscovery("");
    setDiscoveryVisible(false);
    goTo("discovery", "fade");

    try {
      const dRes = await fetch("/api/mobile-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: capture, dimension: activeDim,
          question: activeQuestions[activeQIdx] || "",
          answer: newAnswer.answer,
          previousDiscoveries: discoveries.map(d => d.text).join("\n") || undefined,
        }),
      });
      const dData = await dRes.json();
      if (dData.discovery) {
        const disc: Discovery = { id: uid(), text: dData.discovery, dimLabel: activeDim, createdAt: new Date().toISOString() };
        setDiscoveries(prev => [...prev, disc]);
        setCurrentDiscovery(dData.discovery);
      }
    } catch { /* silent */ }

    // Trigger reveal animation
    setTimeout(() => setDiscoveryVisible(true), 100);

    // Generate next question in background (if not editing and not complete)
    if (!isEditing && updated.length < 3) {
      fetchQuestion(activeDim, updated).then(q => {
        setDimQuestions(prev => ({ ...prev, [activeDim]: [...(prev[activeDim] || []), q] }));
      });
    }

    // If dimension complete, generate brief line
    if (updated.length >= 3) {
      try {
        const bRes = await fetch("/api/mobile-brief-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: capture, dimension: activeDim,
            answers: updated.map(a => a.answer).join("\n"),
            discoveries: discoveries.filter(d => d.dimLabel === activeDim).map(d => d.text).join("\n"),
            previousBriefLines: briefLines.map(b => b.line).join("\n") || undefined,
          }),
        });
        const bData = await bRes.json();
        if (bData.line) setBriefLines(prev => [...prev, { dimLabel: activeDim, line: bData.line }]);
      } catch { /* silent */ }
    }

    save();
  };

  const heading = completedCount === 0
    ? "Pick where to start."
    : completedCount >= dimensions.length
    ? "You covered everything."
    : "Where next?";

  // Screen transition helper
  const goTo = (next: Screen, dir: "left" | "right" | "up" | "fade" | "dark" = "right") => {
    setTransDir(dir);
    setTransitioning(true);
    setTimeout(() => { setScreen(next); setTransitioning(false); }, 300);
  };

  // Voice input
  const toggleVoice = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) { transcript += e.results[i][0].transcript; }
      setWriteText(transcript);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  // Open synthesis
  const openSynthesis = async () => {
    goTo("synthesis", "dark");
    await new Promise(r => setTimeout(r, 350));
    setSynthText("");
    setSynthLines([]);
    setSynthRevealed(0);
    setSynthDone(false);
    setShowExports(false);

    try {
      const allAnswers = Object.entries(dimAnswers).map(([dim, ans]) =>
        `${dim}:\n${ans.map(a => `- ${a.answer}`).join("\n")}`
      ).join("\n\n");

      const res = await fetch("/api/session-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: capture, mode, dimensions,
          allNotes: allAnswers + "\n\nDiscoveries:\n" + discoveries.map(d => `- ${d.text}`).join("\n"),
        }),
      });
      const data = await res.json();
      if (data.sections) {
        const full = data.sections.map((s: { heading: string; content: string }) => `${s.heading}\n${s.content}`).join("\n\n");
        setSynthText(full);
        const lines = full.split("\n").filter((l: string) => l.trim());
        setSynthLines(lines);
        // Staggered reveal
        lines.forEach((_: string, i: number) => {
          setTimeout(() => setSynthRevealed(i + 1), 400 * (i + 1));
        });
        setTimeout(() => setSynthDone(true), 400 * lines.length + 500);
      }
    } catch {
      setSynthLines(["Your synthesis couldn't be generated. Try again."]);
      setSynthRevealed(1);
      setTimeout(() => setSynthDone(true), 1000);
    }
  };

  const copySynthPrompt = () => {
    let md = `Here's my thinking on "${capture}". I used Primer to work through this.\n\n`;
    md += `Key discoveries:\n${discoveries.map(d => `- ${d.text}`).join("\n")}\n\n`;
    md += `Brief:\n${synthText}\n\n`;
    md += "Help me take the next step.";
    navigator.clipboard.writeText(md);
    setToast("Copied to clipboard");
    setTimeout(() => setToast(""), 2000);
  };

  const saveSynthToStudio = async () => {
    await save();
    setToast("Saved to Studio");
    setTimeout(() => { setToast(""); router.push("/studio"); }, 1500);
  };

  const downloadSynth = () => {
    const blob = new Blob([`# ${capture}\n\n${synthText}\n\n## Discoveries\n${discoveries.map(d => `- ${d.text}`).join("\n")}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "primer-session.md";
    a.click();
  };

  // ─── SYNTHESIS SCREEN ───
  if (screen === "synthesis") {
    return (
      <div style={{ minHeight: "100vh", background: "#000332", fontFamily: "'Codec Pro', sans-serif", padding: "0 0 48px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <button onClick={() => setScreen("picker")} style={{ background: "none", border: "none", fontSize: 13, color: "rgba(250,247,240,0.4)", cursor: "pointer", fontFamily: "inherit" }}>&larr; back</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#FAF7F0", letterSpacing: "-0.01em" }}>primer</span>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ padding: "0 24px" }}>
          {/* Discovery constellation */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28, marginTop: 16 }}>
            {discoveries.map((d, i) => {
              const dIdx = dimensions.findIndex(dim => dim.label === d.dimLabel);
              const c = dIdx >= 0 ? DIM_COLORS[dIdx % DIM_COLORS.length] : "#FF9090";
              return (
                <div key={d.id || i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: c,
                  boxShadow: `0 0 8px ${c}50`,
                  animation: `mDotScale 0.3s ease-out ${i * 0.08}s both`,
                }} />
              );
            })}
          </div>

          {/* Label */}
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#FF9090", fontFamily: "'DM Mono', monospace", textAlign: "center", marginBottom: 24 }}>
            WHAT YOU FOUND
          </div>

          {/* Synthesis text */}
          <div style={{ maxWidth: 400, margin: "0 auto" }}>
            {synthLines.map((line, i) => {
              const isHeading = !line.includes(" ") || line.length < 30;
              const isFirst = i === 0;
              return (
                <p key={i} style={{
                  fontFamily: "'Codec Pro', sans-serif",
                  fontSize: isFirst ? 20 : isHeading ? 15 : 17,
                  fontWeight: isFirst || isHeading ? 700 : 400,
                  color: "#FAF7F0",
                  lineHeight: 1.8,
                  marginBottom: isHeading ? 8 : 14,
                  opacity: i < synthRevealed ? 1 : 0,
                  transform: i < synthRevealed ? "translateY(0)" : "translateY(10px)",
                  transition: `opacity 0.4s ease, transform 0.4s ease`,
                }}>
                  {line}
                </p>
              );
            })}
          </div>

          {/* Loading state */}
          {synthLines.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ width: 20, height: 20, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "mSpin 0.7s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "rgba(250,247,240,0.35)" }}>Crystallizing your thinking...</p>
            </div>
          )}

          {/* "This is mine" button */}
          {synthDone && !showExports && (
            <div style={{ textAlign: "center", marginTop: 32, animation: "mBriefFadeUp 0.5s ease-out forwards" }}>
              <button
                onClick={() => setShowExports(true)}
                className="done-btn"
                style={{
                  padding: "14px 36px", borderRadius: 100, border: "none",
                  background: "#FF9090", color: "#000332", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", transition: "transform 0.1s",
                }}
              >This is mine</button>
            </div>
          )}

          {/* Export options */}
          {showExports && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, animation: "mBriefFadeUp 0.4s ease-out forwards" }}>
              <button onClick={copySynthPrompt} style={{ padding: "14px", borderRadius: 12, border: "none", background: "#FF9090", color: "#000332", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Copy as AI prompt</button>
              <button onClick={saveSynthToStudio} style={{ padding: "14px", borderRadius: 12, border: "none", background: "rgba(250,247,240,0.08)", color: "#FAF7F0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save to Studio</button>
              <button onClick={downloadSynth} style={{ padding: "14px", borderRadius: 12, border: "1px solid rgba(250,247,240,0.12)", background: "transparent", color: "rgba(250,247,240,0.6)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Download</button>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "#FAF7F0", color: "#000332", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            {toast}
          </div>
        )}

        <style>{`
          @keyframes mDotScale { from { transform: scale(0); } to { transform: scale(1); } }
          @keyframes mSpin { to { transform: rotate(360deg); } }
          @keyframes mBriefFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          .done-btn:active { transform: scale(0.97); }
        `}</style>
      </div>
    );
  }

  // ─── DISCOVERY MOMENT SCREEN ───
  if (screen === "discovery") {
    const dimComplete = (dimAnswers[activeDim] || []).length >= 3;
    return (
      <div style={{
        minHeight: "100vh", background: "#FAF7F0", fontFamily: "'Codec Pro', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 28px", textAlign: "center",
      }}>
        {/* Colored line */}
        <div style={{
          width: 40, height: 3, borderRadius: 2, background: activeColor, marginBottom: 24,
          opacity: discoveryVisible ? 1 : 0, transform: discoveryVisible ? "scaleX(1)" : "scaleX(0)",
          transition: "all 0.5s ease",
        }} />

        {/* DISCOVERY label */}
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: activeColor,
          fontFamily: "'DM Mono', monospace", marginBottom: 16,
          opacity: discoveryVisible ? 1 : 0, transform: discoveryVisible ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.5s ease 0.15s",
        }}>
          DISCOVERY
        </div>

        {/* Discovery text */}
        <p style={{
          fontFamily: "'Codec Pro', sans-serif", fontSize: 22, fontWeight: 700,
          color: "#000332", lineHeight: 1.4, maxWidth: 320, marginBottom: 32,
          opacity: discoveryVisible ? 1 : 0, transform: discoveryVisible ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s ease 0.3s",
        }}>
          {currentDiscovery || "Processing your thinking..."}
        </p>

        {/* Discovery dots */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 40,
          opacity: discoveryVisible ? 1 : 0,
          transition: "opacity 0.5s ease 0.5s",
        }}>
          {discoveries.map((d, i) => {
            const dIdx = dimensions.findIndex(dim => dim.label === d.dimLabel);
            return (
              <div key={d.id || i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: dIdx >= 0 ? DIM_COLORS[dIdx % DIM_COLORS.length] : "#FF9090",
                boxShadow: `0 0 6px ${dIdx >= 0 ? DIM_COLORS[dIdx % DIM_COLORS.length] : "#FF9090"}40`,
              }} />
            );
          })}
        </div>

        {/* Continue button */}
        <button
          onClick={() => {
            if (dimComplete) {
              goTo("picker", "left");
            } else {
              goTo("stickies", "left");
            }
          }}
          style={{
            padding: "14px 32px", borderRadius: 100, border: "none",
            background: activeColor, color: "#000332", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            opacity: discoveryVisible ? 1 : 0, transform: discoveryVisible ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.5s ease 0.6s",
          }}
        >
          {dimComplete ? "Back to dimensions \u2192" : "Next question \u2192"}
        </button>
      </div>
    );
  }

  // ─── WRITE SCREEN ───
  if (screen === "write") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#FAF7F0", fontFamily: "'Codec Pro', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <button onClick={() => goTo("stickies", "left")} style={{ background: "none", border: "none", fontSize: 13, color: "#000332", cursor: "pointer", fontFamily: "inherit", opacity: 0.5 }}>&larr; back</button>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i < activeAnswers.length + 1 ? activeColor : "rgba(0,3,50,0.08)" }} />
            ))}
          </div>
        </div>

        <div style={{ padding: "0 24px", flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: activeColor, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
            {activeDim.toUpperCase()}
          </div>
          <h2 style={{
            fontFamily: "'Codec Pro', sans-serif", fontSize: 22, fontWeight: 700,
            color: "#000332", lineHeight: 1.35, marginBottom: 24,
            animation: "mFadeUp 0.3s ease-out forwards",
          }}>
            {activeQuestions[activeQIdx] || "What comes to mind?"}
          </h2>

          <textarea
            ref={textareaRef}
            value={writeText}
            onChange={e => setWriteText(e.target.value)}
            onFocus={e => { setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }}
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
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {hasSpeech && (
                <button
                  onClick={toggleVoice}
                  style={{
                    width: 52, height: 52, borderRadius: "50%", border: "none", flexShrink: 0,
                    background: listening ? activeColor : "rgba(0,3,50,0.06)",
                    color: listening ? "#000332" : "rgba(0,3,50,0.3)",
                    fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                    animation: listening ? "mMicPulse 1s ease-in-out infinite" : undefined,
                  }}
                >🎙</button>
              )}
              <button
                onClick={submitAnswer}
                disabled={!writeText.trim()}
                className="done-btn"
                style={{
                  flex: 1, padding: "16px", borderRadius: 100,
                  background: writeText.trim() ? activeColor : "rgba(0,3,50,0.06)",
                  color: writeText.trim() ? "#000332" : "rgba(0,3,50,0.25)",
                  border: "none", fontSize: 15, fontWeight: 700,
                  cursor: writeText.trim() ? "pointer" : "default",
                  fontFamily: "inherit", transition: "all 0.2s, transform 0.1s",
                }}
            >Done</button>
            </div>
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
          <button onClick={() => goTo("picker", "left")} style={{ background: "none", border: "none", fontSize: 13, color: "#000332", cursor: "pointer", fontFamily: "inherit", opacity: 0.5 }}>&larr; dimensions</button>
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
              <p style={{ fontSize: 13, color: "rgba(0,3,50,0.35)" }}>Generating your first question...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Answered stickies — tappable to edit */}
              {activeAnswers.map((a, i) => (
                <button
                  key={`a-${i}`}
                  className="m-sticky"
                  onClick={() => openWrite(i, a.answer)}
                  style={{
                    width: "100%", padding: "16px 20px",
                    background: "#fff", border: "none", borderRadius: 16,
                    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    opacity: 0.6, transition: "all 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#000332", lineHeight: 1.4, flex: 1 }}>{a.question}</p>
                    <span style={{ color: activeColor, fontSize: 14, marginLeft: 8, flexShrink: 0 }}>✓</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(0,3,50,0.4)", fontWeight: 300, marginTop: 4, lineHeight: 1.45 }}>
                    {a.answer.slice(0, 100)}{a.answer.length > 100 ? "..." : ""}
                  </p>
                  <span style={{ fontSize: 11, color: activeColor, marginTop: 4, display: "inline-block" }}>tap to edit</span>
                </button>
              ))}

              {/* Current unanswered question */}
              {activeAnswers.length < 3 && activeQuestions[activeAnswers.length] && (
                <button
                  className="m-sticky"
                  onClick={() => openWrite(activeAnswers.length)}
                  style={{
                    width: "100%", padding: "20px 20px",
                    background: "#fff", border: "none", borderRadius: 16,
                    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    transform: "scale(1.02)",
                    boxShadow: `0 4px 16px ${activeColor}15`,
                    transition: "all 0.2s",
                    animation: "mBriefFadeUp 0.3s ease-out",
                  }}
                >
                  <p style={{ fontSize: 17, fontWeight: 700, color: "#000332", lineHeight: 1.4 }}>
                    {activeQuestions[activeAnswers.length]}
                  </p>
                </button>
              )}

              {/* Loading next question */}
              {activeAnswers.length < 3 && !activeQuestions[activeAnswers.length] && activeAnswers.length > 0 && (
                <div style={{ height: 60, borderRadius: 16, background: `${activeColor}08`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "60%", height: 4, borderRadius: 2, background: `${activeColor}15`, animation: "mShimmer 1.5s ease-in-out infinite", backgroundSize: "200% 100%", backgroundImage: `linear-gradient(90deg, ${activeColor}10 0%, ${activeColor}25 50%, ${activeColor}10 100%)` }} />
                </div>
              )}

              {/* Locked future questions */}
              {activeAnswers.length < 2 && (
                <div style={{ height: 50, borderRadius: 16, background: "rgba(0,3,50,0.02)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, color: "rgba(0,3,50,0.15)" }}>{activeAnswers.length === 0 ? "2 more after this" : "1 more after this"}</span>
                </div>
              )}
            </div>
          )}

          {activeAnswers.length === 0 && !loadingStickies && activeQuestions.length > 0 && (
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
        <h1 style={{ fontFamily: "'Codec Pro', sans-serif", fontSize: 28, fontWeight: 400, color: "#000332", marginBottom: 24, lineHeight: 1.2 }}>
          {heading}
        </h1>

        {/* BRIEF PREVIEW */}
        {briefLines.length > 0 && (
          <div style={{
            background: "#000332", borderRadius: 16, padding: "18px 20px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#FF9090", fontFamily: "'DM Mono', monospace" }}>YOUR BRIEF</span>
              <div style={{ display: "flex", gap: 4 }}>
                {dimensions.map((d, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: dimStatus[d.label] === "complete" ? DIM_COLORS[i % DIM_COLORS.length] : "rgba(250,247,240,0.15)" }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(250,247,240,0.35)", fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
              {completedCount >= dimensions.length ? "your thinking, crystallized." : `${dimensions.length - completedCount} more dimension${dimensions.length - completedCount > 1 ? "s" : ""} to reveal your full brief`}
            </div>
            {/* Revealed lines */}
            {briefLines.map((bl, i) => (
              <p key={i} style={{
                fontFamily: "'Codec Pro', sans-serif", fontSize: 15, color: "#FAF7F0",
                lineHeight: 1.55, marginBottom: 10,
                animation: "mBriefFadeUp 0.5s ease-out forwards",
              }}>
                {bl.line}
              </p>
            ))}
            {/* Shimmer bars for unrevealed */}
            {Array.from({ length: Math.max(0, dimensions.length - briefLines.length) }).map((_, i) => (
              <div key={`shim-${i}`} style={{
                height: 14, borderRadius: 4, marginBottom: 10,
                width: `${70 + Math.random() * 30}%`,
                background: "linear-gradient(90deg, rgba(250,247,240,0.06) 0%, rgba(250,247,240,0.12) 50%, rgba(250,247,240,0.06) 100%)",
                backgroundSize: "200% 100%",
                animation: "mShimmer 1.5s ease-in-out infinite",
              }} />
            ))}
            {completedCount >= dimensions.length && (
              <button
                onClick={openSynthesis}
                style={{
                  marginTop: 8, padding: "12px 24px", borderRadius: 100,
                  background: "#FF9090", color: "#000332", border: "none",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  width: "100%",
                }}
              >Read your full brief &rarr;</button>
            )}
          </div>
        )}

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
                className="m-dim"
                onClick={() => openDimension(dim.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  width: "100%", padding: "16px 18px",
                  background: "#fff", border: "none", borderRadius: 14,
                  borderLeft: `4px solid ${color}`,
                  cursor: "pointer",
                  opacity: isComplete ? 0.65 : 1,
                  fontFamily: "inherit", textAlign: "left",
                  transition: "opacity 0.3s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Codec Pro', sans-serif", fontSize: 16, fontWeight: 700, color: "#000332", marginBottom: 2, lineHeight: 1.3 }}>
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
            onClick={openSynthesis}
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

      <style>{`
        @keyframes mSynthGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); } 50% { box-shadow: 0 0 12px rgba(255,144,144,0.25); } }
        @keyframes mBriefFadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes mShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .m-sticky:active { transform: scale(0.98) !important; }
        .m-dim:active { transform: scale(0.98) !important; }
        @keyframes mMicPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); } 50% { box-shadow: 0 0 0 8px rgba(255,144,144,0.15); } }
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
