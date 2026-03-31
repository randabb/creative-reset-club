"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "clarity" | "expansion" | "decision" | "expression";
const MODE_META: Record<Mode, { icon: string; color: string; label: string }> = {
  clarity: { icon: "◎", color: "#6B8AFE", label: "Clarity" },
  expansion: { icon: "✦", color: "#FF9090", label: "Expansion" },
  decision: { icon: "⟁", color: "#7ED6A8", label: "Decision" },
  expression: { icon: "◈", color: "#C4A6FF", label: "Expression" },
};

interface Dimension { label: string; description: string; }
interface QA { question: string; answer: string; }

function PlanInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const capture = sp.get("capture") || "";
  const mode = (sp.get("mode") || "clarity") as Mode;
  const qasRaw = sp.get("qas") || "[]";
  let qas: QA[] = [];
  try { qas = JSON.parse(qasRaw); } catch { qas = []; }

  const [dims, setDims] = useState<Dimension[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const m = MODE_META[mode] || MODE_META.clarity;

  useEffect(() => {
    if (!capture) { router.push("/session/new"); return; }
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlan = async () => {
    setLoading(true); setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    try {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/session-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: capture, mode, qas }),
        signal: controller.signal,
      });
      clearTimeout(abortTimer);
      const data = await res.json();
      setDims(data.dimensions || []);
      setSummary(data.summary || "");
    } catch {
      // Use mode fallback
      useFallback();
    }
    clearTimeout(slowTimer);
    setLoading(false); setSlow(false);
  };

  const useFallback = async () => {
    const res = await fetch("/api/session-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: capture, mode, qas: [] }),
    }).catch(() => null);
    if (res) {
      const data = await res.json();
      setDims(data.dimensions || []);
      setSummary(data.summary || "");
    }
    setLoading(false); setSlow(false);
  };

  const updateDim = (idx: number, field: "label" | "description", value: string) => {
    setDims(ds => ds.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const deleteDim = (idx: number) => {
    setDims(ds => ds.filter((_, i) => i !== idx));
    setEditIdx(null);
  };

  const addDim = () => {
    setDims(ds => [...ds, { label: "", description: "" }]);
    setEditIdx(dims.length);
  };

  const confirm = () => {
    const params = new URLSearchParams({
      capture, mode, qas: JSON.stringify(qas),
      dimensions: JSON.stringify(dims),
    });
    router.push(`/session/canvas?${params.toString()}`);
  };

  if (!capture) return null;

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px 80px",
      fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 8 }}>primer</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 40 }}>
        <span style={{ fontSize: 14, color: m.color }}>{m.icon}</span>
        <span style={{ fontSize: 12, color: "rgba(0,3,50,0.4)" }}>{m.label} mode</span>
      </div>

      <div style={{ maxWidth: 520, width: "100%" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 20, height: 20, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "planSpin 0.8s linear infinite", margin: "0 auto 14px" }} />
            <p style={{ fontSize: 14, color: "rgba(0,3,50,0.4)", fontWeight: 300 }}>Building your session plan...</p>
            {slow && (
              <button onClick={useFallback} style={{ marginTop: 16, background: "none", border: "1px solid rgba(0,3,50,0.12)", borderRadius: 100, padding: "8px 20px", fontSize: 12, color: "rgba(0,3,50,0.45)", cursor: "pointer", fontFamily: "inherit" }}>
                Taking a while? Use a default plan
              </button>
            )}
          </div>
        ) : (
          <div style={{ animation: "planFadeIn 0.4s ease forwards" }}>
            <h1 style={{ fontSize: 22, fontWeight: 400, fontStyle: "italic", color: "#000332", textAlign: "center", marginBottom: 8 }}>
              Here&rsquo;s what we&rsquo;ll think through.
            </h1>
            {summary && (
              <p style={{ fontSize: 15, color: "rgba(0,3,50,0.45)", fontStyle: "italic", textAlign: "center", fontWeight: 300, marginBottom: 36, lineHeight: 1.6 }}>
                {summary}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dims.map((d, i) => (
                <div key={i} style={{
                  background: "#fff", borderRadius: 12, padding: "20px 20px",
                  borderLeft: `3px solid ${m.color}`,
                  position: "relative",
                }}>
                  {editIdx === i ? (
                    <>
                      <input value={d.label} onChange={e => updateDim(i, "label", e.target.value)} autoFocus placeholder="Dimension label..." style={{ width: "100%", border: "none", outline: "none", fontSize: 16, fontWeight: 600, color: "#000332", fontFamily: "inherit", marginBottom: 6 }} />
                      <input value={d.description} onChange={e => updateDim(i, "description", e.target.value)} placeholder="What to think through here..." style={{ width: "100%", border: "none", outline: "none", fontSize: 13, color: "rgba(0,3,50,0.5)", fontFamily: "inherit", fontWeight: 300 }} />
                      <button onClick={() => setEditIdx(null)} style={{ position: "absolute", top: 8, right: 12, background: "none", border: "none", fontSize: 11, color: "#FF9090", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Done</button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#000332", marginBottom: 4 }}>{d.label || "Untitled"}</div>
                      <div style={{ fontSize: 13, color: "rgba(0,3,50,0.5)", fontWeight: 300, lineHeight: 1.55 }}>{d.description}</div>
                      <button onClick={() => setEditIdx(i)} style={{ position: "absolute", top: 12, right: 36, background: "none", border: "none", fontSize: 13, color: "rgba(0,3,50,0.2)", cursor: "pointer" }}>✏</button>
                      <button onClick={() => deleteDim(i)} onMouseEnter={e => (e.currentTarget.style.color = "#FF9090")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,3,50,0.15)")} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 14, color: "rgba(0,3,50,0.15)", cursor: "pointer" }}>×</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addDim} style={{
              width: "100%", marginTop: 10, padding: "16px", borderRadius: 12,
              border: "1.5px dashed rgba(0,3,50,0.12)", background: "transparent",
              fontSize: 13, color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "inherit",
            }}>
              + Add a dimension
            </button>

            <button onClick={confirm} style={{
              width: "100%", marginTop: 28, padding: "16px", borderRadius: 100,
              background: "#FF9090", color: "#000332", border: "none",
              fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              Looks right, let&rsquo;s go
            </button>

            <button onClick={fetchPlan} style={{
              display: "block", margin: "14px auto 0", background: "none", border: "none",
              fontSize: 13, color: "rgba(0,3,50,0.3)", cursor: "pointer", fontFamily: "inherit",
              textDecoration: "underline", textUnderlineOffset: 3,
            }}>
              Regenerate plan
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes planSpin { to { transform:rotate(360deg); } }
        @keyframes planFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <PlanInner />
    </Suspense>
  );
}
