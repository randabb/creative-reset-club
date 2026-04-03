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
  clarity: ["YOUR SITUATION", "THE REAL ISSUE"],
  expansion: ["YOUR SEED", "THE SURPRISING ANGLE"],
  decision: ["THE REAL CHOICE", "WHAT'S AT STAKE"],
  expression: ["WHAT YOU'RE SAYING", "THE TENSION"],
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

const RAW_PLACEHOLDERS = ["just dump it...", "don't edit yourself...", "say it ugly first...", "what's the gut reaction...", "think out loud...", "no one's grading this...", "messy is the point..."];
const rawPh = () => RAW_PLACEHOLDERS[Math.floor(Math.random() * RAW_PLACEHOLDERS.length)];
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

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
          y: 220,
          text: dim.label,
          source: "dimension",
          dimIndex: i,
          dimLabel: dim.label,
          dimDesc: dim.description,
        });
        dimIds.push(dimId);
      });
      // Guided thinking answers are now shown in the Discoveries card, not as canvas notes
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
  const [synthRevealed, setSynthRevealed] = useState(false);
  const [synthLoading, setSynthLoading] = useState(false);
  const [q4Pulsing, setQ4Pulsing] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const tourCheckedRef = useRef(false);
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
    message?: string;
  }>({ type: "landing" });
  const [exampleNoteId, setExampleNoteId] = useState<string | null>(null);
  const [exampleText, setExampleText] = useState("");
  const [exampleLoading, setExampleLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [discoveries, setDiscoveries] = useState<{ id: string; text: string; dimLabel: string; discipline?: string; createdAt: string }[]>([]);
  const [patterns, setPatterns] = useState<{ type: string; label: string; description: string; suggestion: string; suggestedAction?: string; noteId?: string; detected_at: string }[]>([]);
  const [discOpen, setDiscOpen] = useState(true);
  const [origThoughtsOpen, setOrigThoughtsOpen] = useState(false);
  const [dimSuggestions, setDimSuggestions] = useState<Record<string, { action: Action; question: string }>>({});
  const [activeDimQuestion, setActiveDimQuestion] = useState<string | null>(null);
  const [activeDimAction, setActiveDimAction] = useState<Action | null>(null);
  const [dimQuestionAnswer, setDimQuestionAnswer] = useState("");
  const [dimQAs, setDimQAs] = useState<Record<string, { question: string; answer: string; action: string }[]>>({});
  const [dimLoading, setDimLoading] = useState(false);
  const [goalExpanded, setGoalExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(sp.get("session_id"));
  const sessionIdRef = useRef<string | null>(sp.get("session_id"));
  const sessionCreatedRef = useRef(!!sp.get("session_id"));
  const loadedExistingRef = useRef(false);
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
          if (data.canvas_state?.patterns?.length) {
            setPatterns(data.canvas_state.patterns);
          }
          if (data.canvas_state?.dimStatus) {
            setDimStatus(data.canvas_state.dimStatus);
          }
          if (data.canvas_state?.dimQAs) {
            setDimQAs(data.canvas_state.dimQAs);
          }
          if (data.synthesis) setSynthesis(data.synthesis);
          loadedExistingRef.current = true;
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
              canvas_state: { notes, connections, discoveries, patterns, dimStatus, dimQAs },
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
          canvas_state: { notes, connections, discoveries, patterns, dimStatus, dimQAs },
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
  }, [notes, connections, synthesis, discoveries, patterns, dimStatus, dimQAs]);

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

  // Initialize dimension tracking, landing status, and fetch dimension suggestions
  useEffect(() => {
    if (!canvasReady || dimensions.length === 0) return;

    // If loading existing session, determine status from saved data
    if (loadedExistingRef.current) {
      const completedCount = Object.values(dimStatus).filter(s => s === "complete").length;
      if (completedCount >= dimensions.length) {
        setAllDimsComplete(true);
        setStatusState({ type: "all_done", message: "You worked through all of it. See what you found?" });
      } else {
        const nextDim = dimensions.find(d => dimStatus[d.label] !== "complete");
        setStatusState({ type: "keep_going", dimName: nextDim?.label, message: pick(["Pick up where you left off.", "Welcome back. Keep going.", `Continue with ${nextDim?.label || "your thinking"}.`]) });
      }
      return;
    }

    // New session — initialize everything
    const initial: Record<string, "unexplored" | "in_progress" | "complete"> = {};
    dimensions.forEach(d => { initial[d.label] = "unexplored"; });
    setDimStatus(initial);
    setStatusState({ type: "landing", dimName: dimensions[0]?.label, message: pick(["Let\u2019s start here. Say whatever\u2019s in your head.", "First things first. Don\u2019t think, just write.", `Let\u2019s start with ${dimensions[0]?.label}. Say what comes to mind.`]) });

    // Fetch AI suggestions for each dimension
    fetch("/api/suggest-dimension-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: capture, dimensions, qas }),
    }).then(r => r.json()).then(data => {
      if (data.suggestions?.length) {
        const map: Record<string, { action: Action; question: string }> = {};
        data.suggestions.forEach((s: { dimension: string; action: string; question: string }) => {
          map[s.dimension] = { action: s.action as Action, question: s.question };
        });
        setDimSuggestions(map);
        // Auto-open first dimension
        if (dimensions[0]) setActiveDimQuestion(dimensions[0].label);
      }
    }).catch(() => { /* silent */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady]);


  // Periodic autosave every 30s if dirty
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && sessionId) saveCanvas();
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionId, saveCanvas]);

  // First-time tour check — slight delay to ensure canvas is rendered
  // Tour: check Supabase for canvas_tour_completed
  useEffect(() => {
    if (tourCheckedRef.current || !canvasReady || !userId) return;
    tourCheckedRef.current = true;
    supabase.from("profiles").select("canvas_tour_completed").eq("id", userId).maybeSingle()
      .then(({ data }) => {
        if (!data?.canvas_tour_completed) setShowTour(true);
      });
  }, [canvasReady, userId]);

  const dismissTour = () => {
    setShowTour(false);
    if (userId) {
      supabase.from("profiles").update({ canvas_tour_completed: true }).eq("id", userId).then(() => {});
    }
  };


  // Note analysis: suggest actions for notes
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
    if (justFinishedEditRef.current) return;
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
      const raw = data.instruction || { title: "Your thinking", text: "Write what comes to mind.", discipline: "strategic" };
      const title = (raw.title || "Response").replace(/[`*_]/g, "").slice(0, 40);
      const text = (raw.text || "").replace(/[`*_]/g, "");
      const disc = (["design","systems","strategic","critical","creative"].includes(raw.discipline) ? raw.discipline : "strategic") as Note["discipline"];

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
      setStatusState({ type: "working", dimName: dim.label, message: pick(["Say whatever\u2019s in your head.", "Don\u2019t overthink it. Just write.", "Messy is fine. Go."]) });
    } catch { /* handled by API fallback */ }
    setAiLoading(false);
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
    let md = `Here's my thinking on "${capture}". I used Primer to work through this. Help me take the next step:\n\n`;
    if (dimensions.length) {
      md += `## Dimensions I explored\n${dimensions.map(d => `- ${d.label}: ${d.description}`).join("\n")}\n\n`;
    }
    if (discoveries.length) {
      md += `## Key insights\n${discoveries.map(d => `- ${d.text}`).join("\n")}\n\n`;
    }
    if (synthesis?.sections) {
      md += `## ${synthesis.deliverable_label}\n\n${synthesis.sections.map(s => `### ${s.heading}\n${s.content}`).join("\n\n")}\n\n`;
    }
    md += `## Raw thinking notes\n${notes.filter(n => n.source !== "dimension" && n.source !== "goal").map(n => `- ${n.text}`).join("\n")}`;
    navigator.clipboard.writeText(md);
    setToast("✓ Copied to clipboard");
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

    const dim = findNoteDim(instNote);

    setConnections(cs => [...cs, {
      id: uid(), from: instId, to: respId, label: "", color: "rgba(0,3,50,0.1)",
    }]);
    setResponseText("");
    setRespCardPos(null);
    setResponseFlow(null);

    // Auto-scroll to keep response visible
    setTimeout(() => {
      if (vpRef.current) vpRef.current.scrollTo({ top: respNote.y - 100, behavior: "smooth" });
    }, 100);

    // Re-analyze notes (force bypass debounce)

    // Generate discovery line
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

    // Pattern detection (after 3+ total user notes, max 4 patterns)
    const userNotes = [...notes.filter(n => n.source === "user"), respNote];
    if (userNotes.length >= 3 && patterns.length < 4) {
      console.log("[canvas] Calling pattern detection...", { totalNotes: userNotes.length });
      const allAnswers: Record<string, string[]> = {};
      userNotes.forEach(n => {
        const d = findNoteDim(n);
        if (!allAnswers[d.label]) allAnswers[d.label] = [];
        allAnswers[d.label].push(n.text);
      });

      fetch("/api/detect-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: capture,
          allAnswers,
          dimensions: dimensions.map(d => d.label).join(", "),
          existingPatterns: patterns,
        }),
      }).then(r => r.json()).then(data => {
        console.log("[canvas] Pattern detection:", data);
        if (data.pattern) {
          const patternWithNote = { ...data.pattern, noteId: respId };
          setPatterns(prev => [...prev, patternWithNote]);
          // Glow the suggested action on the note that triggered the pattern
        }
      }).catch(err => { console.error("[canvas] Pattern detection error:", err); });
    }

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
          setStatusState({ type: "all_done", message: "You worked through all of it. See what you found?" });
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
            setStatusState({ type: "keep_going", dimName: dim.label, nextAction: recAction, actionColor: ACT[recAction].color, message: pick(["There\u2019s something here. Keep pulling on it.", "Go deeper on that.", "Stay with this one."]) });
          }
        } catch {
          setStatusState({ type: "keep_going", dimName: dim.label, message: pick(["There\u2019s something here. Keep pulling on it.", "Go deeper on that.", "Stay with this one.", "You\u2019re onto something."]) });
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
              if (data.deliverable_label || data.sections) {
                setSynthesis(data);
                setSynthRevealed(false);
                setTimeout(() => setSynthRevealed(true), 100);
              }
            } catch { /* use without synthesis */ }
            setSynthLoading(false);
          }} style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: "#FF9090", fontSize: 12, fontWeight: 700, color: "#000332", cursor: "pointer", fontFamily: "inherit", animation: allDimsComplete ? "synthGlow 2s ease-in-out infinite" : undefined, transition: "box-shadow 0.3s" }}>See what you found →</button>
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
                <p style={{
                  fontSize: 18, fontWeight: 700, fontStyle: "italic", color: "#000332",
                  opacity: synthRevealed ? 1 : 0,
                  transition: "opacity 0.4s ease 0.1s",
                }}>{synthesis.deliverable_label}</p>
                <button onClick={() => setSynthEditing(!synthEditing)} style={{ background: "none", border: "none", fontSize: 11, color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 2, flexShrink: 0, marginLeft: 8 }}>
                  {synthEditing ? "Done" : "Edit"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {synthesis.sections.map((sec, i) => (
                  <div key={i} style={{
                    borderLeft: `3px solid ${(ACT as Record<string, {color:string}>)[mode]?.color || "#FF9090"}`, paddingLeft: 12,
                    opacity: synthRevealed ? 1 : 0,
                    transform: synthRevealed ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 0.4s ease ${0.3 + i * 0.4}s, transform 0.4s ease ${0.3 + i * 0.4}s`,
                  }}>
                    {synthEditing ? (
                      <>
                        <input value={sec.heading} onChange={e => { const ns = { ...synthesis, sections: synthesis.sections.map((s, j) => j === i ? { ...s, heading: e.target.value } : s) }; setSynthesis(ns); }} style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 700, color: "#000332", fontFamily: "inherit", marginBottom: 4 }} />
                        <textarea value={sec.content} onChange={e => { const ns = { ...synthesis, sections: synthesis.sections.map((s, j) => j === i ? { ...s, content: e.target.value } : s) }; setSynthesis(ns); }} style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: "#000332", lineHeight: 1.6, fontWeight: 400, fontFamily: "inherit", resize: "none", minHeight: 40 }} />
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#000332", marginBottom: 4 }}>{i === 0 ? sec.heading : sec.heading}</p>
                        <p style={{ fontSize: 14, color: "#000332", lineHeight: 1.6, fontWeight: i === 0 ? 500 : 400 }}>{sec.content}</p>
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
          {synthesis && !synthLoading && patterns.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(0,3,50,0.06)", marginTop: 14, paddingTop: 12, marginBottom: 14, opacity: 0, animation: "synthExportFadeIn 0.3s ease 0.3s forwards" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#000332", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>WORTH REVISITING</div>
              {patterns.map((p, i) => (
                <div key={i} style={{ borderLeft: "3px dashed #000332", paddingLeft: 10, marginBottom: 8 }}>
                  <p style={{ fontSize: 12, color: "#000332", lineHeight: 1.5 }}>
                    <strong>{p.label}:</strong> {p.suggestion}
                  </p>
                </div>
              ))}
            </div>
          )}
          {synthesis && !synthLoading && (
            <div style={{ opacity: 0, animation: "synthExportFadeIn 0.3s ease 0.5s forwards" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#000332", marginBottom: 14 }}>Take it with you</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={saveToStudio} style={{ padding: "12px", borderRadius: 10, border: "none", background: "#FF9090", color: "#000332", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save to Studio</button>
                <button onClick={copyPrompt} style={{ padding: "12px", borderRadius: 10, border: "none", background: "#000332", color: "#FAF7F0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Copy as AI prompt</button>
                <button onClick={downloadMd} style={{ padding: "12px", borderRadius: 10, border: "1px solid rgba(0,3,50,0.1)", background: "transparent", color: "#000332", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Download as text</button>
              </div>
            </div>
          )}
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
            <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 16px 12px" }}>
              {/* Your original thoughts */}
              {qas.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => setOrigThoughtsOpen(!origThoughtsOpen)}
                    style={{ background: "none", border: "none", fontSize: 11, fontWeight: 600, color: "rgba(0,3,50,0.4)", cursor: "pointer", fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    Your original thoughts <span style={{ fontSize: 10 }}>{origThoughtsOpen ? "▾" : "▸"}</span>
                  </button>
                  {origThoughtsOpen && (
                    <div style={{ marginTop: 6 }}>
                      {qas.map((qa, i) => {
                        const label = THINKING_LABELS[mode]?.[i] || `Answer ${i + 1}`;
                        return (
                          <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < qas.length - 1 ? "1px solid rgba(0,3,50,0.04)" : "none" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,3,50,0.35)", marginBottom: 2 }}>{label}</div>
                            <p style={{ fontSize: 12, color: "#000332", lineHeight: 1.5, fontWeight: 300 }}>{qa.answer}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {/* Discoveries */}
              {/* Progress dots */}
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {dimensions.map((d, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: dimStatus[d.label] === "complete" ? "#FF9090" : "rgba(0,3,50,0.1)",
                    transition: "background 0.3s",
                    animation: dimStatus[d.label] === "complete" ? "dotPop 0.3s ease-out" : undefined,
                  }} />
                ))}
              </div>
              {discoveries.length === 0 && patterns.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(0,3,50,0.35)", fontStyle: "italic", lineHeight: 1.55 }}>
                  Your discoveries will appear here as you work through each dimension.
                </p>
              ) : (
                <>
                  {/* Patterns first */}
                  {patterns.length > 0 && console.log("[canvas] Rendering patterns:", patterns.length)}
                  {patterns.map((p, i) => (
                    <div key={`pat-${i}`} style={{
                      borderLeft: "3px dashed #000332", paddingLeft: 10, marginBottom: 8,
                      background: "rgba(0,3,50,0.04)", borderRadius: "0 6px 6px 0", padding: "8px 10px 8px 12px",
                      animation: "noteIn 0.3s ease-out forwards",
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(0,3,50,0.35)", fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>PATTERN</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#000332", marginBottom: 2 }}>{p.label}</div>
                      <p style={{ fontSize: 12, color: "rgba(0,3,50,0.6)", lineHeight: 1.45, marginBottom: 3 }}>{p.description}</p>
                      <p style={{ fontSize: 11, color: "rgba(0,3,50,0.4)", fontStyle: "italic" }}>{p.suggestion}</p>
                    </div>
                  ))}
                  {/* Divider between patterns and insights */}
                  {patterns.length > 0 && discoveries.length > 0 && (
                    <div style={{ height: 1, background: "rgba(0,3,50,0.06)", margin: "6px 0 10px" }} />
                  )}
                  {/* Insights */}
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
                      All dimensions explored. Hit See what you found → for your full brief.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
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
                animation: dimStatus[d.label] === "complete" ? "dotPop 0.3s ease-out" : undefined,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 13, color: "#000332", lineHeight: 1.55, fontWeight: 300 }}>
            {statusState.type === "loading" && (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "cSpin 0.7s linear infinite", flexShrink: 0 }} />
                Thinking...
              </span>
            )}
            {statusState.type !== "loading" && statusState.message && (
              <span>{statusState.message}{statusState.type === "ready_to_move" && statusState.nextDimName && <> <strong style={{ color: "#FF9090" }}>{statusState.nextDimName}</strong>.</>}</span>
            )}
            {statusState.type !== "loading" && !statusState.message && (
              <span>Write whatever comes to mind.</span>
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
      <div ref={vpRef} style={{ height: "calc(100vh - 44px)", overflowY: "auto", overflowX: "hidden", cursor: dragId ? "grabbing" : connecting ? "crosshair" : "default", position: "relative", marginTop: 44, scrollBehavior: "smooth" }}>
        <div
          ref={canvasRef}
          onMouseDown={(e) => { const t = e.target as HTMLElement; if (t.closest(".cn")) return; if (editId) finishEdit(editId); }}
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

          {/* FIRST DRAFTS NUDGE */}
          <div style={{ position: "absolute", left: 60, top: 192, fontSize: 11, color: "rgba(0,3,50,0.25)", fontFamily: "'DM Mono', monospace", pointerEvents: "none" }}>
            first drafts only.
          </div>

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
              return (<div key={n.id} style={{ display: "contents" }}>
                <div
                  className="cn"
                  style={{
                    position: "absolute", left: n.x, top: n.y,
                    width: 220, padding: "14px 16px",
                    borderRadius: 10,
                    background: "#000332",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 10,
                    cursor: "default",
                    animation: nudgeDimIdx === (n.dimIndex ?? 0) ? "dimNudge 0.6s ease-in-out 2" : activeDimQuestion === n.dimLabel ? "dimGlow 1s ease-in-out 1" : undefined,
                    transition: "background 0.4s, box-shadow 0.4s",
                    ...(dimStatus[n.dimLabel || ""] === "complete" ? { background: "#0a0a40" } : {}),
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>DIMENSION {(n.dimIndex ?? 0) + 1}</span>
                    {dimStatus[n.dimLabel || ""] === "complete" && <span style={{ color: "#7ED6A8", fontSize: 12, opacity: 0, animation: "slideIn 0.3s ease-out 0.1s forwards" }}>✓</span>}
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
                  {/* Suggested action badge */}
                  {dimSuggestions[n.dimLabel || ""] && activeDimQuestion !== n.dimLabel && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveDimQuestion(n.dimLabel || ""); }}
                      style={{
                        marginTop: 8, padding: "4px 10px", borderRadius: 100,
                        border: "none", background: `${ACT[dimSuggestions[n.dimLabel || ""].action].color}30`,
                        color: ACT[dimSuggestions[n.dimLabel || ""].action].color,
                        fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      {ACT[dimSuggestions[n.dimLabel || ""].action].icon} {ACT[dimSuggestions[n.dimLabel || ""].action].label}
                    </button>
                  )}
                </div>
                {/* First question below dimension */}
                {activeDimQuestion === n.dimLabel && dimLoading && (
                  <div style={{ position: "absolute", left: n.x + 80, top: n.y + 150, zIndex: 10 }}>
                    <div style={{ width: 16, height: 16, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "cSpin 0.7s linear infinite" }} />
                  </div>
                )}
                {activeDimQuestion === n.dimLabel && dimSuggestions[n.dimLabel || ""] && !dimLoading && (() => {
                  // Find the lowest note in this dimension's column
                  const colNotes = notes.filter(cn => cn.id !== n.id && cn.source !== "dimension" && cn.source !== "goal" && Math.abs(cn.x - n.x) < 130);
                  let questionY = n.y + 140; // default: below dimension header
                  if (colNotes.length > 0) {
                    const lowestNote = colNotes.reduce((a, b) => (a.y + charOffset(a.text)) > (b.y + charOffset(b.text)) ? a : b);
                    questionY = lowestNote.y + charOffset(lowestNote.text);
                  }
                  return (
                  <div key={`q-${n.id}-${dimSuggestions[n.dimLabel || ""].question.slice(0,20)}`} style={{
                    position: "absolute", left: n.x, top: questionY,
                    width: 220, zIndex: 10,
                    animation: "slideIn 0.3s ease-out forwards",
                  }}>
                    <div style={{
                      background: "#fff", borderRadius: 10, padding: "12px 14px",
                      border: `1.5px solid ${ACT[dimSuggestions[n.dimLabel || ""].action].color}30`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: ACT[dimSuggestions[n.dimLabel || ""].action].color, marginBottom: 4 }}>
                        {ACT[dimSuggestions[n.dimLabel || ""].action].icon} {ACT[dimSuggestions[n.dimLabel || ""].action].label.toUpperCase()}
                      </div>
                      <p style={{ fontSize: 13, color: "#000332", lineHeight: 1.5, fontStyle: "italic", fontFamily: "'Codec Pro',sans-serif", opacity: 0.75, marginBottom: 8 }}>
                        {dimSuggestions[n.dimLabel || ""].question}
                      </p>
                      <textarea
                        value={dimQuestionAnswer}
                        onChange={e => setDimQuestionAnswer(e.target.value)}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={rawPh()}
                        style={{
                          width: "100%", minHeight: 50, border: "none", outline: "none",
                          resize: "none", background: "rgba(0,3,50,0.02)", borderRadius: 6,
                          padding: 8, fontFamily: "'Codec Pro',sans-serif", fontSize: 13,
                          lineHeight: 1.55, color: "#000332",
                        }}
                      />
                      {dimQuestionAnswer.trim().length > 0 && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const dimLabel = n.dimLabel || "";
                            const currentQ = dimSuggestions[dimLabel]?.question || "";
                            const currentAction = activeDimAction || dimSuggestions[dimLabel]?.action || "clarify";
                            const answerText = dimQuestionAnswer.trim();

                            // Create user note on canvas — below the last note in this column
                            const noteId = uid();
                            const colNotes = notes.filter(cn => cn.id !== n.id && cn.source !== "dimension" && cn.source !== "goal" && Math.abs(cn.x - n.x) < 130);
                            const lastNoteY = colNotes.length > 0 ? Math.max(...colNotes.map(cn => cn.y + charOffset(cn.text))) : n.y + 160;
                            setNotes(ns => [...ns, { id: noteId, x: n.x + 5, y: lastNoteY, text: answerText, source: "user" }]);
                            setDimQuestionAnswer("");
                            setDimStatus(prev => ({ ...prev, [dimLabel]: "in_progress" }));

                            // Auto-scroll to keep latest card visible
                            setTimeout(() => {
                              if (vpRef.current) vpRef.current.scrollTo({ top: lastNoteY - 100, behavior: "smooth" });
                            }, 100);

                            // Track Q&A for this dimension
                            const newQA = { question: currentQ, answer: answerText, action: currentAction };
                            const updatedQAs = [...(dimQAs[dimLabel] || []), newQA];
                            setDimQAs(prev => ({ ...prev, [dimLabel]: updatedQAs }));

                            // Update status bar
                            setStatusState({ type: "loading" });
                            setDimLoading(true);

                            // Get followup
                            try {
                              const res = await fetch("/api/dimension-followup", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  goal: capture,
                                  dimension: `${dimLabel} — ${n.dimDesc || ""}`,
                                  dimensionQAs: updatedQAs,
                                  allDimensions: dimensions.map(d => d.label).join(", "),
                                  previousActions: updatedQAs.map(q => q.action).join(", "),
                                }),
                              });
                              const data = await res.json();

                              // Add discovery if present
                              if (data.discovery) {
                                setDiscoveries(prev => [...prev, { id: uid(), text: data.discovery, dimLabel, discipline: undefined, createdAt: new Date().toISOString() }]);
                              }

                              if (data.status === "complete") {
                                setDimStatus(prev => ({ ...prev, [dimLabel]: "complete" }));
                                setActiveDimQuestion(null);
                                setActiveDimAction(null);
                                // Find next unexplored dimension
                                const nextDim = dimensions.find(d => d.label !== dimLabel && dimStatus[d.label] !== "complete");
                                if (nextDim) {
                                  setNudgeDimIdx(dimensions.indexOf(nextDim));
                                  setTimeout(() => setNudgeDimIdx(null), 8000);
                                  setStatusState({ type: "ready_to_move", dimName: dimLabel, nextDimName: nextDim.label, message: pick(["Good. Let\u2019s look at", "Done with that one. On to", "Next up:"]) });
                                  // Auto-open next dimension after brief pause
                                  setTimeout(() => {
                                    setActiveDimQuestion(nextDim.label);
                                    setActiveDimAction(null);
                                    if (vpRef.current) vpRef.current.scrollTo({ top: 0, behavior: "smooth" });
                                  }, 2000);
                                } else {
                                  setAllDimsComplete(true);
                                  setStatusState({ type: "all_done", message: "You worked through all of it. See what you found?" });
                                }
                              } else if (data.question) {
                                // Continue with next question in this dimension
                                setDimSuggestions(prev => ({ ...prev, [dimLabel]: { action: data.action as Action, question: data.question } }));
                                setActiveDimAction(data.action as Action);
                                setStatusState({ type: "keep_going", dimName: dimLabel, message: pick(["There\u2019s something here. Keep pulling on it.", "Go deeper on that.", "Stay with this one.", "You\u2019re onto something."]) });
                              }
                            } catch {
                              setStatusState({ type: "keep_going", dimName: dimLabel, message: pick(["There\u2019s something here. Keep pulling on it.", "Go deeper on that.", "Stay with this one.", "You\u2019re onto something."]) });
                            }
                            setDimLoading(false);

                            // Pattern detection from dimension question
                            const allUserNotes = [...notes.filter(nn => nn.source === "user"), { id: noteId, text: answerText, x: n.x + 5, y: lastNoteY, source: "user" as const }];
                            if (allUserNotes.length >= 3 && patterns.length < 4) {
                              console.log("[canvas-dim] Calling pattern detection...", { totalNotes: allUserNotes.length });
                              const patAnswers: Record<string, string[]> = {};
                              allUserNotes.forEach(nn => {
                                const dd = findNoteDim(nn as Note);
                                if (!patAnswers[dd.label]) patAnswers[dd.label] = [];
                                patAnswers[dd.label].push(nn.text);
                              });
                              fetch("/api/detect-patterns", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ goal: capture, allAnswers: patAnswers, dimensions: dimensions.map(d => d.label).join(", "), existingPatterns: patterns }),
                              }).then(r => r.json()).then(patData => {
                                console.log("[canvas-dim] Pattern result:", patData);
                                if (patData.pattern) {
                                  setPatterns(prev => [...prev, { ...patData.pattern, noteId }]);
                                }
                              }).catch(err => console.error("[canvas-dim] Pattern error:", err));
                            }

                            scheduleSave();
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          className="done-btn"
                          style={{
                            marginTop: 6, padding: "6px 16px", borderRadius: 100, border: "none",
                            background: "#FF9090", color: "#000332", fontSize: 12, fontWeight: 700,
                            cursor: "pointer", fontFamily: "inherit", transition: "transform 0.1s",
                          }}
                        >Done</button>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>);
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
                  cursor: connecting ? "crosshair" : dragId === n.id ? "grabbing" : editId === n.id ? "default" : "grab",
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
                  </div>
                )}
                {sl && !isAi && (
                  <div
                    onMouseDown={e => startDrag(n.id, e)}
                    style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: sl.color, marginBottom: 4, opacity: 0.7, cursor: "grab", userSelect: "none" }}
                  >
                    {sl.text}
                  </div>
                )}
                {isAi && (
                  <div
                    onMouseDown={e => startDrag(n.id, e)}
                    style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: n.action ? ACT[n.action].color : "#FF9090", marginBottom: 4, cursor: "grab", userSelect: "none" }}
                  >{n.action ? `${ACT[n.action].icon} ${ACT[n.action].label.toUpperCase()}` : "YOUR TURN"}</div>
                )}
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
                      style={{ width: "100%", minHeight: 30, border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 13, lineHeight: 1.55, color: "#000332", overflow: "hidden" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                      <button
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); finishEdit(n.id); }}
                        className="done-btn"
                        style={{
                          padding: "4px 12px", borderRadius: 6, border: "none",
                          background: "#FF9090", color: "#fff", fontSize: 11,
                          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          transition: "transform 0.1s",
                        }}
                      >Done</button>
                    </div>
                  </>
                ) : (
                  <div style={{
                    fontSize: 13, lineHeight: 1.55, color: "#000332",
                    fontFamily: "'Codec Pro',sans-serif",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    ...(isAi && n.action ? { borderLeft: `3px solid ${ACT[n.action].color}`, paddingLeft: 10, fontStyle: "italic" } : {}),
                    ...(n.source === "goal" && !goalExpanded ? { maxHeight: 80, overflow: "hidden" } : {}),
                  }}>
                    {isAi && n.text ? (
                      n.text
                    ) : (
                      n.text || <span style={{ color: "rgba(0,3,50,0.25)" }}>Double-click to edit</span>
                    )}
                  </div>
                )}
                {n.source === "goal" && n.text.length > 120 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setGoalExpanded(!goalExpanded); }}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ background: "none", border: "none", fontSize: 11, color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "inherit", padding: 0, marginTop: 4 }}
                  >{goalExpanded ? "show less" : "show more..."}</button>
                )}
                {/* Action icons on user notes */}
                {n.source === "user" && editId !== n.id && (
                  <div className="note-actions" style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
                    {(Object.keys(ACT) as Action[]).map(a => {
                      const patternGlow = patterns.some(p => p.noteId === n.id && p.suggestedAction === a);
                      return (
                        <div key={a} className="act-tip-wrap" style={{ position: "relative" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Clear pattern glow for this note
                              if (patternGlow) setPatterns(prev => prev.map(p => p.noteId === n.id ? { ...p, noteId: undefined } : p));
                              setSelected(new Set([n.id]));
                              setTimeout(() => runAction(a), 100);
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                              background: "none", border: "none", padding: 2,
                              fontSize: 15, color: ACT[a].color, cursor: "pointer",
                              opacity: patternGlow ? 1 : 0.4,
                              transition: "opacity 0.2s, transform 0.2s",
                              animation: patternGlow ? `actGlow${a} 1s ease-in-out infinite` : undefined,
                            }}
                          >{ACT[a].icon}</button>
                          <div className="act-tip" style={{
                            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                            marginBottom: 4, background: "#000332", color: "#FAF7F0", fontSize: 10,
                            padding: "4px 8px", borderRadius: 4, whiteSpace: "nowrap",
                            pointerEvents: "none", zIndex: 100, opacity: 0, transition: "opacity 0.15s",
                          }}>{ACT[a].label}</div>
                        </div>
                      );
                    })}
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
                  placeholder={rawPh()}
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
                    className="done-btn"
                    style={{
                      padding: "6px 16px", borderRadius: 100, border: "none",
                      background: responseText.trim() ? mColor : "rgba(0,3,50,0.06)",
                      color: responseText.trim() ? "#000332" : "rgba(0,3,50,0.25)",
                      fontSize: 12, fontWeight: 700, cursor: responseText.trim() ? "pointer" : "default",
                      fontFamily: "inherit", transition: "transform 0.1s",
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

      {/* SIMPLE TOUR OVERLAY */}
      {showTour && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,3,50,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "tourFadeIn 0.3s ease forwards",
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "32px 32px",
            maxWidth: 400, width: "calc(100% - 48px)", textAlign: "center",
          }}>
            <p style={{ fontSize: 15, color: "#000332", lineHeight: 1.6, fontWeight: 400, marginBottom: 24 }}>
              Your thinking dimensions are above. Start with the first one — just write what comes to mind.
            </p>
            <button onClick={dismissTour} style={{
              padding: "12px 32px", borderRadius: 100, border: "none",
              background: "#FF9090", color: "#000332", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>Got it</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cSpin { to { transform:rotate(360deg); } }
        .cn:hover .cn-del { opacity: 1 !important; }
        .cn:hover .cn-edit { opacity: 0.5 !important; }
        .note-actions button:hover { opacity: 1 !important; transform: scale(1.15); }
        @keyframes actGlowclarify { 0%,100% { opacity:0.5; } 50% { opacity:1; text-shadow: 0 0 6px rgba(107,138,254,0.4); } }
        @keyframes actGlowexpand { 0%,100% { opacity:0.5; } 50% { opacity:1; text-shadow: 0 0 6px rgba(255,144,144,0.4); } }
        @keyframes actGlowdecide { 0%,100% { opacity:0.5; } 50% { opacity:1; text-shadow: 0 0 6px rgba(126,214,168,0.4); } }
        @keyframes actGlowexpress { 0%,100% { opacity:0.5; } 50% { opacity:1; text-shadow: 0 0 6px rgba(196,166,255,0.4); } }
        .cn-edit:hover { opacity: 1 !important; }
        .act-tip-wrap:hover .act-tip { opacity: 1 !important; }
        @keyframes sugPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }
        @keyframes arrowDraw { to { stroke-dashoffset: 0; } }
        @keyframes rfPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); } 50% { box-shadow: 0 0 0 6px rgba(255,144,144,0.15); } }
        @keyframes noteIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dotPop { 0% { transform:scale(0); } 70% { transform:scale(1.1); } 100% { transform:scale(1); } }
        @keyframes dimGlow { 0% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); } 50% { box-shadow: 0 0 12px rgba(255,144,144,0.2), 0 2px 8px rgba(0,0,0,0.1); } 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); } }
        @keyframes synthGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); } 50% { box-shadow: 0 0 8px rgba(255,144,144,0.25); } }
        .done-btn:active { transform: scale(0.97); }
        @keyframes coachIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes q4Glow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0), 0 1px 3px rgba(0,3,50,0.03); } 50% { box-shadow: 0 0 0 8px rgba(255,144,144,0.12), 0 1px 3px rgba(0,3,50,0.03); } }
        @keyframes tourFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes dimNudge { 0%,100% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); } 50% { box-shadow: 0 0 0 6px rgba(255,144,144,0.25), 0 2px 8px rgba(0,0,0,0.1); } }
        @keyframes synthExportFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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
