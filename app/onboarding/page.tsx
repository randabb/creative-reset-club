"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "clarity" | "expansion" | "decision" | "expression";

const MODE_INFO: Record<Mode, { icon: string; color: string; name: string; desc: string }> = {
  clarity: { icon: "◎", color: "#6B8AFE", name: "Clarity", desc: "You think best when you can untangle complexity and find the core thread." },
  expansion: { icon: "✦", color: "#FF9090", name: "Expansion", desc: "You think best when you can stretch ideas in unexpected directions." },
  decision: { icon: "⟁", color: "#7ED6A8", name: "Decision", desc: "You think best when you can stress-test options and commit with confidence." },
  expression: { icon: "◈", color: "#C4A6FF", name: "Expression", desc: "You think best when you can articulate what you know but can't yet say." },
};

interface Question {
  text: string;
  options: { label: string; mode: Mode }[];
}

const QUESTIONS: Question[] = [
  {
    text: "When you have a new idea, what usually happens?",
    options: [
      { label: "I get excited but it stays vague", mode: "expansion" },
      { label: "I know what I mean but can't explain it", mode: "expression" },
      { label: "I immediately start weighing whether to pursue it", mode: "decision" },
      { label: "I feel overwhelmed by all the pieces", mode: "clarity" },
    ],
  },
  {
    text: "What frustrates you most when thinking through something?",
    options: [
      { label: "I can't see which part matters most", mode: "clarity" },
      { label: "The idea feels flat or obvious", mode: "expansion" },
      { label: "I go back and forth without committing", mode: "decision" },
      { label: "Other people don't get what I'm saying", mode: "expression" },
    ],
  },
  {
    text: "After a meeting, you're most likely to think:",
    options: [
      { label: "Too many things discussed, I need to sort through them", mode: "clarity" },
      { label: "There's something bigger here that nobody said", mode: "expansion" },
      { label: "We still haven't decided anything", mode: "decision" },
      { label: "I didn't say what I really meant", mode: "expression" },
    ],
  },
  {
    text: "What would make a thinking session worth it?",
    options: [
      { label: "I can finally see the core of the problem", mode: "clarity" },
      { label: "I have angles I'd never find alone", mode: "expansion" },
      { label: "I know what I'm doing and why", mode: "decision" },
      { label: "I can articulate my position clearly", mode: "expression" },
    ],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1-4=questions, 5=result
  const [answers, setAnswers] = useState<Mode[]>([]);
  const [visible, setVisible] = useState(true);
  const [resultMode, setResultMode] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);

  const transition = (next: () => void) => {
    setVisible(false);
    setTimeout(() => {
      next();
      setVisible(true);
    }, 250);
  };

  const handleAnswer = (mode: Mode, qIdx: number) => {
    const newAnswers = [...answers, mode];
    setAnswers(newAnswers);

    if (qIdx < 3) {
      transition(() => setStep(step + 1));
    } else {
      // Score: Q4 is weighted 2x
      const scores: Record<Mode, number> = { clarity: 0, expansion: 0, decision: 0, expression: 0 };
      newAnswers.forEach((m, i) => {
        scores[m] += i === 3 ? 2 : 1;
      });
      // Find highest, ties broken by Q4
      const q4Mode = newAnswers[3];
      let best: Mode = q4Mode;
      let bestScore = scores[q4Mode];
      (Object.keys(scores) as Mode[]).forEach((m) => {
        if (scores[m] > bestScore) {
          bestScore = scores[m];
          best = m;
        }
      });
      setResultMode(best);
      transition(() => setStep(5));
    }
  };

  const handleFinish = async () => {
    if (!resultMode) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          default_mode: resultMode,
          onboarding_completed: true,
        }, { onConflict: "id" });
      }
    } catch {
      // Continue even if save fails
    }
    router.push("/dashboard");
  };

  const qIdx = step - 1;

  return (
    <div style={{
      minHeight: "100vh", background: "#000332",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{
        maxWidth: 560, width: "100%", textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}>

        <style>{`
          @keyframes corePulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.15); opacity:0.8; } }
          @keyframes ringExpand { 0%,100% { transform:scale(1); opacity:0.3; } 50% { transform:scale(1.15); opacity:0; } }
        `}</style>

        {/* QUIZ QUESTIONS */}
        {step >= 1 && step <= 4 && (
          <>
            {/* Logo + pulsing core */}
            <div style={{ fontSize: 15, fontWeight: 700, color: "#FAF7F0", letterSpacing: "-0.01em", marginBottom: 20 }}>
              primer
            </div>
            <div style={{ position: "relative", width: 44, height: 44, margin: "0 auto 24px" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FF9090", position: "absolute", top: 15, left: 15, animation: "corePulse 3s ease-in-out infinite" }} />
              <div style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,144,144,0.3)", position: "absolute", top: 7, left: 7, animation: "ringExpand 3s ease-in-out infinite" }} />
              <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,144,144,0.15)", position: "absolute", top: 0, left: 0, animation: "ringExpand 3s ease-in-out infinite 0.5s" }} />
            </div>

            {/* Subtitle on Q1 only */}
            {step === 1 && (
              <div style={{ fontSize: 13, color: "rgba(250,247,240,0.35)", fontWeight: 300, marginBottom: 28 }}>
                A few quick questions to set up your thinking space.
              </div>
            )}

            {/* Progress bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 56, justifyContent: "center" }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{
                  width: 48, height: 3, borderRadius: 2,
                  background: i < step ? "#FF9090" : "rgba(250,247,240,0.12)",
                  transition: "background 0.3s ease",
                }} />
              ))}
            </div>

            <div style={{
              fontSize: "clamp(22px, 3.5vw, 30px)", fontWeight: 400,
              color: "#FAF7F0", lineHeight: 1.35, marginBottom: 40,
              fontStyle: "italic", letterSpacing: "-0.01em",
            }}>
              {QUESTIONS[qIdx].text}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {QUESTIONS[qIdx].options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleAnswer(opt.mode, qIdx)}
                  style={{
                    width: "100%", padding: "18px 24px", textAlign: "left",
                    background: "transparent",
                    border: "1.5px solid rgba(250,247,240,0.12)",
                    borderRadius: 14, color: "#FAF7F0",
                    fontSize: 15, fontWeight: 400, cursor: "pointer",
                    fontFamily: "'Codec Pro', sans-serif",
                    transition: "all 0.2s ease",
                    lineHeight: 1.5,
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#FF9090";
                    (e.target as HTMLElement).style.background = "rgba(255,144,144,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = "rgba(250,247,240,0.12)";
                    (e.target as HTMLElement).style.background = "transparent";
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* RESULT */}
        {step === 5 && resultMode && (
          <>
            <div style={{
              fontSize: 56, marginBottom: 20,
              color: MODE_INFO[resultMode].color,
              lineHeight: 1,
            }}>
              {MODE_INFO[resultMode].icon}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.14em",
              textTransform: "uppercase" as const, color: "rgba(250,247,240,0.4)",
              marginBottom: 8,
            }}>
              Your starting mode
            </div>
            <div style={{
              fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em",
              color: MODE_INFO[resultMode].color, marginBottom: 16,
            }}>
              {MODE_INFO[resultMode].name}
            </div>
            <div style={{
              fontSize: 16, color: "rgba(250,247,240,0.65)",
              fontWeight: 300, lineHeight: 1.65, maxWidth: 400,
              margin: "0 auto 12px",
            }}>
              {MODE_INFO[resultMode].desc}
            </div>
            <div style={{
              fontSize: 13, color: "rgba(250,247,240,0.3)",
              fontWeight: 300, marginBottom: 40,
            }}>
              You can switch modes anytime. This just sets your starting point.
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              style={{
                background: "#FF9090", color: "#000332",
                border: "none", padding: "16px 40px", borderRadius: 100,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Codec Pro', sans-serif",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Setting up..." : "Open your studio"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
