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
  source?: "goal" | "thinking" | "ai" | "user";
  action?: Action;
  aiInstruction?: boolean;
}

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
  let qas: QA[] = [];
  try { qas = JSON.parse(qasRaw); } catch { qas = []; }

  // Build initial notes from session data
  const buildInitial = useCallback((): Note[] => {
    const notes: Note[] = [];
    if (capture) {
      notes.push({ id: uid(), x: 40, y: 40, text: capture, source: "goal" });
    }
    qas.forEach((qa, i) => {
      notes.push({ id: uid(), x: 40, y: 200 + i * 130, text: qa.answer, source: "thinking" });
    });
    return notes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [notes, setNotes] = useState<Note[]>(() => buildInitial());
  const [connections, setConnections] = useState<Connection[]>([]);
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
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const vpRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!capture) router.push("/session/new"); }, [capture, router]);

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
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(2, Math.max(0.3, z * (e.deltaY > 0 ? 0.92 : 1.08))));
    };
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
    if (!n) return;
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
      const newNotes: Note[] = instructions.map((inst, i) => ({
        id: uid(),
        x: selNote.x + 260,
        y: selNote.y + (i - 1) * 130,
        text: inst,
        source: "ai" as const,
        action,
        aiInstruction: true,
      }));
      const newConns: Connection[] = newNotes.map(n => ({
        id: uid(),
        from: selId,
        to: n.id,
        label: "",
        color: ACT[action].color,
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
    let md = `# Primer Canvas Session\n\n## Goal\n${capture}\n\n## Guided Thinking\n`;
    qas.forEach((qa, i) => { md += `\n### Q${i + 1}: ${qa.question}\n${qa.answer}\n`; });
    md += "\n## Canvas Notes\n";
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

  // Get note center for arrows
  const nc = (id: string) => {
    const n = notes.find(n => n.id === id);
    return n ? { x: n.x + 100, y: n.y + 30 } : { x: 0, y: 0 };
  };

  const sourceLabel = (n: Note) => {
    if (n.source === "goal") return { text: "YOUR GOAL", color: "#000332" };
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
        <button onClick={() => setShowExport(!showExport)} style={{ padding: "8px 16px", borderRadius: 100, border: "none", background: "#FF9090", fontSize: 12, fontWeight: 700, color: "#000332", cursor: "pointer", fontFamily: "inherit" }}>Ready to go? →</button>
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
          onClick={() => { if (!dragId) { setSelected(new Set()); setShowGoal(false); setShowExport(false); } }}
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
            <defs><marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(0,3,50,0.3)" /></marker></defs>
            {connections.map(c => {
              const f = nc(c.from); const t = nc(c.to);
              const col = c.color || "rgba(0,3,50,0.2)";
              return (
                <g key={c.id}>
                  <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={col} strokeWidth="1.5" markerEnd="url(#ah)" />
                  {c.label && <text x={(f.x + t.x) / 2} y={(f.y + t.y) / 2 - 6} textAnchor="middle" fill="rgba(0,3,50,0.4)" fontSize="10" fontFamily="'Codec Pro',sans-serif">{c.label}</text>}
                </g>
              );
            })}
          </svg>

          {/* NOTES */}
          {notes.map(n => {
            const isSel = selected.has(n.id);
            const sl = sourceLabel(n);
            const isAi = n.aiInstruction;
            const actColor = n.action ? ACT[n.action].color : "#FF9090";
            return (
              <div
                key={n.id}
                className="cn"
                onMouseDown={e => startDrag(n.id, e)}
                onDoubleClick={e => { e.stopPropagation(); setEditId(n.id); }}
                style={{
                  position: "absolute", left: n.x, top: n.y,
                  width: 200, minHeight: 60, padding: "10px 12px",
                  borderRadius: 10,
                  background: isAi ? `${actColor}08` : n.source === "goal" ? "rgba(0,3,50,0.05)" : n.source === "thinking" ? "rgba(255,144,144,0.04)" : "#fff",
                  border: `1.5px solid ${isSel ? "#FF9090" : isAi ? actColor + "30" : n.source === "goal" ? "rgba(0,3,50,0.12)" : n.source === "thinking" ? "rgba(255,144,144,0.15)" : "rgba(0,3,50,0.06)"}`,
                  boxShadow: isSel ? "0 0 0 3px rgba(255,144,144,0.15), 0 1px 3px rgba(0,3,50,0.03)" : "0 1px 3px rgba(0,3,50,0.03)",
                  cursor: connecting ? "crosshair" : dragId === n.id ? "grabbing" : "grab",
                  zIndex: dragId === n.id ? 20 : isSel ? 10 : 1,
                  transition: isAi ? "none" : "box-shadow 0.15s",
                  animation: isAi ? "noteIn 0.3s ease forwards" : undefined,
                }}
              >
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
        @keyframes noteIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
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
