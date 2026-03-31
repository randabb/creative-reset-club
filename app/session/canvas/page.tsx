"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Action = "clarify" | "expand" | "decide" | "express";

const ACT: Record<Action, { icon: string; color: string; label: string }> = {
  clarify: { icon: "◎", color: "#6B8AFE", label: "Clarify" },
  expand: { icon: "✦", color: "#FF9090", label: "Expand" },
  decide: { icon: "⟁", color: "#7ED6A8", label: "Decide" },
  express: { icon: "◈", color: "#C4A6FF", label: "Express" },
};

interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  source?: "goal" | "thinking" | "ai" | "user" | "dimension";
  action?: Action;
  aiInstruction?: boolean;
  qIndex?: number;
  dimIndex?: number;
  dimLabel?: string;
  dimDesc?: string;
}

const THINKING_LABELS: Record<string, string[]> = {
  clarity: ["YOUR SITUATION", "YOUR ASSUMPTION", "YOUR ROOT", "YOUR CORE THREAD"],
  expansion: ["YOUR SEED", "YOUR SHIFT", "YOUR TRANSFORMATION", "YOUR STRONGEST ANGLE"],
  decision: ["YOUR DECISION", "YOUR INTUITION", "YOUR RISK", "YOUR CRITERIA"],
  expression: ["YOUR MESSAGE", "YOUR CORE POINT", "YOUR STRUCTURE", "YOUR OPPOSITION"],
};

interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  color?: string;
}

interface QA { question: string; answer: string; }

function uid() { return crypto.randomUUID(); }

function CanvasInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const capture = sp.get("capture") || "";
  const mode = sp.get("mode") || "clarity";
  const qasRaw = sp.get("qas") || "[]";
  const dimsRaw = sp.get("dimensions") || "[]";
  let qas: QA[] = [];
  try { qas = JSON.parse(qasRaw); } catch { qas = []; }
  let dimensions: { label: string; description: string }[] = [];
  try { dimensions = JSON.parse(dimsRaw); } catch { dimensions = []; }

  // Layout positions per mode: [goal, q1, q2, q3, q4]
  const POSITIONS: Record<string, { x: number; y: number }[]> = {
    clarity:    [{ x: 60, y: 60 }, { x: 60, y: 240 }, { x: 320, y: 180 }, { x: 580, y: 280 }, { x: 580, y: 60 }],
    expansion:  [{ x: 60, y: 60 }, { x: 60, y: 240 }, { x: 320, y: 160 }, { x: 580, y: 260 }, { x: 580, y: 60 }],
    decision:   [{ x: 60, y: 60 }, { x: 60, y: 240 }, { x: 320, y: 200 }, { x: 580, y: 300 }, { x: 580, y: 60 }],
    expression: [{ x: 60, y: 60 }, { x: 60, y: 240 }, { x: 320, y: 170 }, { x: 580, y: 280 }, { x: 580, y: 60 }],
  };

  const ARROW_LABELS: Record<string, string[]> = {
    clarity:    ["led to", "underneath", "deeper", "the real point"],
    expansion:  ["started with", "then flipped", "which opened", "landing on"],
    decision:   ["the choice", "gut says", "but what if", "so the real test is"],
    expression: ["trying to say", "distilled to", "framed as", "tested against"],
  };

  // Build initial notes + connections from session data
  const buildInitial = useCallback((): { notes: Note[]; conns: Connection[] } => {
    const positions = POSITIONS[mode] || POSITIONS.clarity;
    const labels = ARROW_LABELS[mode] || ARROW_LABELS.clarity;
    const ns: Note[] = [];
    const cs: Connection[] = [];
    const mColor = (ACT as Record<string, { color: string }>)[mode]?.color || "#FF9090";

    const goalId = uid();
    if (capture) {
      ns.push({ id: goalId, x: 60, y: 60, text: capture, source: "goal" });
    }

    if (dimensions.length > 0) {
      // Dimension-based column layout
      const dimIds: string[] = [];
      dimensions.forEach((dim, i) => {
        const dimId = uid();
        ns.push({
          id: dimId,
          x: 60 + i * 260,
          y: 200,
          text: dim.label,
          source: "dimension",
          dimIndex: i,
          dimLabel: dim.label,
          dimDesc: dim.description,
        });
        dimIds.push(dimId);
      });
      // Place Q&A notes below their dimension column
      qas.forEach((qa, i) => {
        const dimIdx = Math.min(i, dimensions.length - 1);
        const nid = uid();
        ns.push({
          id: nid,
          x: 65 + dimIdx * 260,
          y: 340,
          text: qa.answer,
          source: "thinking",
          qIndex: i,
        });
        cs.push({ id: uid(), from: dimIds[dimIdx], to: nid, label: "", color: "rgba(0,3,50,0.1)" });
      });
    } else {
      // Fallback: arc layout (no dimensions)
      const noteIds = [goalId];
      qas.forEach((qa, i) => {
        const nid = uid();
        ns.push({
          id: nid,
          x: positions[i + 1]?.x || 40,
          y: positions[i + 1]?.y || 200 + i * 130,
          text: qa.answer,
          source: "thinking",
          qIndex: i,
        });
        const fromId = noteIds[noteIds.length - 1];
        cs.push({ id: uid(), from: fromId, to: nid, label: labels[i] || "", color: "rgba(0,3,50,0.15)" });
        noteIds.push(nid);
      });
    }

    return { notes: ns, conns: cs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initial = buildInitial();
  const [notes, setNotes] = useState<Note[]>(initial.notes);
  const [connections, setConnections] = useState<Connection[]>(initial.conns);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connLabel, setConnLabel] = useState("");
  const [connModal, setConnModal] = useState<{ from: string; to: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState("");
  const [showCoach, setShowCoach] = useState(false);
  const [synthesis, setSynthesis] = useState<{ reflection: string; deliverable_label: string; deliverable: string } | null>(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const [coachDismissed, setCoachDismissed] = useState(false);
  const [q4Pulsing, setQ4Pulsing] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const vpRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!capture) router.push("/session/new"); }, [capture, router]);

  // Coach card — shows once per canvas visit (session-local, not persistent)
  useEffect(() => {
    if (coachDismissed) return;
    const t = setTimeout(() => {
      setShowCoach(true);
      setQ4Pulsing(true);
      setTimeout(() => setQ4Pulsing(false), 6000);
    }, 1500);
    return () => clearTimeout(t);
  }, [coachDismissed]);

  const dismissCoach = () => {
    setShowCoach(false);
    setCoachDismissed(true);
    setQ4Pulsing(false);
  };

  // Auto-dismiss coach when user selects a note or clicks an action
  useEffect(() => {
    if (selected.size > 0 && showCoach) dismissCoach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Pan
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".cn")) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX - panX, y: e.clientY - panY };
      el.style.cursor = "grabbing";
    };
    const move = (e: MouseEvent) => {
      if (!isPanning.current) return;
      setPanX(e.clientX - panStart.current.x);
      setPanY(e.clientY - panStart.current.y);
    };
    const up = () => { isPanning.current = false; el.style.cursor = "grab"; };
    el.addEventListener("mousedown", down);
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseup", up);
    el.addEventListener("mouseleave", up);
    return () => { el.removeEventListener("mousedown", down); el.removeEventListener("mousemove", move); el.removeEventListener("mouseup", up); el.removeEventListener("mouseleave", up); };
  }, [panX, panY]);

  // Zoom
  // Prevent scroll-to-zoom (scroll does nothing on canvas)
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const s2c = (cx: number, cy: number) => {
    if (!vpRef.current) return { x: 0, y: 0 };
    const r = vpRef.current.getBoundingClientRect();
    return { x: (cx - r.left - panX) / zoom, y: (cy - r.top - panY) / zoom };
  };

  // Note drag
  const startDrag = (id: string, e: React.MouseEvent) => {
    if (editId === id) return;
    e.stopPropagation();
    const n = notes.find(n => n.id === id);
    if (!n || n.source === "dimension") return;
    if (connecting) {
      if (!connectFrom) { setConnectFrom(id); return; }
      if (connectFrom !== id) { setConnModal({ from: connectFrom, to: id }); setConnectFrom(null); }
      return;
    }
    const pt = s2c(e.clientX, e.clientY);
    setDragId(id);
    setDragOff({ x: pt.x - n.x, y: pt.y - n.y });
    if (!e.shiftKey) setSelected(new Set([id]));
    else setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  };

  const onCanvasMove = (e: React.MouseEvent) => {
    if (!dragId) return;
    const pt = s2c(e.clientX, e.clientY);
    setNotes(ns => ns.map(n => n.id === dragId ? { ...n, x: pt.x - dragOff.x, y: pt.y - dragOff.y } : n));
  };

  const onCanvasUp = () => setDragId(null);

  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".cn")) return;
    const pt = s2c(e.clientX, e.clientY);
    const id = uid();
    setNotes(ns => [...ns, { id, x: pt.x, y: pt.y, text: "", source: "user" }]);
    setEditId(id);
    setSelected(new Set([id]));
  };

  const addNote = () => {
    const id = uid();
    setNotes(ns => [...ns, { id, x: 300 + Math.random() * 200, y: 100 + Math.random() * 200, text: "", source: "user" }]);
    setEditId(id);
    setSelected(new Set([id]));
  };

  const updateText = (id: string, text: string) => setNotes(ns => ns.map(n => n.id === id ? { ...n, text } : n));

  const finishEdit = (id: string) => {
    setEditId(null);
    setNotes(ns => ns.filter(n => n.id !== id || n.text.trim()));
  };

  const finishConnection = () => {
    if (!connModal) return;
    setConnections(cs => [...cs, { id: uid(), from: connModal.from, to: connModal.to, label: connLabel }]);
    setConnLabel("");
    setConnModal(null);
  };

  // AI action
  const runAction = async (action: Action) => {
    if (selected.size === 0) return;
    const selId = [...selected][0];
    const selNote = notes.find(n => n.id === selId);
    if (!selNote) return;
    setAiLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/canvas-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          goal: capture,
          selectedNoteText: selNote.text,
          allNotesText: notes.map(n => n.text).join("\n\n"),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      const instructions: string[] = data.instructions || [];

      // Simple vertical stack to the RIGHT of source note
      const srcW = dimensions.length > 0 ? 190 : 200;
      let targetX = selNote.x + srcW + 80;
      const startY = selNote.y;
      const newNotes: Note[] = [];
      const allExisting = [...notes];

      instructions.forEach((inst, i) => {
        let tx = targetX;
        let ty = startY + i * 150;

        // Collision check: shift right in 240px columns if blocked
        for (let shift = 0; shift < 3; shift++) {
          const blocked = [...allExisting, ...newNotes].some(n => {
            if (n.source === "dimension") return false;
            return Math.abs(n.x - tx) < 40 && Math.abs(n.y - ty) < 40;
          });
          if (!blocked) break;
          tx += 240;
        }

        // Clamp to canvas
        tx = Math.max(10, Math.min(3800, tx));
        ty = Math.max(10, Math.min(2900, ty));

        newNotes.push({
          id: uid(), x: tx, y: ty, text: inst,
          source: "ai" as const, action, aiInstruction: true,
        });
      });

      const newConns: Connection[] = newNotes.map(n => ({
        id: uid(), from: selId, to: n.id, label: "", color: ACT[action].color,
      }));
      setNotes(ns => [...ns, ...newNotes]);
      setConnections(cs => [...cs, ...newConns]);
      setSelected(new Set());
    } catch {
      // handled by API fallback
    }
    setAiLoading(false);
  };

  // Export helpers
  const buildMarkdown = () => {
    let md = `# Primer Canvas Session\n\n`;
    if (synthesis) {
      md += `## Synthesis\n${synthesis.reflection}\n\n### ${synthesis.deliverable_label}\n${synthesis.deliverable}\n\n`;
    }
    md += `## Goal\n${capture}\n\n## Guided Thinking\n`;
    qas.forEach((qa, i) => { md += `\n### Q${i + 1}: ${qa.question}\n${qa.answer}\n`; });
    if (dimensions.length) {
      md += "\n## Session Dimensions\n";
      dimensions.forEach((d, i) => { md += `\n${i + 1}. **${d.label}** — ${d.description}`; });
    }
    md += "\n\n## Canvas Notes\n";
    notes.forEach(n => { md += `\n- ${n.text}`; });
    if (connections.length) {
      md += "\n\n## Connections\n";
      connections.forEach(c => {
        const from = notes.find(n => n.id === c.from)?.text?.slice(0, 40);
        const to = notes.find(n => n.id === c.to)?.text?.slice(0, 40);
        md += `\n- "${from}..." → "${to}..."${c.label ? ` (${c.label})` : ""}`;
      });
    }
    return md;
  };

  const saveToStudio = async () => {
    setToast("✓ Saved to your Studio");
    setTimeout(() => { setToast(""); router.push("/studio"); }, 2500);
  };

  const copyPrompt = () => {
    const md = "Here's my thinking so far on this topic. I've worked through it in Primer and want to take it further with you.\n\n" + buildMarkdown();
    navigator.clipboard.writeText(md);
    setToast("✓ Copied to clipboard!");
    setTimeout(() => setToast(""), 2500);
  };

  const downloadMd = () => {
    const blob = new Blob([buildMarkdown()], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "primer-session.md";
    a.click();
  };

  const hasSelection = selected.size > 0;

  // Get arrow endpoints: right-edge center → left-edge center, or bottom→top if vertically aligned
  const noteW = 200;
  const noteH = 60;
  const arrowPoints = (fromId: string, toId: string) => {
    const f = notes.find(n => n.id === fromId);
    const t = notes.find(n => n.id === toId);
    if (!f || !t) return { x1: 0, y1: 0, x2: 0, y2: 0 };
    const isVertical = Math.abs(f.x - t.x) < 50;
    if (isVertical) {
      // Bottom of source → top of target
      return { x1: f.x + noteW / 2, y1: f.y + noteH, x2: t.x + noteW / 2, y2: t.y };
    }
    // Right edge of source → left edge of target
    return { x1: f.x + noteW, y1: f.y + noteH / 2, x2: t.x, y2: t.y + noteH / 2 };
  };

  const arrowPath = (fromId: string, toId: string) => {
    const { x1, y1, x2, y2 } = arrowPoints(fromId, toId);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    // Slight curve via quadratic bezier
    const cx = mx + (y2 - y1) * 0.15;
    const cy = my - (x2 - x1) * 0.15;
    return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  };

  // Delete a note and all its connections
  const deleteNote = (id: string) => {
    setNotes(ns => ns.filter(n => n.id !== id));
    setConnections(cs => cs.filter(c => c.from !== id && c.to !== id));
    setSelected(s => { const ns = new Set(s); ns.delete(id); return ns; });
  };

  const sourceLabel = (n: Note) => {
    if (n.source === "goal") return { text: "YOUR GOAL", color: "#000332" };
    if (n.source === "dimension") return null; // dimensions render their own label internally
    if (n.source === "thinking" && n.qIndex !== undefined) {
      const labels = THINKING_LABELS[mode] || THINKING_LABELS.clarity;
      return { text: labels[n.qIndex] || "YOUR THINKING", color: "#FF9090" };
    }
    if (n.source === "thinking") return { text: "YOUR THINKING", color: "#FF9090" };
    if (n.source === "ai" && n.action) return { text: `${ACT[n.action].label} ↓`, color: ACT[n.action].color };
    return null;
  };

  if (!capture) return null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Codec Pro',sans-serif", position: "relative" }}>
      {/* TOOLBAR */}
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30,
        display: "flex", alignItems: "center", gap: 4,
        background: "#fff", borderRadius: 100, padding: "6px 12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        <button onClick={addNote} style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: "#000332", cursor: "pointer", fontFamily: "inherit" }}>+ Note</button>
        <button onClick={() => { setConnecting(!connecting); setConnectFrom(null); }} style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: connecting ? "rgba(0,3,50,0.08)" : "transparent", fontSize: 12, fontWeight: 600, color: connecting ? "#FF9090" : "#000332", cursor: "pointer", fontFamily: "inherit" }}>Connect</button>
        <div style={{ width: 1, height: 20, background: "rgba(0,3,50,0.1)", margin: "0 4px" }} />
        {(Object.keys(ACT) as Action[]).map(a => (
          <button key={a} onClick={() => runAction(a)} disabled={!hasSelection || aiLoading} style={{
            padding: "6px 10px", borderRadius: 100, border: "none", background: "transparent",
            fontSize: 14, color: hasSelection ? ACT[a].color : "rgba(0,3,50,0.2)",
            cursor: hasSelection ? "pointer" : "default", opacity: hasSelection ? 1 : 0.4,
            fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
          }} title={ACT[a].label}>{ACT[a].icon}</button>
        ))}
      </div>

      {/* RIGHT CONTROLS */}
      <div style={{ position: "absolute", top: 14, right: 20, zIndex: 30, display: "flex", gap: 8 }}>
        <button onClick={() => setShowGoal(!showGoal)} style={{ padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(0,3,50,0.1)", background: "#fff", fontSize: 12, fontWeight: 600, color: "#000332", cursor: "pointer", fontFamily: "inherit" }}>Goal</button>
        <button onClick={async () => {
          setShowExport(!showExport);
          if (!showExport && !synthesis && !synthLoading) {
            setSynthLoading(true);
            try {
              const res = await fetch("/api/session-synthesis", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goal: capture, mode, dimensions, allNotes: notes.map(n => n.text).join("\n\n") }),
              });
              const data = await res.json();
              if (data.reflection) setSynthesis(data);
            } catch { /* use without synthesis */ }
            setSynthLoading(false);
          }
        }} style={{ padding: "8px 16px", borderRadius: 100, border: "none", background: "#FF9090", fontSize: 12, fontWeight: 700, color: "#000332", cursor: "pointer", fontFamily: "inherit" }}>Ready to go? →</button>
      </div>

      {/* GOAL DROPDOWN */}
      {showGoal && (
        <div style={{ position: "absolute", top: 52, right: 120, zIndex: 40, background: "#000332", borderRadius: 14, padding: "18px 20px", maxWidth: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 8 }}>Your goal</p>
          <p style={{ fontSize: 13, color: "rgba(250,247,240,0.7)", lineHeight: 1.6, fontWeight: 300 }}>{capture}</p>
        </div>
      )}

      {/* EXPORT PANEL */}
      {showExport && (
        <div style={{ position: "absolute", top: 52, right: 20, zIndex: 40, background: "#fff", borderRadius: 16, padding: "24px 24px", width: 280, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
          {synthLoading && (
            <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
              <div style={{ width: 16, height: 16, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "cSpin 0.7s linear infinite", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 11, color: "rgba(0,3,50,0.35)" }}>Synthesizing...</p>
            </div>
          )}
          {synthesis && (
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(0,3,50,0.06)" }}>
              <p style={{ fontSize: 14, fontStyle: "italic", color: "#000332", lineHeight: 1.6, fontWeight: 300, marginBottom: 10 }}>{synthesis.reflection}</p>
              <div style={{ borderLeft: `3px solid ${(ACT as Record<string, {color:string}>)[mode]?.color || "#FF9090"}`, paddingLeft: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(0,3,50,0.4)", marginBottom: 4 }}>{synthesis.deliverable_label}</p>
                <p style={{ fontSize: 14, color: "#000332", lineHeight: 1.6, fontWeight: 400 }}>{synthesis.deliverable}</p>
              </div>
            </div>
          )}
          <p style={{ fontSize: 17, fontWeight: 700, fontStyle: "italic", color: "#000332", marginBottom: 4 }}>Take your thinking further</p>
          <p style={{ fontSize: 12, color: "rgba(0,3,50,0.4)", marginBottom: 18, fontWeight: 300 }}>You did the thinking. Now bring it wherever you need it.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={saveToStudio} style={{ padding: "12px", borderRadius: 10, border: "none", background: "#FF9090", color: "#000332", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save to Studio</button>
            <button onClick={copyPrompt} style={{ padding: "12px", borderRadius: 10, border: "none", background: "#000332", color: "#FAF7F0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Copy as AI prompt</button>
            <button onClick={downloadMd} style={{ padding: "12px", borderRadius: 10, border: "1px solid rgba(0,3,50,0.1)", background: "transparent", color: "#000332", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Download as text</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "#000332", color: "#FAF7F0", padding: "12px 24px", borderRadius: 100, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* AI LOADING */}
      {aiLoading && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "#fff", padding: "10px 20px", borderRadius: 100, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "cSpin 0.7s linear infinite" }} />
          <span style={{ fontSize: 12, color: "rgba(0,3,50,0.5)" }}>Generating thinking branches...</span>
        </div>
      )}

      {/* COACH CARD */}
      {showCoach && !coachDismissed && (
        <div style={{
          position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)",
          zIndex: 35, maxWidth: 480, width: "calc(100% - 48px)",
          background: "#fff", borderRadius: 14, padding: "18px 22px",
          borderLeft: "3px solid #FF9090",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          animation: "coachIn 0.4s ease-out forwards",
        }}>
          <button onClick={dismissCoach} style={{
            position: "absolute", top: 10, right: 12,
            background: "none", border: "none", fontSize: 16,
            color: "rgba(0,3,50,0.25)", cursor: "pointer", lineHeight: 1,
          }}>×</button>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 8 }}>
            WHERE TO START
          </div>
          <p style={{ fontSize: 15, fontStyle: "italic", color: "#000332", lineHeight: 1.55, fontWeight: 400, paddingRight: 20 }}>
            {dimensions.length > 0 ? (
              <>Start with &ldquo;{dimensions[0].label}&rdquo; — select it and use <strong style={{ color: "#6B8AFE" }}>Clarify</strong> or <strong style={{ color: "#FF9090" }}>Expand</strong> to develop your thinking.</>
            ) : (
              <>
                {mode === "clarity" && <>Start with your core thread (top right) — select it and hit <strong style={{ color: "#FF9090" }}>Expand</strong> to push it further, or <strong style={{ color: "#6B8AFE" }}>Clarify</strong> to sharpen it.</>}
                {mode === "expansion" && <>Start with your strongest angle (top right) — select it and hit <strong style={{ color: "#6B8AFE" }}>Clarify</strong> to cut to the essence, or <strong style={{ color: "#FF9090" }}>Expand</strong> to stretch it even further.</>}
                {mode === "decision" && <>Start with your real test (top right) — select it and hit <strong style={{ color: "#7ED6A8" }}>Decide</strong> to stress-test it, or <strong style={{ color: "#C4A6FF" }}>Express</strong> to articulate your choice.</>}
                {mode === "expression" && <>Start with your opposition (top right) — select it and hit <strong style={{ color: "#C4A6FF" }}>Express</strong> to strengthen your position, or <strong style={{ color: "#6B8AFE" }}>Clarify</strong> to find the core of what you&rsquo;re saying.</>}
              </>
            )}
          </p>
        </div>
      )}

      {/* SELECTION HINT */}
      {hasSelection && !aiLoading && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 25, fontSize: 12, color: "rgba(0,3,50,0.35)", background: "#fff", padding: "8px 18px", borderRadius: 100, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          {selected.size} note{selected.size > 1 ? "s" : ""} selected — choose Clarify, Expand, Decide, or Express above
        </div>
      )}

      {/* CONNECTION MODAL */}
      {connModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setConnModal(null); setConnLabel(""); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 28px", width: 320 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#000332", marginBottom: 12 }}>What&rsquo;s the relationship?</p>
            <input value={connLabel} onChange={e => setConnLabel(e.target.value)} placeholder="supports, contradicts, leads to..." onKeyDown={e => e.key === "Enter" && finishConnection()} autoFocus style={{ width: "100%", padding: "12px 14px", border: "1.5px solid rgba(0,3,50,0.12)", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", color: "#000332", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={finishConnection} style={{ flex: 1, padding: "10px", borderRadius: 100, border: "none", background: "#FF9090", color: "#000332", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Connect</button>
              <button onClick={() => { setConnLabel(""); finishConnection(); }} style={{ padding: "10px 16px", borderRadius: 100, border: "1px solid rgba(0,3,50,0.1)", background: "transparent", fontSize: 13, color: "rgba(0,3,50,0.5)", cursor: "pointer", fontFamily: "inherit" }}>Skip label</button>
            </div>
          </div>
        </div>
      )}

      {/* CANVAS VIEWPORT */}
      <div ref={vpRef} style={{ flex: 1, overflow: "hidden", cursor: connecting ? "crosshair" : "grab", position: "relative" }}>
        <div
          ref={canvasRef}
          onMouseMove={onCanvasMove}
          onMouseUp={onCanvasUp}
          onMouseLeave={onCanvasUp}
          onDoubleClick={onCanvasDoubleClick}
          onClick={(e) => { const t = e.target as HTMLElement; if (!dragId && !t.closest(".cn")) { setSelected(new Set()); setShowGoal(false); setShowExport(false); } }}
          style={{
            width: 4000, height: 3000, position: "absolute",
            transform: `translate(${panX}px,${panY}px) scale(${zoom})`,
            transformOrigin: "0 0",
            background: "#F5F2ED",
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {/* ARROWS SVG */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
            <defs><marker id="ah" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 6 2.5, 0 5" fill="rgba(0,3,50,0.35)" /></marker></defs>
            {connections.map(c => {
              const ap = arrowPath(c.from, c.to);
              const col = c.color || "rgba(0,3,50,0.2)";
              const isAiArrow = col !== "rgba(0,3,50,0.15)" && col !== "rgba(0,3,50,0.1)" && col !== "rgba(0,3,50,0.08)";
              const lineOpacity = isAiArrow ? 0.45 : 0.25;
              return (
                <g key={c.id}>
                  <path d={ap.d} fill="none" stroke={col} strokeWidth="1.5" markerEnd="url(#ah)" opacity={lineOpacity}
                    style={isAiArrow ? { strokeDasharray: 400, strokeDashoffset: 400, animation: "arrowDraw 0.4s ease-out forwards" } : undefined} />
                  {c.label && <text x={ap.mx} y={ap.my - 6} textAnchor="middle" fill="rgba(0,3,50,0.35)" fontSize="10" fontFamily="'Codec Pro',sans-serif">{c.label}</text>}
                </g>
              );
            })}
          </svg>

          {/* DIMENSION COLUMN LINES */}
          {dimensions.length > 0 && dimensions.map((_, i) => (
            <div key={`col-${i}`} style={{
              position: "absolute", left: 60 + i * 260 + 110, top: 290,
              width: 1, height: 300,
              borderLeft: "1px dashed rgba(0,3,50,0.06)",
              pointerEvents: "none",
            }} />
          ))}

          {/* NOTES */}
          {notes.map(n => {
            const isDim = n.source === "dimension";
            const isSel = !isDim && selected.has(n.id);
            const sl = sourceLabel(n);
            const isAi = n.aiInstruction;
            const actColor = n.action ? ACT[n.action].color : "#FF9090";

            // Dimension header rendering
            if (isDim) {
              return (
                <div
                  key={n.id}
                  className="cn"
                  style={{
                    position: "absolute", left: n.x, top: n.y,
                    width: 220, padding: "14px 16px",
                    borderRadius: 10,
                    background: "#000332",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 2,
                    cursor: "default",
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 6 }}>
                    DIMENSION {(n.dimIndex ?? 0) + 1}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FAF7F0", marginBottom: 4, lineHeight: 1.3 }}>
                    {n.dimLabel}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(250,247,240,0.5)", fontWeight: 300, lineHeight: 1.5 }}>
                    {n.dimDesc}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={n.id}
                className="cn"
                onMouseDown={e => startDrag(n.id, e)}
                onDoubleClick={e => { e.stopPropagation(); setEditId(n.id); }}
                style={{
                  position: "absolute", left: n.x, top: n.y,
                  width: dimensions.length > 0 ? 190 : 200, minHeight: 60, padding: "10px 12px",
                  borderRadius: 10,
                  background: isAi ? `${actColor}08` : n.source === "goal" ? "rgba(0,3,50,0.05)" : (n.source === "thinking" && n.qIndex === 3) ? "rgba(255,144,144,0.06)" : n.source === "thinking" ? "rgba(255,144,144,0.04)" : "#fff",
                  border: `${(n.source === "thinking" && n.qIndex === 3) ? "3px" : "1.5px"} solid ${isSel ? "#FF9090" : isAi ? actColor + "30" : n.source === "goal" ? "rgba(0,3,50,0.12)" : (n.source === "thinking" && n.qIndex === 3) ? "rgba(255,144,144,0.35)" : n.source === "thinking" ? "rgba(255,144,144,0.15)" : "rgba(0,3,50,0.06)"}`,
                  borderLeft: (n.source === "thinking" && n.qIndex === 3 && !isSel) ? "3px solid #FF9090" : undefined,
                  boxShadow: isSel ? "0 0 0 3px rgba(255,144,144,0.15), 0 1px 3px rgba(0,3,50,0.03)" : (q4Pulsing && n.source === "thinking" && n.qIndex === 3) ? undefined : "0 1px 3px rgba(0,3,50,0.03)",
                  cursor: connecting ? "crosshair" : dragId === n.id ? "grabbing" : "grab",
                  zIndex: dragId === n.id ? 20 : isSel ? 10 : 1,
                  transition: isAi ? "none" : "box-shadow 0.15s",
                  animation: (q4Pulsing && n.source === "thinking" && n.qIndex === 3) ? "q4Glow 2s ease-in-out 3" : isAi ? "noteIn 0.3s ease-out forwards" : undefined,
                  animationDelay: isAi ? `${(notes.indexOf(n) % 3) * 100}ms` : undefined,
                  opacity: isAi ? 0 : undefined,
                }}
              >
                {n.source !== "goal" && (
                  <button
                    className="cn-del"
                    onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute", top: -7, right: -7,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(0,3,50,0.35)", color: "#fff",
                      border: "none", fontSize: 11, lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", opacity: 0,
                      transition: "opacity 0.15s",
                      zIndex: 5,
                    }}
                  >×</button>
                )}
                {sl && (
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: sl.color, marginBottom: 4, opacity: 0.7 }}>
                    {sl.text}
                  </div>
                )}
                {isAi && <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 4 }}>YOUR TURN</div>}
                {editId === n.id ? (
                  <textarea
                    autoFocus
                    value={n.text}
                    onChange={e => updateText(n.id, e.target.value)}
                    onBlur={() => finishEdit(n.id)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(n.id); } }}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ width: "100%", minHeight: 40, border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: isAi ? "Georgia,serif" : "'Codec Pro',sans-serif", fontSize: 13, lineHeight: 1.55, color: "#000332" }}
                  />
                ) : (
                  <div style={{
                    fontSize: 13, lineHeight: 1.55, color: "#000332",
                    fontFamily: isAi ? "Georgia,serif" : "'Codec Pro',sans-serif",
                    fontStyle: isAi ? "italic" : "normal",
                    opacity: isAi ? 0.75 : 1,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {n.text || <span style={{ color: "rgba(0,3,50,0.25)" }}>Double-click to edit</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes cSpin { to { transform:rotate(360deg); } }
        .cn:hover .cn-del { opacity: 1 !important; }
        @keyframes arrowDraw { to { stroke-dashoffset: 0; } }
        @keyframes noteIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
        @keyframes coachIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes q4Glow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0), 0 1px 3px rgba(0,3,50,0.03); } 50% { box-shadow: 0 0 0 8px rgba(255,144,144,0.12), 0 1px 3px rgba(0,3,50,0.03); } }
      `}</style>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#F5F2ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <CanvasInner />
    </Suspense>
  );
}
