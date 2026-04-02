"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  aiTitle?: string;
  discipline?: "design" | "systems" | "strategic" | "critical" | "creative";
}

interface ResponseFlow {
  instructionIds: string[];
  currentIdx: number;
  sourceId: string;
  action: Action;
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

const DISC_COLORS: Record<string, { bg: string; border: string; label: string; desc: string }> = {
  design:    { bg: "rgba(255,144,144,0.06)", border: "rgba(255,144,144,0.3)", label: "Design thinking", desc: "seeing it through their eyes" },
  systems:   { bg: "rgba(107,138,254,0.06)", border: "rgba(107,138,254,0.3)", label: "Systems thinking", desc: "how the pieces connect" },
  strategic: { bg: "rgba(126,214,168,0.06)", border: "rgba(126,214,168,0.3)", label: "Strategic thinking", desc: "where to focus and why" },
  critical:  { bg: "rgba(196,166,255,0.06)", border: "rgba(196,166,255,0.3)", label: "Critical thinking", desc: "testing what you believe" },
  creative:  { bg: "rgba(232,201,122,0.06)", border: "rgba(232,201,122,0.3)", label: "Creative thinking", desc: "breaking the pattern" },
};
const DISC_DOT: Record<string, string> = { design: "#FF9090", systems: "#6B8AFE", strategic: "#7ED6A8", critical: "#C4A6FF", creative: "#E8C97A" };

function uid() { return crypto.randomUUID(); }

function CanvasInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const captureParam = sp.get("capture") || "";
  const modeParam = sp.get("mode") || "clarity";
  const qasRaw = sp.get("qas") || "[]";
  const dimsRaw = sp.get("dimensions") || "[]";
  let qasParam: QA[] = [];
  try { qasParam = JSON.parse(qasRaw); } catch { qasParam = []; }
  let dimsParam: { label: string; description: string }[] = [];
  try { dimsParam = JSON.parse(dimsRaw); } catch { dimsParam = []; }

  // Mutable state — populated from URL params or loaded session
  const [capture, setCapture] = useState(captureParam);
  const [mode, setMode] = useState(modeParam);
  const [qas, setQas] = useState<QA[]>(qasParam);
  const [dimensions, setDimensions] = useState(dimsParam);
  const [canvasReady, setCanvasReady] = useState(!sp.get("session_id")); // ready immediately for new sessions

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

  // Character-count-based vertical offset — intentionally generous
  const charOffset = (text: string) => {
    const c = text.length;
    if (c < 100) return 150;
    if (c < 200) return 220;
    if (c < 400) return 320;
    if (c < 600) return 420;
    return 520;
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
      // Place Q&A notes below their dimension column with generous spacing
      // Track the bottom Y of each column to stack vertically without overlap
      const colBottomY: Record<number, number> = {};
      qas.forEach((qa, i) => {
        const dimIdx = Math.min(i, dimensions.length - 1);
        const topY = colBottomY[dimIdx] ?? 500; // first note starts at y=500 (below dim headers)
        colBottomY[dimIdx] = topY + charOffset(qa.answer);
        const nid = uid();
        ns.push({
          id: nid,
          x: 65 + dimIdx * 260,
          y: topY,
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
  const [editId, setEditId] = useState<string | null>(null);
  const editPreHeight = useRef(0);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connLabel, setConnLabel] = useState("");
  const [connModal, setConnModal] = useState<{ from: string; to: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState("");
  const [responseFlow, setResponseFlow] = useState<ResponseFlow | null>(null);
  const [responseText, setResponseText] = useState("");
  const [respCardPos, setRespCardPos] = useState<{ x: number; y: number } | null>(null);
  const [respDragOff, setRespDragOff] = useState<{ x: number; y: number } | null>(null);
  const [synthesis, setSynthesis] = useState<{ deliverable_label: string; sections: { heading: string; content: string }[]; reflection?: string; deliverable?: string; thinking_approaches?: string } | null>(null);
  const [synthEditing, setSynthEditing] = useState(false);
  const [synthLoading, setSynthLoading] = useState(false);
  const [q4Pulsing, setQ4Pulsing] = useState(false);
  const [tourWelcome, setTourWelcome] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourCheckedRef = useRef(false);
  const [noteSuggestions, setNoteSuggestions] = useState<Record<string, Action>>({});
  const [freshSuggestions, setFreshSuggestions] = useState<Set<string>>(new Set());
  const [nudgeDimIdx, setNudgeDimIdx] = useState<number | null>(null);
  const [allDimsComplete, setAllDimsComplete] = useState(false);
  const [dimStatus, setDimStatus] = useState<Record<string, "unexplored" | "in_progress" | "complete">>({});
  const [statusState, setStatusState] = useState<{
    type: "landing" | "working" | "keep_going" | "ready_to_move" | "all_done" | "loading" | "suggesting";
    dimName?: string;
    nextDimName?: string;
    actionColor?: string;
    nextAction?: Action;
    nextActionReason?: string;
    firstNoteLabel?: string;
  }>({ type: "landing" });
  const [symbolHintShown, setSymbolHintShown] = useState(false);
  const [showSymbolHint, setShowSymbolHint] = useState(false);
  const [exampleNoteId, setExampleNoteId] = useState<string | null>(null);
  const [exampleText, setExampleText] = useState("");
  const [exampleLoading, setExampleLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [discoveries, setDiscoveries] = useState<{ id: string; text: string; dimLabel: string; discipline?: string; createdAt: string }[]>([]);
  const [discOpen, setDiscOpen] = useState(true);
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalyzeRef = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(sp.get("session_id"));
  const sessionIdRef = useRef<string | null>(sp.get("session_id"));
  const sessionCreatedRef = useRef(!!sp.get("session_id"));
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [userId, setUserId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const zoomRef = useRef(zoom);
  const dragOffRef = useRef({ x: 0, y: 0 });
  const vpRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Session init: create new or load existing
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const uid = user?.id;

      // Load existing session
      if (sessionId) {
        console.log("[canvas] Loading session:", sessionId);
        try {
          const res = await fetch(`/api/sessions?id=${sessionId}`);
          const data = await res.json();
          console.log("[canvas] Session data:", data);
          if (data.goal) setCapture(data.goal);
          if (data.mode) setMode(data.mode);
          if (data.qas) setQas(data.qas);
          if (data.dimensions) setDimensions(data.dimensions);
          if (data.canvas_state?.notes?.length) {
            setNotes(data.canvas_state.notes);
          }
          if (data.canvas_state?.connections?.length) {
            setConnections(data.canvas_state.connections);
          }
          if (data.canvas_state?.discoveries?.length) {
            setDiscoveries(data.canvas_state.discoveries);
          }
          if (data.synthesis) setSynthesis(data.synthesis);
        } catch (err) {
          console.error("[canvas] Load error:", err);
        }
        setCanvasReady(true);
        return;
      }

      // No capture and no session_id — redirect
      if (!captureParam) { router.push("/session/new"); return; }

      // Create new session — guard against duplicates (React StrictMode, double mount)
      if (sessionCreatedRef.current || sessionIdRef.current) {
        console.log("[canvas] Session already created, skipping POST");
      } else if (uid) {
        sessionCreatedRef.current = true;
        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: uid, goal: capture, mode, qas, dimensions,
              canvas_state: { notes, connections, discoveries },
            }),
          });
          const data = await res.json();
          if (data.id) {
            console.log("[canvas] New session created:", data.id);
            setSessionId(data.id);
            sessionIdRef.current = data.id;
            // Add session_id to URL so refreshes load instead of creating new
            const url = new URL(window.location.href);
            url.searchParams.set("session_id", data.id);
            window.history.replaceState({}, "", url.toString());
          } else {
            console.error("[canvas] Session creation returned no ID:", data);
            sessionCreatedRef.current = false;
          }
        } catch (err) {
          console.error("[canvas] Session creation failed:", err);
          sessionCreatedRef.current = false;
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep sessionId ref in sync
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Autosave: debounced, triggers on changes
  const saveCanvas = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) {
      console.warn("[canvas] Save skipped — no session ID");
      return;
    }
    console.log("[canvas] Saving:", { sessionId: sid, notes: notes.length, connections: connections.length });
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          canvas_state: { notes, connections, discoveries },
          synthesis: synthesis || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[canvas] Save failed:", data);
        setSaveStatus("unsaved");
      } else {
        console.log("[canvas] Save success");
        setSaveStatus("saved");
        dirtyRef.current = false;
      }
    } catch (err) {
      console.error("[canvas] Save error:", err);
      setSaveStatus("unsaved");
    }
  }, [notes, connections, synthesis, discoveries]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveCanvas(), 2000);
  }, [saveCanvas]);

  // Track changes for autosave
  useEffect(() => {
    if (sessionId) scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, connections]);

  // Initialize dimension tracking and landing status
  useEffect(() => {
    if (!canvasReady || dimensions.length === 0) return;
    const initial: Record<string, "unexplored" | "in_progress" | "complete"> = {};
    dimensions.forEach(d => { initial[d.label] = "unexplored"; });
    setDimStatus(initial);
    const firstThinking = notes.find(n => n.source === "thinking");
    setStatusState({ type: "landing", dimName: dimensions[0]?.label, firstNoteLabel: firstThinking ? (THINKING_LABELS[mode]?.[firstThinking.qIndex ?? 0] || "your first note") : undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady]);

  // Show suggestion from analyze-notes when user selects a note
  useEffect(() => {
    if (selected.size !== 1 || responseFlow || aiLoading) return;
    const selId = [...selected][0];
    const selNote = notes.find(n => n.id === selId);
    if (!selNote || selNote.source === "dimension" || selNote.source === "goal") return;
    const sug = noteSuggestions[selId];
    if (sug) {
      setStatusState({
        type: "suggesting",
        nextAction: sug,
        nextActionReason: `This note could use ${ACT[sug].label.toLowerCase()}.`,
        actionColor: ACT[sug].color,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, noteSuggestions]);

  // Periodic autosave every 30s if dirty
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && sessionId) saveCanvas();
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionId, saveCanvas]);

  // First-time tour check — slight delay to ensure canvas is rendered
  useEffect(() => {
    if (tourCheckedRef.current || !canvasReady) return;
    tourCheckedRef.current = true;
    const t = setTimeout(() => {
      const toured = localStorage.getItem("primer_canvas_toured");
      console.log("[canvas] primer_canvas_toured:", toured);
      if (!toured) {
        setTourWelcome(true);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [canvasReady]);

  const startTour = () => { setTourWelcome(false); setTourStep(0); };
  const skipTour = () => {
    setTourWelcome(false); setTourStep(null);
    localStorage.setItem("primer_canvas_toured", "true");
    // Show coach card after 10s if no note selected
    setTimeout(() => {
    }, 10000);
  };
  const nextTourStep = () => {
    if (tourStep !== null && tourStep < 3) {
      setTourStep(tourStep + 1);
    } else {
      setTourStep(null);
      localStorage.setItem("primer_canvas_toured", "true");
      setTimeout(() => {
        }, 10000);
    }
  };


  // Note analysis: suggest actions for notes
  const analyzeNotes = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastAnalyzeRef.current < 8000) return;
    lastAnalyzeRef.current = now;
    const eligible = notes.filter(n =>
      n.source !== "dimension" && n.source !== "goal" && !n.aiInstruction && n.text.trim().length > 5
    );
    if (eligible.length === 0) return;
    try {
      const res = await fetch("/api/analyze-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: capture,
          notes: eligible.map(n => ({ id: n.id, text: n.text, label: n.source === "thinking" ? "guided thinking answer" : undefined })),
        }),
      });
      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        const map: Record<string, Action> = {};
        const ids = new Set<string>();
        data.suggestions.forEach((s: { id: string; action: Action }) => {
          map[s.id] = s.action;
          ids.add(s.id);
        });
        setNoteSuggestions(map);
        setFreshSuggestions(ids);
        setTimeout(() => setFreshSuggestions(new Set()), 1500);
        // Show first-time symbol hint
        if (ids.size > 0 && !symbolHintShown && !localStorage.getItem("primer_symbol_hint_shown")) {
          setSymbolHintShown(true);
          setShowSymbolHint(true);
          setTimeout(() => setShowSymbolHint(false), 5000);
        }
      }
    } catch { /* silent */ }
  }, [notes, capture]);

  // Trigger analysis on canvas load (3s delay)
  useEffect(() => {
    if (!canvasReady || notes.length < 2) return;
    const t = setTimeout(() => analyzeNotes(), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady]);

  // Keep refs in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const s2c = (cx: number, cy: number) => {
    if (!vpRef.current) return { x: 0, y: 0 };
    return { x: cx, y: cy + vpRef.current.scrollTop };
  };

  // Note drag — window listeners activate only when dragId is set
  useEffect(() => {
    if (!dragId) return;
    const scrollContainer = vpRef.current;
    if (scrollContainer) scrollContainer.style.overflowY = "hidden";

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const newX = Math.max(0, e.clientX - dragOffRef.current.x);
      const newY = Math.max(0, e.clientY - dragOffRef.current.y + scrollTop);
      setNotes(ns => ns.map(n => n.id === dragId ? { ...n, x: newX, y: newY } : n));
    };
    const handleMouseUp = () => {
      setDragId(null);
      if (scrollContainer) scrollContainer.style.overflowY = "auto";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (scrollContainer) scrollContainer.style.overflowY = "auto";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  // Note drag start
  const startDrag = (id: string, e: React.MouseEvent) => {
    if (editId === id || justFinishedEditRef.current) return;
    const t = e.target as HTMLElement;
    if (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "BUTTON" || t.closest("button") || t.closest("a")) return;
    e.preventDefault();
    e.stopPropagation();
    const n = notes.find(n => n.id === id);
    if (!n || n.source === "dimension") return;
    if (connecting) {
      if (!connectFrom) { setConnectFrom(id); return; }
      if (connectFrom !== id) { setConnModal({ from: connectFrom, to: id }); setConnectFrom(null); }
      return;
    }
    console.log("[canvas] Note mousedown", id);
    const scrollTop = vpRef.current ? vpRef.current.scrollTop : 0;
    dragOffRef.current = { x: e.clientX - n.x, y: e.clientY - (n.y - scrollTop) };
    setDragId(id);
    if (!e.shiftKey) setSelected(new Set([id]));
    else setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  };


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

  const justFinishedEditRef = useRef(false);
  const finishEdit = (id: string) => {
    setEditId(null);
    justFinishedEditRef.current = true;
    setTimeout(() => { justFinishedEditRef.current = false; }, 300);
    setNotes(ns => ns.filter(n => n.id !== id || n.text.trim()));
    // Re-analyze after editing (force bypass debounce)
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current = setTimeout(() => analyzeNotes(true), 3000);
  };

  const finishConnection = () => {
    if (!connModal) return;
    setConnections(cs => [...cs, { id: uid(), from: connModal.from, to: connModal.to, label: connLabel }]);
    setConnLabel("");
    setConnModal(null);
  };

  // Find which dimension a note belongs to (closest x position)
  const findNoteDim = (note: Note) => {
    const dimNotes = notes.filter(n => n.source === "dimension");
    if (dimNotes.length === 0) return { label: "", desc: "", idx: -1 };
    let closest = dimNotes[0];
    let closestDist = Math.abs(note.x - dimNotes[0].x);
    dimNotes.forEach(d => {
      const dist = Math.abs(note.x - d.x);
      if (dist < closestDist) { closestDist = dist; closest = d; }
    });
    return { label: closest.dimLabel || "", desc: closest.dimDesc || "", idx: closest.dimIndex ?? 0 };
  };

  // AI action — generates ONE instruction
  const runAction = async (action: Action) => {
    if (selected.size === 0) return;
    const selId = [...selected][0];
    const selNote = notes.find(n => n.id === selId);
    if (!selNote) return;
    setNoteSuggestions(prev => { const n = { ...prev }; delete n[selId]; return n; });

    const dim = findNoteDim(selNote);
    if (dim.label) {
      setDimStatus(prev => ({ ...prev, [dim.label]: prev[dim.label] === "complete" ? "complete" : "in_progress" }));
    }
    setStatusState({ type: "loading" });
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
          allNotesText: notes.filter(n => n.source !== "dimension").map(n => n.text).join("\n\n"),
          dimensionLabel: dim.label,
          dimensionDescription: dim.desc,
          existingInstructions: notes.filter(n => n.aiInstruction).map(n => `- ${n.text}`).join("\n") || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();

      // Parse the single instruction (API now returns { instruction } not { instructions })
      const raw = data.instruction || (data.instructions && data.instructions[0]) || { title: "Your thinking", text: "Write what comes to mind.", discipline: "strategic" };
      const cleanTitle = (t: string) => {
        let s = t.includes(":") ? t.split(":")[0].trim() : t;
        const words = s.split(/\s+/);
        if (words.length > 5) s = words.slice(0, 4).join(" ");
        return s;
      };
      let title = cleanTitle((raw.title || "").replace(/[`*_]/g, ""));
      let text = (raw.text || "").replace(/[`*_]/g, "");
      const disc = (["design","systems","strategic","critical","creative"].includes(raw.discipline) ? raw.discipline : "strategic") as Note["discipline"];

      // Validation: if instruction is under 8 words, it's probably a title — swap
      const textWords = text.split(/\s+/).length;
      const titleWords = title.split(/\s+/).length;
      if (textWords < 8 && titleWords >= 8) {
        const tmp = text;
        text = title;
        title = cleanTitle(tmp);
      } else if (textWords < 8 && titleWords < 8) {
        // Both too short — use full raw text as instruction
        const fullText = [raw.title, raw.text].filter(Boolean).join(" ").replace(/[`*_]/g, "");
        text = fullText;
        title = cleanTitle(fullText.split(/\s+/).slice(0, 3).join(" "));
      }

      // Place directly below the source note (vertical chain, generous offset)
      const startY = selNote.y + charOffset(selNote.text);

      const instId = uid();
      const instNote: Note = {
        id: instId, x: selNote.x, y: startY,
        text, source: "ai", action, aiInstruction: true, aiTitle: title, discipline: disc,
      };
      setNotes(ns => [...ns, instNote]);
      setConnections(cs => [...cs, { id: uid(), from: selId, to: instId, label: "", color: ACT[action].color }]);

      // Auto-scroll vertically to show new note
      // Auto-scroll to show new note
      if (vpRef.current) {
        vpRef.current.scrollTo({ top: startY - 100, behavior: "smooth" });
      }

      // Start single-instruction response flow
      setResponseFlow({ instructionIds: [instId], currentIdx: 0, sourceId: selId, action });
      setResponseText("");
      setSelected(new Set());
      setStatusState({ type: "working", dimName: dim.label });
    } catch { /* handled by API fallback */ }
    setAiLoading(false);
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current = setTimeout(() => analyzeNotes(true), 3000);
  };

  // Export helpers
  const buildMarkdown = () => {
    let md = `# Primer Canvas Session\n\n`;
    if (synthesis?.sections) {
      md += `## ${synthesis.deliverable_label}\n\n`;
      synthesis.sections.forEach(s => { md += `### ${s.heading}\n${s.content}\n\n`; });
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
    await saveCanvas();
    setToast("✓ Saved to your Studio");
    setTimeout(() => { setToast(""); router.push("/studio"); }, 2500);
  };

  const copyPrompt = () => {
    let synthText = "";
    if (synthesis?.sections) {
      synthText = `${synthesis.deliverable_label}\n\n` + synthesis.sections.map(s => `${s.heading}: ${s.content}`).join("\n\n") + "\n\n---\n\n";
    }
    const md = "Here's my thinking session output from Primer. I've already done the deep thinking — now I need help executing on it.\n\n" + synthText + "Original session notes:\n\n" + notes.filter(n => n.source !== "dimension").map(n => `- ${n.text}`).join("\n");
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

  // Response flow: complete the instruction
  const completeResponse = async () => {
    if (!responseFlow) return;
    const instId = responseFlow.instructionIds[responseFlow.currentIdx];
    const instNote = notes.find(n => n.id === instId);
    if (!instNote || !responseText.trim()) return;

    // Create response note below the instruction
    const respId = uid();
    const respNote: Note = {
      id: respId, x: instNote.x, y: instNote.y + charOffset(instNote.text),
      text: responseText.trim(), source: "user", discipline: instNote.discipline,
    };
    setNotes(ns => [...ns, respNote]);
    setConnections(cs => [...cs, {
      id: uid(), from: instId, to: respId, label: "", color: "rgba(0,3,50,0.1)",
    }]);
    setResponseText("");
    setRespCardPos(null);
    setResponseFlow(null);

    // Re-analyze notes (force bypass debounce)
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current = setTimeout(() => analyzeNotes(true), 3000);

    // Generate discovery line
    const dim = findNoteDim(instNote);
    fetch("/api/generate-discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userResponse: respNote.text,
        dimensionLabel: dim.label,
        previousDiscoveries: discoveries.map(d => d.text).join("\n") || undefined,
      }),
    }).then(r => r.json()).then(data => {
      if (data.discovery) {
        setDiscoveries(prev => [...prev, { id: uid(), text: data.discovery, dimLabel: dim.label, discipline: instNote.discipline, createdAt: new Date().toISOString() }]);
      }
    }).catch(() => { /* skip */ });

    // Assess dimension progression
    if (dimensions.length > 0) {
      setStatusState({ type: "loading" });
      const dim = findNoteDim(instNote);
      const dimNotes = notes.filter(n => n.source !== "dimension");
      const dimHeaders = notes.filter(n => n.source === "dimension");
      const notesUnderDim = dimNotes.filter(n => {
        let closest = dimHeaders[0];
        let closestDist = Math.abs(n.x - dimHeaders[0].x);
        dimHeaders.forEach(d => { const dist = Math.abs(n.x - d.x); if (dist < closestDist) { closestDist = dist; closest = d; } });
        return (closest.dimLabel || "") === dim.label;
      });
      const responseCount = [...notesUnderDim, respNote].filter(n => n.source === "user").length;

      // Helper to handle "ready to move"
      const handleReadyToMove = () => {
        setDimStatus(prev => ({ ...prev, [dim.label]: "complete" }));
        const completedCount = Object.values(dimStatus).filter(s => s === "complete").length + 1;
        const currentDimIdx = dimensions.findIndex(d => d.label === dim.label);
        const nextDimEntry = dimensions.find(d => d.label !== dim.label && dimStatus[d.label] !== "complete");
        if (nextDimEntry) {
          const nextIdx = dimensions.indexOf(nextDimEntry);
          const remaining = dimensions.length - completedCount;
          setNudgeDimIdx(nextIdx);
          setTimeout(() => setNudgeDimIdx(null), 8000);
          // Find first thinking note under next dimension
          const nextDimHeader = dimHeaders.find(h => h.dimLabel === nextDimEntry.label);
          const nextThinkingNote = nextDimHeader ? dimNotes.find(n => n.source === "thinking" && Math.abs(n.x - nextDimHeader.x) < 130) : null;
          let reassurance = completedCount >= 3 && completedCount < dimensions.length ? " Your thinking is really taking shape." : "";
          setStatusState({
            type: "ready_to_move",
            dimName: dim.label,
            nextDimName: nextDimEntry.label,
            nextActionReason: `${remaining} left.${reassurance}`,
            firstNoteLabel: nextThinkingNote ? (THINKING_LABELS[mode]?.[nextThinkingNote.qIndex ?? 0] || undefined) : undefined,
          });
          // Auto-scroll to show dimension headers
          if (vpRef.current) {
            vpRef.current.scrollTo({ top: 0, behavior: "smooth" });
          }
        } else {
          setAllDimsComplete(true);
          setStatusState({ type: "all_done" });
        }
      };

      // Hard limit: 3+ responses = always ready to move (skip API call)
      if (responseCount >= 3) {
        await new Promise(r => setTimeout(r, 800));
        handleReadyToMove();
      } else {
        try {
          const assessRes = await fetch("/api/assess-dimension", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              goal: capture,
              currentDimension: `${dim.label} — ${dim.desc}`,
              dimensionNotes: [...notesUnderDim, respNote].map(n => n.text).join("\n\n"),
              allDimensions: dimensions.map(d => `${d.label} — ${d.description}`).join("\n"),
              mode,
              lastNote: respNote.text,
            }),
          });
          const assessData = await assessRes.json();
          const recAction = (assessData.next_action || "clarify") as Action;
          const recReason = assessData.next_action_reason || "";

          await new Promise(r => setTimeout(r, 1000));

          if (assessData.status === "ready_to_move" || responseCount >= 2) {
            handleReadyToMove();
          } else {
            setStatusState({ type: "keep_going", dimName: dim.label, nextAction: recAction, nextActionReason: recReason, actionColor: ACT[recAction].color });
          }
        } catch {
          setStatusState({ type: "keep_going", dimName: dim.label });
        }
      }
    }
  };

  const skipResponse = () => {
    if (!responseFlow) return;
    setResponseText("");
    setRespCardPos(null);
    const nextIdx = responseFlow.currentIdx + 1;
    if (nextIdx < responseFlow.instructionIds.length) {
      setResponseFlow({ ...responseFlow, currentIdx: nextIdx });
    } else {
      setResponseFlow(null);
    }
  };

  // Note height estimation for arrow routing
  const noteW = dimensions.length > 0 ? 190 : 200;
  const estH = (text: string) => {
    const c = text.length;
    if (c < 100) return 100;
    if (c < 200) return 160;
    if (c < 400) return 240;
    return 320;
  };

  // Arrow path: determines edge attachment based on relative position
  const arrowPath = (fromId: string, toId: string) => {
    const f = notes.find(n => n.id === fromId);
    const t = notes.find(n => n.id === toId);
    if (!f || !t) return { d: "", mx: 0, my: 0 };
    const fH = estH(f.text);
    const tH = estH(t.text);
    const dx = t.x - f.x;
    const dy = t.y - f.y;

    let x1: number, y1: number, x2: number, y2: number;

    if (Math.abs(dx) < 100) {
      // Vertically aligned: bottom→top or top→bottom
      if (dy >= 0) {
        x1 = f.x + noteW / 2; y1 = f.y + fH;
        x2 = t.x + noteW / 2; y2 = t.y;
      } else {
        x1 = f.x + noteW / 2; y1 = f.y;
        x2 = t.x + noteW / 2; y2 = t.y + tH;
      }
    } else if (dx > 0) {
      // Target to the right
      x1 = f.x + noteW; y1 = f.y + fH / 2;
      x2 = t.x; y2 = t.y + tH / 2;
    } else {
      // Target to the left
      x1 = f.x; y1 = f.y + fH / 2;
      x2 = t.x + noteW; y2 = t.y + tH / 2;
    }

    // Quadratic bezier control point: midpoint offset 30px perpendicular
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
    const perpX = -(y2 - y1) / len * 30;
    const perpY = (x2 - x1) / len * 30;

    return { d: `M ${x1} ${y1} Q ${mx + perpX} ${my + perpY} ${x2} ${y2}`, mx, my };
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

  // Show loading state while session loads, or redirect if truly no data
  if (!canvasReady) {
    return (
      <div style={{ height: "100vh", background: "#F5F2ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>Loading canvas...</p>
      </div>
    );
  }
  if (!capture && !sp.get("session_id")) return null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Codec Pro',sans-serif", position: "relative" }}>
      {/* UNIFIED HEADER BAR */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 35,
        height: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(250,247,240,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,3,50,0.04)", padding: "0 20px",
        fontFamily: "'Codec Pro',sans-serif",
      }}>
        {/* LEFT: Back to Studio */}
        <button
          onClick={async () => { await saveCanvas(); router.push("/studio"); }}
          style={{ background: "none", border: "none", fontSize: 13, color: "#000332", cursor: "pointer", fontFamily: "inherit", opacity: 0.6 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
        >&larr; Studio</button>

        {/* CENTER: Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={addNote} style={{ padding: "4px 12px", borderRadius: 100, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: "#000332", cursor: "pointer", fontFamily: "inherit" }}>+ Note</button>
          <button onClick={() => { setConnecting(!connecting); setConnectFrom(null); }} style={{ padding: "4px 12px", borderRadius: 100, border: "none", background: connecting ? "rgba(0,3,50,0.08)" : "transparent", fontSize: 12, fontWeight: 600, color: connecting ? "#FF9090" : "#000332", cursor: "pointer", fontFamily: "inherit" }}>Connect</button>
          <button onClick={() => saveCanvas()} title="Save" style={{ padding: "4px 8px", borderRadius: 100, border: "none", background: "transparent", fontSize: 12, color: saveStatus === "saved" ? "rgba(0,3,50,0.25)" : "#000332", cursor: "pointer", fontFamily: "inherit" }}>
            {saveStatus === "saving" ? "..." : saveStatus === "saved" ? "✓" : "💾"}
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(0,3,50,0.1)", margin: "0 4px" }} />
          {(Object.keys(ACT) as Action[]).map(a => {
            const tooltips: Record<Action, string> = {
              clarify: "Cut to the core. What actually matters here?",
              expand: "Stretch it. What else is possible?",
              decide: "Stress-test it. What could go wrong?",
              express: "Structure it. How would you say this?",
            };
            return (
              <div key={a} style={{ position: "relative" }} className="act-tip-wrap">
                <button onClick={() => runAction(a)} disabled={!hasSelection || aiLoading} style={{
                  padding: "4px 8px", borderRadius: 100, border: "none", background: "transparent",
                  fontSize: 14, color: hasSelection ? ACT[a].color : "rgba(0,3,50,0.2)",
                  cursor: hasSelection ? "pointer" : "default", opacity: hasSelection ? 1 : 0.4,
                  fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
                }}>{ACT[a].icon}</button>
                <div className="act-tip" style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  marginTop: 6, background: "#000332", color: "#FAF7F0", fontSize: 12,
                  padding: "8px 12px", borderRadius: 8, maxWidth: 200, whiteSpace: "nowrap",
                  pointerEvents: "none", zIndex: 100, opacity: 0, transition: "opacity 0.15s",
                  fontWeight: 400, lineHeight: 1.4,
                }}>
                  <div style={{
                    position: "absolute", top: -4, left: "50%", transform: "translateX(-50%) rotate(45deg)",
                    width: 8, height: 8, background: "#000332",
                  }} />
                  {tooltips[a]}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Goal, Ready to go, Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setShowGoal(!showGoal)} style={{ padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(0,3,50,0.08)", background: "transparent", fontSize: 12, fontWeight: 600, color: "#000332", cursor: "pointer", fontFamily: "inherit" }}>Goal</button>
          <button onClick={async () => {
            if (showExport) { setShowExport(false); return; }
            setShowExport(true);
            setSynthesis(null);
            setSynthLoading(true);
            try {
              const res = await fetch("/api/session-synthesis", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goal: capture, mode, dimensions, allNotes: notes.map(n => n.text).join("\n\n") }),
              });
              const data = await res.json();
              if (data.deliverable_label || data.sections) setSynthesis(data);
            } catch { /* use without synthesis */ }
            setSynthLoading(false);
          }} style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: "#FF9090", fontSize: 12, fontWeight: 700, color: "#000332", cursor: "pointer", fontFamily: "inherit", animation: allDimsComplete ? "rfPulse 1.5s ease-in-out infinite" : undefined }}>Ready to go? →</button>
          <button onClick={() => setShowLegend(!showLegend)} style={{ padding: "4px 8px", borderRadius: 100, border: "none", background: "transparent", fontSize: 14, color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "inherit" }}>◇</button>
        </div>
      </div>

      {/* GOAL DROPDOWN */}
      {showGoal && (
        <div style={{ position: "fixed", top: 50, right: 160, zIndex: 40, background: "#000332", borderRadius: 14, padding: "18px 20px", maxWidth: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 8 }}>Your goal</p>
          <p style={{ fontSize: 13, color: "rgba(250,247,240,0.7)", lineHeight: 1.6, fontWeight: 300 }}>{capture}</p>
        </div>
      )}

      {/* EXPORT PANEL */}
      {showExport && (
        <div style={{ position: "fixed", top: 50, right: 20, zIndex: 40, background: "#fff", borderRadius: 16, padding: "24px 24px", width: 340, maxHeight: "calc(100vh - 100px)", overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
          {synthLoading && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 18, height: 18, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "cSpin 0.7s linear infinite", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13, color: "rgba(0,3,50,0.4)", fontWeight: 300 }}>Sharpening your thinking...</p>
            </div>
          )}
          {synthesis && synthesis.sections && (
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(0,3,50,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <p style={{ fontSize: 18, fontWeight: 700, fontStyle: "italic", color: "#000332" }}>{synthesis.deliverable_label}</p>
                <button onClick={() => setSynthEditing(!synthEditing)} style={{ background: "none", border: "none", fontSize: 11, color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 2, flexShrink: 0, marginLeft: 8 }}>
                  {synthEditing ? "Done" : "Edit"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {synthesis.sections.map((sec, i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${(ACT as Record<string, {color:string}>)[mode]?.color || "#FF9090"}`, paddingLeft: 12 }}>
                    {synthEditing ? (
                      <>
                        <input value={sec.heading} onChange={e => { const ns = { ...synthesis, sections: synthesis.sections.map((s, j) => j === i ? { ...s, heading: e.target.value } : s) }; setSynthesis(ns); }} style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 700, color: "#000332", fontFamily: "inherit", marginBottom: 4 }} />
                        <textarea value={sec.content} onChange={e => { const ns = { ...synthesis, sections: synthesis.sections.map((s, j) => j === i ? { ...s, content: e.target.value } : s) }; setSynthesis(ns); }} style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: "#000332", lineHeight: 1.6, fontWeight: 400, fontFamily: "inherit", resize: "none", minHeight: 40 }} />
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#000332", marginBottom: 4 }}>{sec.heading}</p>
                        <p style={{ fontSize: 14, color: "#000332", lineHeight: 1.6, fontWeight: 400 }}>{sec.content}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "rgba(0,3,50,0.3)", fontStyle: "italic", marginTop: 12, fontWeight: 300 }}>
                This is your thinking, sharpened. Edit anything, then take it with you.
              </p>
              {synthesis.thinking_approaches && (
                <div style={{ borderTop: "1px solid rgba(0,3,50,0.06)", marginTop: 14, paddingTop: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(0,3,50,0.3)", marginBottom: 6 }}>HOW YOU THOUGHT THROUGH THIS</div>
                  <p style={{ fontSize: 13, color: "#000332", fontStyle: "italic", lineHeight: 1.55, fontWeight: 300 }}>
                    {synthesis.thinking_approaches}
                  </p>
                </div>
              )}
            </div>
          )}
          <p style={{ fontSize: 15, fontWeight: 700, color: "#000332", marginBottom: 14 }}>Take it with you</p>
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

      {/* LEGEND DROPDOWN (from header bar) */}
      {showLegend && (
        <div style={{ position: "fixed", top: 50, right: 20, zIndex: 40, background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", width: 220, animation: "noteIn 0.2s ease-out forwards" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#000332" }}>How you&rsquo;re thinking</span>
            <button onClick={() => setShowLegend(false)} style={{ background: "none", border: "none", fontSize: 14, color: "rgba(0,3,50,0.3)", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          {Object.entries(DISC_COLORS).map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: DISC_DOT[key], flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#000332" }}>{val.label}</div>
                <div style={{ fontSize: 11, color: "rgba(0,3,50,0.45)", fontWeight: 300 }}>{val.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DISCOVERIES CARD */}
      {dimensions.length > 0 && (
        <div style={{
          position: "fixed", right: 20, top: 100, zIndex: 20,
          width: 280, background: "#fff", borderRadius: 14,
          border: "1px solid rgba(0,3,50,0.06)",
          boxShadow: "0 4px 20px rgba(0,3,50,0.06)",
          overflow: "hidden",
        }}>
          <div
            onClick={() => setDiscOpen(!discOpen)}
            style={{
              padding: "12px 16px", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: discOpen ? "1px solid rgba(0,3,50,0.04)" : "none",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#000332" }}>Your discoveries</span>
            <span style={{ fontSize: 12, color: "rgba(0,3,50,0.3)" }}>{discOpen ? "▾" : "▸"}</span>
          </div>
          {discOpen && (
            <div style={{ maxHeight: 340, overflowY: "auto", padding: "8px 16px 12px" }}>
              {/* Progress dots */}
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {dimensions.map((d, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: dimStatus[d.label] === "complete" ? "#FF9090" : "rgba(0,3,50,0.1)",
                    transition: "background 0.3s",
                  }} />
                ))}
              </div>
              {discoveries.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(0,3,50,0.35)", fontStyle: "italic", lineHeight: 1.55 }}>
                  Your discoveries will appear here as you work through each dimension.
                </p>
              ) : (
                <>
                  {(() => {
                    let lastDim = "";
                    return discoveries.map((d, i) => {
                      const showDimHeader = d.dimLabel !== lastDim;
                      lastDim = d.dimLabel;
                      const discColor = d.discipline && DISC_DOT[d.discipline] ? DISC_DOT[d.discipline] : "#FF9090";
                      const colonIdx = d.text.indexOf(":");
                      const label = colonIdx > 0 ? d.text.slice(0, colonIdx) : "";
                      const rest = colonIdx > 0 ? d.text.slice(colonIdx + 1).trim() : d.text;
                      return (
                        <div key={i}>
                          {showDimHeader && (
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(0,3,50,0.3)", marginTop: i > 0 ? 10 : 0, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                              {d.dimLabel.toUpperCase()}
                              {dimStatus[d.dimLabel] === "complete" && <span style={{ color: "#7ED6A8" }}>✓</span>}
                            </div>
                          )}
                          <div style={{
                            borderLeft: `3px solid ${discColor}`,
                            paddingLeft: 10, marginBottom: 8,
                            animation: "noteIn 0.3s ease-out forwards",
                          }}>
                            <p style={{ fontSize: 13, color: "#000332", lineHeight: 1.45 }}>
                              {label ? <><strong style={{ color: "#000332" }}>{label}:</strong> {rest}</> : rest}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {allDimsComplete && (
                    <p style={{ fontSize: 12, color: "#FF9090", fontWeight: 600, marginTop: 8 }}>
                      All dimensions explored. Hit Ready to go → for your full brief.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* SYMBOL HINT */}
      {showSymbolHint && (
        <div style={{
          position: "fixed", top: 80, right: 40, zIndex: 40,
          background: "#fff", borderRadius: 10, padding: "12px 16px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxWidth: 240,
          animation: "noteIn 0.3s ease-out forwards",
          borderLeft: "3px solid #FF9090",
        }}>
          <p style={{ fontSize: 12, color: "#000332", lineHeight: 1.55, fontWeight: 300, fontFamily: "'Codec Pro',sans-serif" }}>
            These icons suggest what to do next. Click one to start.
          </p>
        </div>
      )}

      {/* STATUS BAR */}
      {dimensions.length > 0 && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 30,
          maxWidth: 560, width: "calc(100% - 48px)",
          background: "#fff", borderRadius: 12, padding: "14px 20px",
          boxShadow: "0 4px 20px rgba(0,3,50,0.08)",
          borderLeft: `3px solid ${
            statusState.type === "loading" ? "rgba(0,3,50,0.15)"
            : statusState.type === "working" ? (statusState.actionColor || "#FF9090")
            : statusState.type === "suggesting" ? (statusState.actionColor || "#FF9090")
            : statusState.type === "keep_going" ? (statusState.actionColor || "#FF9090")
            : statusState.type === "ready_to_move" ? "#7ED6A8"
            : "#FF9090"
          }`,
          transition: "border-color 0.3s, opacity 0.3s",
          fontFamily: "'Codec Pro',sans-serif",
        }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {dimensions.map((d, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: dimStatus[d.label] === "complete" ? "#FF9090" : "rgba(0,3,50,0.1)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 13, color: "#000332", lineHeight: 1.55, fontWeight: 300 }}>
            {statusState.type === "loading" && (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "cSpin 0.7s linear infinite", flexShrink: 0 }} />
                {responseFlow ? "Thinking..." : "Analyzing your thinking..."}
              </span>
            )}
            {statusState.type === "landing" && (
              <span>{statusState.firstNoteLabel
                ? <>Select <strong style={{ color: "#FF9090" }}>{statusState.firstNoteLabel}</strong> and choose an action to start developing your thinking.</>
                : <>Start with <strong style={{ color: "#FF9090" }}>{statusState.dimName}</strong>. Select a note under it and choose an action above.</>
              }</span>
            )}
            {statusState.type === "suggesting" && statusState.nextAction && (
              <span>Try <strong style={{ color: statusState.actionColor }}>{ACT[statusState.nextAction].label.toLowerCase()}</strong> on this note. {statusState.nextActionReason}</span>
            )}
            {statusState.type === "working" && (
              <span>Fill in your response below.</span>
            )}
            {statusState.type === "keep_going" && (() => {
              const remaining = dimensions.filter(d => dimStatus[d.label] !== "complete" && d.label !== statusState.dimName).length;
              const isLast = remaining === 0;
              return statusState.nextAction ? (
                <span>
                  You&rsquo;re developing <strong>{statusState.dimName}</strong>. Click on the note you just wrote and <strong style={{ color: statusState.actionColor }}>{ACT[statusState.nextAction].label.toLowerCase()}</strong> it. {statusState.nextActionReason}{" "}
                  <span style={{ color: "rgba(0,3,50,0.35)" }}>{isLast ? "Last dimension — finish this and you're ready." : `${remaining} more dimension${remaining > 1 ? "s" : ""} after this.`}</span>
                </span>
              ) : (
                <span>
                  You&rsquo;re developing <strong>{statusState.dimName}</strong>. Select another note and develop it further.{" "}
                  <span style={{ color: "rgba(0,3,50,0.35)" }}>{isLast ? "Last dimension — finish this and you're ready." : `${remaining} more dimension${remaining > 1 ? "s" : ""} after this.`}</span>
                </span>
              );
            })()}
            {statusState.type === "ready_to_move" && (
              <span>
                &#10003; <strong>{statusState.dimName}</strong> done. Move to <strong style={{ color: "#FF9090" }}>{statusState.nextDimName}</strong>.{" "}
                {statusState.firstNoteLabel
                  ? <>Select <strong style={{ color: "#FF9090" }}>{statusState.firstNoteLabel}</strong> to start.</>
                  : <>Select a note under it to start.</>
                }{" "}
                <span style={{ color: "rgba(0,3,50,0.35)" }}>{statusState.nextActionReason}</span>
              </span>
            )}
            {statusState.type === "all_done" && (
              <span>All dimensions explored. Hit <strong style={{ color: "#FF9090" }}>Ready to go →</strong> for your deliverable. Or keep refining.</span>
            )}
          </div>
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

      {/* SAVE STATUS */}
      <div style={{
        position: "fixed", bottom: 20, left: 20, zIndex: 25,
        fontSize: 11, fontFamily: "'Codec Pro',sans-serif",
        color: "rgba(0,3,50,0.4)",
        opacity: saveStatus === "saved" ? 0.3 : saveStatus === "saving" ? 0.5 : 0.6,
        transition: "opacity 0.15s",
      }}>
        {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Unsaved changes"}
      </div>

      {/* ZOOM CONTROLS */}
      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 25,
        background: "#fff", borderRadius: 10, padding: 4,
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column", gap: 2, alignItems: "center",
      }}>
        <button onClick={() => {
          const nz = Math.min(2, zoom + 0.1);
          if (vpRef.current) {
            const r = vpRef.current.getBoundingClientRect();
            const cx = r.width / 2, cy = r.height / 2;
          }
          setZoom(nz);
        }} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94949E", fontSize: 16, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,3,50,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >+</button>
        {Math.round(zoom * 100) !== 100 && (
          <span style={{ fontSize: 9, color: "#94949E", lineHeight: 1 }}>{Math.round(zoom * 100)}%</span>
        )}
        <button onClick={() => {
          const nz = Math.max(0.3, zoom - 0.1);
          if (vpRef.current) {
            const r = vpRef.current.getBoundingClientRect();
            const cx = r.width / 2, cy = r.height / 2;
          }
          setZoom(nz);
        }} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94949E", fontSize: 16, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,3,50,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >−</button>
        <button onClick={() => { setZoom(1); if (vpRef.current) vpRef.current.scrollTo({ top: 0 }); }} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94949E", fontSize: 14, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,3,50,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >⟲</button>
      </div>

      {/* CANVAS VIEWPORT */}
      <div ref={vpRef} style={{ height: "calc(100vh - 44px)", overflowY: "auto", overflowX: "hidden", cursor: dragId ? "grabbing" : connecting ? "crosshair" : "default", position: "relative", marginTop: 44 }}>
        <div
          ref={canvasRef}
          onMouseDown={(e) => { const t = e.target as HTMLElement; if (!t.closest(".cn") && editId) finishEdit(editId); }}
          onDoubleClick={onCanvasDoubleClick}
          onClick={(e) => { const t = e.target as HTMLElement; if (!dragId && !t.closest(".cn")) { setSelected(new Set()); setShowGoal(false); setShowExport(false); } }}
          style={{
            width: "100%", position: "relative",
            minHeight: Math.max(2000, Math.max(...notes.map(n => n.y + 300), 0) + 500),
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            background: "#F5F2ED",
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {/* ARROWS SVG */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
            <defs>
              {(Object.keys(ACT) as Action[]).map(a => (
                <marker key={a} id={`ah-${a}`} markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto">
                  <polygon points="0 0, 5 2.5, 0 5" fill={ACT[a].color} opacity="0.5" />
                </marker>
              ))}
            </defs>
            {connections.map(c => {
              const ap = arrowPath(c.from, c.to);
              if (!ap.d) return null;
              const col = c.color || "rgba(0,3,50,0.1)";
              const structuralColors = ["rgba(0,3,50,0.1)", "rgba(0,3,50,0.15)", "rgba(0,3,50,0.08)", "rgba(0,3,50,0.2)"];
              const isAiArrow = !structuralColors.includes(col);
              // Find matching action for marker
              const actionKey = isAiArrow ? (Object.keys(ACT) as Action[]).find(a => ACT[a].color === col) : null;
              return (
                <g key={c.id}>
                  <path
                    d={ap.d} fill="none"
                    stroke={isAiArrow ? col : "rgba(0,3,50,0.1)"}
                    strokeWidth={isAiArrow ? 1.5 : 1}
                    opacity={isAiArrow ? 0.35 : 1}
                    markerEnd={actionKey ? `url(#ah-${actionKey})` : undefined}
                    style={isAiArrow ? { strokeDasharray: 400, strokeDashoffset: 400, animation: "arrowDraw 0.4s ease-out forwards" } : undefined}
                  />
                  {c.label && <text x={ap.mx} y={ap.my - 6} textAnchor="middle" fill="rgba(0,3,50,0.3)" fontSize="10" fontFamily="'Codec Pro',sans-serif">{c.label}</text>}
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
                    zIndex: 10,
                    cursor: "default",
                    animation: nudgeDimIdx === (n.dimIndex ?? 0) ? "dimNudge 0.6s ease-in-out 2" : undefined,
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
                  {nudgeDimIdx === (n.dimIndex ?? 0) && (
                    <div style={{ fontSize: 11, color: "#FF9090", fontWeight: 600, marginTop: 6, animation: "noteIn 0.3s ease-out forwards" }}>
                      Explore this next &rarr;
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={n.id}
                className="cn"
                onMouseDown={e => startDrag(n.id, e)}
                onDoubleClick={e => { e.stopPropagation(); e.preventDefault(); setDragId(null); const cn = (e.target as HTMLElement).closest(".cn"); editPreHeight.current = cn ? cn.clientHeight : 0; setEditId(n.id); }}
                style={{
                  position: "absolute", left: n.x, top: n.y,
                  width: dimensions.length > 0 ? 190 : 200, padding: "10px 12px",
                  borderRadius: 10,
                  background: n.discipline && DISC_COLORS[n.discipline] ? DISC_COLORS[n.discipline].bg : isAi ? `${actColor}08` : n.source === "goal" ? "rgba(0,3,50,0.05)" : (n.source === "thinking" && n.qIndex === 3) ? "rgba(255,144,144,0.06)" : n.source === "thinking" ? "rgba(255,144,144,0.04)" : "#fff",
                  border: `${(n.source === "thinking" && n.qIndex === 3) ? "3px" : "1.5px"} solid ${editId === n.id ? "#FF9090" : isSel ? "#FF9090" : n.discipline && DISC_COLORS[n.discipline] ? DISC_COLORS[n.discipline].border : isAi ? actColor + "30" : n.source === "goal" ? "rgba(0,3,50,0.12)" : (n.source === "thinking" && n.qIndex === 3) ? "rgba(255,144,144,0.35)" : n.source === "thinking" ? "rgba(255,144,144,0.15)" : "rgba(0,3,50,0.06)"}`,
                  borderLeft: (n.source === "thinking" && n.qIndex === 3 && !isSel) ? "3px solid #FF9090" : undefined,
                  boxShadow: isSel ? "0 0 0 3px rgba(255,144,144,0.15), 0 1px 3px rgba(0,3,50,0.03)" : (q4Pulsing && n.source === "thinking" && n.qIndex === 3) ? undefined : "0 1px 3px rgba(0,3,50,0.03)",
                  cursor: connecting ? "crosshair" : dragId === n.id ? "grabbing" : "grab",
                  zIndex: dragId === n.id ? 50 : isSel ? 15 : 10,
                  opacity: dragId === n.id ? 0.9 : 1,
                  transition: dragId === n.id ? "none" : "box-shadow 0.15s, opacity 0.3s",
                  animation: (q4Pulsing && n.source === "thinking" && n.qIndex === 3) ? "q4Glow 2s ease-in-out 3"
                    : (responseFlow && n.aiInstruction && n.id === responseFlow.instructionIds[responseFlow.currentIdx]) ? "rfPulse 1.5s ease-in-out 2"
                    : isAi ? "noteIn 0.3s ease-out forwards" : undefined,
                  animationDelay: isAi && !responseFlow ? `${(notes.indexOf(n) % 3) * 100}ms` : undefined,
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
                {/* Top-right icon row: pencil + mode symbol */}
                {editId !== n.id && (
                  <div style={{ position: "absolute", top: 6, right: 6, zIndex: 5, display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="cn-edit"
                      onClick={(e) => { e.stopPropagation(); setDragId(null); const cn = (e.target as HTMLElement).closest(".cn"); editPreHeight.current = cn ? cn.clientHeight : 0; setEditId(n.id); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        background: "none", border: "none",
                        fontSize: 14, color: "#94949E", lineHeight: 1,
                        cursor: "pointer", opacity: 0,
                        transition: "opacity 0.15s",
                        padding: 0,
                      }}
                    >&#9998;</button>
                    {noteSuggestions[n.id] && !isAi && n.source !== "goal" && (() => {
                      const sugAction = noteSuggestions[n.id];
                      const sugColor = ACT[sugAction].color;
                      const sugIcon = ACT[sugAction].icon;
                      const sugLabel = ACT[sugAction].label.toLowerCase();
                      const isFresh = freshSuggestions.has(n.id);
                      const isSuggested = statusState.type === "suggesting" && statusState.nextAction === sugAction && selected.has(n.id);
                      return (
                        <div
                          className="sug-dot-wrap"
                          style={{ position: "relative" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(new Set([n.id]));
                            setNoteSuggestions(prev => { const next = { ...prev }; delete next[n.id]; return next; });
                            localStorage.setItem("primer_symbol_hint_shown", "true");
                            setTimeout(() => runAction(sugAction), 100);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="sug-dot" style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: `${sugColor}18`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            animation: isFresh ? "sugPulse 0.6s ease-in-out 2" : isSuggested ? "sugPulse 0.8s ease-in-out infinite" : undefined,
                          }}>
                            <span style={{ fontSize: 18, color: sugColor, opacity: 0.7, lineHeight: 1 }}>{sugIcon}</span>
                          </div>
                          <div className="sug-tip" style={{
                            position: "absolute", bottom: "100%", right: 0,
                            marginBottom: 6, background: "#000332", color: "#FAF7F0", fontSize: 11,
                            padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap",
                            pointerEvents: "none", zIndex: 100, opacity: 0, transition: "opacity 0.15s",
                            fontWeight: 400,
                          }}>
                            Click to {sugLabel} this note
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {sl && (
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: sl.color, marginBottom: 4, opacity: 0.7 }}>
                    {sl.text}
                  </div>
                )}
                {isAi && <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 4 }}>YOUR TURN</div>}
                {editId === n.id ? (
                  <>
                    <textarea
                      autoFocus
                      value={n.text}
                      onChange={e => {
                        updateText(n.id, e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      onBlur={() => finishEdit(n.id)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(n.id); } }}
                      onMouseDown={e => e.stopPropagation()}
                      ref={el => { if (el) { const preH = editPreHeight.current; el.style.height = "auto"; const scrollH = el.scrollHeight; el.style.height = Math.max(scrollH, preH > 0 ? preH - 20 : 30) + "px"; } }}
                      style={{ width: "100%", minHeight: 30, border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: isAi ? "Georgia,serif" : "'Codec Pro',sans-serif", fontSize: 13, lineHeight: 1.55, color: "#000332", overflow: "hidden" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                      <button
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); finishEdit(n.id); }}
                        style={{
                          padding: "4px 12px", borderRadius: 6, border: "none",
                          background: "#FF9090", color: "#fff", fontSize: 11,
                          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >Done</button>
                    </div>
                  </>
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
                {/* Show me an example — AI instruction notes only */}
                {isAi && editId !== n.id && (
                  <div style={{ position: "relative", marginTop: 8 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (exampleNoteId === n.id) { setExampleNoteId(null); return; }
                        setExampleNoteId(n.id);
                        setExampleText("");
                        setExampleLoading(true);
                        const dim = findNoteDim(n);
                        fetch("/api/instruction-example", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ instruction: n.text, goal: capture, dimensionLabel: dim.label }),
                        }).then(r => r.json()).then(d => {
                          setExampleText(d.example || "");
                          setExampleLoading(false);
                        }).catch(() => { setExampleLoading(false); setExampleNoteId(null); });
                      }}
                      onMouseDown={e => e.stopPropagation()}
                      style={{
                        background: "none", border: "none", fontSize: 11,
                        color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "inherit",
                        textDecoration: "underline", textUnderlineOffset: 2, padding: 0,
                      }}
                    >Show me an example</button>
                    {exampleNoteId === n.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          marginTop: 6, background: "rgba(0,3,50,0.03)", borderRadius: 8,
                          padding: 12, maxWidth: 250,
                        }}
                      >
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(0,3,50,0.3)", marginBottom: 4 }}>EXAMPLE</div>
                        {exampleLoading ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 12, height: 12, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "cSpin 0.7s linear infinite" }} />
                            <span style={{ fontSize: 11, color: "rgba(0,3,50,0.35)" }}>Loading...</span>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 12, color: "#000332", fontStyle: "italic", lineHeight: 1.55, marginBottom: 6 }}>{exampleText}</div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setExampleNoteId(null); }}
                              onMouseDown={e => e.stopPropagation()}
                              style={{ background: "none", border: "none", fontSize: 10, color: "rgba(0,3,50,0.3)", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 2, padding: 0 }}
                            >Got it</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* RESPONSE CARD */}
          {responseFlow && (() => {
            const instId = responseFlow.instructionIds[responseFlow.currentIdx];
            const instNote = notes.find(n => n.id === instId);
            if (!instNote) return null;
            const mColor = ACT[responseFlow.action].color;
            const rcX = respCardPos ? respCardPos.x : instNote.x;
            const rcY = respCardPos ? respCardPos.y : instNote.y + charOffset(instNote.text);
            return (
              <div
                className="cn"
                onMouseDown={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
                  e.stopPropagation();
                }}
                style={{
                position: "absolute",
                left: rcX,
                top: rcY,
                width: dimensions.length > 0 ? 190 : 200,
                background: "#fff",
                border: `2px solid ${mColor}`,
                borderRadius: 10,
                padding: "12px 14px",
                boxShadow: `0 2px 12px ${mColor}18`,
                zIndex: 25,
                animation: "noteIn 0.3s ease-out forwards",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: mColor, marginBottom: 6 }}>
                  {instNote.aiTitle || "Your response"}
                </div>
                <textarea
                  autoFocus
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  onMouseDown={e => e.stopPropagation()}
                  placeholder="Write here..."
                  style={{
                    width: "100%", minHeight: 60, border: "none", outline: "none",
                    resize: "none", background: "transparent",
                    fontFamily: "'Codec Pro',sans-serif", fontSize: 13,
                    lineHeight: 1.55, color: "#000332",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <button
                    onClick={completeResponse}
                    disabled={!responseText.trim()}
                    style={{
                      padding: "6px 16px", borderRadius: 100, border: "none",
                      background: responseText.trim() ? mColor : "rgba(0,3,50,0.06)",
                      color: responseText.trim() ? "#000332" : "rgba(0,3,50,0.25)",
                      fontSize: 12, fontWeight: 700, cursor: responseText.trim() ? "pointer" : "default",
                      fontFamily: "inherit",
                    }}
                  >Done</button>
                  <button onClick={skipResponse} style={{
                    background: "none", border: "none", fontSize: 11,
                    color: "rgba(0,3,50,0.3)", cursor: "pointer",
                    fontFamily: "inherit", textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}>Skip</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* TOUR: WELCOME OVERLAY */}
      {tourWelcome && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,3,50,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "tourFadeIn 0.3s ease forwards",
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "40px 40px",
            maxWidth: 480, width: "calc(100% - 48px)", textAlign: "center",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 28 }}>primer</div>
            <h2 style={{ fontSize: 24, fontWeight: 400, fontStyle: "italic", color: "#000332", marginBottom: 12 }}>
              Welcome to your canvas.
            </h2>
            <p style={{ fontSize: 14, color: "rgba(0,3,50,0.5)", fontWeight: 300, lineHeight: 1.65, marginBottom: 28, maxWidth: 360, margin: "0 auto 28px" }}>
              This is where your thinking becomes visible. Here&rsquo;s a quick tour.
            </p>
            <button onClick={startTour} style={{
              padding: "14px 32px", borderRadius: 100, border: "none",
              background: "#FF9090", color: "#000332", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", marginBottom: 12,
              display: "block", width: "100%",
            }}>Show me around</button>
            <button onClick={skipTour} style={{
              background: "none", border: "none", fontSize: 13,
              color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "inherit",
            }}>Skip, I&rsquo;ll figure it out</button>
          </div>
        </div>
      )}

      {/* TOUR: STEP OVERLAYS */}
      {tourStep !== null && (() => {
        const steps = [
          {
            spotTop: "0", spotLeft: "0", spotW: "100%", spotH: "120px",
            cardStyle: { position: "fixed" as const, top: 130, left: "50%", transform: "translateX(-50%)" },
            arrowSide: "top" as const,
            text: "Your goal is at the top. Below it, the dimensions are the key areas Primer thinks you should explore. Each one is a lane for your thinking.",
          },
          {
            spotTop: "120px", spotLeft: "0", spotW: "100%", spotH: "calc(100% - 180px)",
            cardStyle: { position: "fixed" as const, bottom: 80, left: "50%", transform: "translateX(-50%)" },
            arrowSide: "bottom" as const,
            text: "These are your answers from the guided thinking. They\u2019re already placed under the most relevant dimension. You can drag them anywhere.",
          },
          {
            spotTop: "4px", spotLeft: "calc(50% - 180px)", spotW: "360px", spotH: "48px",
            cardStyle: { position: "fixed" as const, top: 64, left: "50%", transform: "translateX(-50%)" },
            arrowSide: "top" as const,
            content: (
              <>
                <p style={{ fontSize: 14, color: "rgba(0,3,50,0.65)", fontWeight: 300, lineHeight: 1.65, marginBottom: 12 }}>
                  Select any note, then choose an action:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, color: "#000332", fontWeight: 400 }}><span style={{ color: "#6B8AFE" }}>◎ Clarify</span> — cut to the core</div>
                  <div style={{ fontSize: 13, color: "#000332", fontWeight: 400 }}><span style={{ color: "#FF9090" }}>✦ Expand</span> — stretch it further</div>
                  <div style={{ fontSize: 13, color: "#000332", fontWeight: 400 }}><span style={{ color: "#7ED6A8" }}>⟁ Decide</span> — stress-test it</div>
                  <div style={{ fontSize: 13, color: "#000332", fontWeight: 400 }}><span style={{ color: "#C4A6FF" }}>◈ Express</span> — structure it for others</div>
                </div>
                <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontWeight: 300, lineHeight: 1.5 }}>
                  Each action creates new thinking branches from your note.
                </p>
              </>
            ),
          },
          {
            spotTop: "4px", spotLeft: "calc(100% - 200px)", spotW: "190px", spotH: "48px",
            cardStyle: { position: "fixed" as const, top: 64, right: 20 },
            arrowSide: "top" as const,
            text: "When you\u2019ve developed your thinking enough, hit Ready to go. Primer will generate a deliverable you can actually use \u2014 a brief, a set of directions, a decision, or an articulated position.",
          },
        ];
        const step = steps[tourStep];
        const isLast = tourStep === 3;
        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 200 }}
            onClick={nextTourStep}
          >
            {/* Dark overlay with spotlight cutout using clip-path */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,3,50,0.75)",
              animation: "tourFadeIn 0.3s ease forwards",
            }} />
            {/* Spotlight */}
            <div style={{
              position: "absolute",
              top: step.spotTop, left: step.spotLeft,
              width: step.spotW, height: step.spotH,
              boxShadow: "0 0 0 4px rgba(255,144,144,0.3)",
              borderRadius: 12,
              zIndex: 201,
              pointerEvents: "none",
            }} />
            {/* Tooltip card */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                ...step.cardStyle,
                zIndex: 202,
                background: "#fff", borderRadius: 14, padding: "20px 22px",
                maxWidth: 340, width: "calc(100% - 48px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                animation: "tourFadeIn 0.3s ease forwards",
              }}
            >
              {step.content ? step.content : (
                <p style={{ fontSize: 14, color: "rgba(0,3,50,0.65)", fontWeight: 300, lineHeight: 1.65 }}>
                  {step.text}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <span style={{ fontSize: 11, color: "rgba(0,3,50,0.3)" }}>{tourStep + 1} of 4</span>
                <button onClick={nextTourStep} style={{
                  padding: "10px 24px", borderRadius: 100, border: "none",
                  background: isLast ? "#FF9090" : "rgba(0,3,50,0.06)",
                  color: "#000332", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  {isLast ? "Got it, let\u2019s go" : "Next"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes cSpin { to { transform:rotate(360deg); } }
        .cn:hover .cn-del { opacity: 1 !important; }
        .cn:hover .cn-edit { opacity: 0.5 !important; }
        .cn-edit:hover { opacity: 1 !important; }
        .act-tip-wrap:hover .act-tip { opacity: 1 !important; }
        .sug-dot-wrap:hover .sug-dot { transform: scale(1.1); }
        .sug-dot-wrap:hover .sug-dot span { opacity: 1 !important; }
        .sug-dot-wrap:hover .sug-tip { opacity: 1 !important; }
        @keyframes sugPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }
        @keyframes arrowDraw { to { stroke-dashoffset: 0; } }
        @keyframes rfPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); } 50% { box-shadow: 0 0 0 6px rgba(255,144,144,0.15); } }
        @keyframes noteIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
        @keyframes coachIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes q4Glow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0), 0 1px 3px rgba(0,3,50,0.03); } 50% { box-shadow: 0 0 0 8px rgba(255,144,144,0.12), 0 1px 3px rgba(0,3,50,0.03); } }
        @keyframes tourFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes dimNudge { 0%,100% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); } 50% { box-shadow: 0 0 0 6px rgba(255,144,144,0.25), 0 2px 8px rgba(0,0,0,0.1); } }
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
