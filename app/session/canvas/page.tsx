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
  const [responseFlow, setResponseFlow] = useState<ResponseFlow | null>(null);
  const [responseText, setResponseText] = useState("");
  const [respCardPos, setRespCardPos] = useState<{ x: number; y: number } | null>(null);
  const [respDragOff, setRespDragOff] = useState<{ x: number; y: number } | null>(null);
  const [synthesis, setSynthesis] = useState<{ deliverable_label: string; sections: { heading: string; content: string }[]; reflection?: string; deliverable?: string } | null>(null);
  const [synthEditing, setSynthEditing] = useState(false);
  const [synthLoading, setSynthLoading] = useState(false);
  const [coachDismissed, setCoachDismissed] = useState(false);
  const [q4Pulsing, setQ4Pulsing] = useState(false);
  const [tourWelcome, setTourWelcome] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourCheckedRef = useRef(false);
  const [noteSuggestions, setNoteSuggestions] = useState<Record<string, Action>>({});
  const [freshSuggestions, setFreshSuggestions] = useState<Set<string>>(new Set());
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalyzeRef = useRef(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(sp.get("session_id"));
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [userId, setUserId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const zoomRef = useRef(zoom);
  const dragIdRef = useRef<string | null>(null);
  const dragOffRef = useRef({ x: 0, y: 0 });
  const notesRef = useRef(notes);
  const respDragOffRef = useRef<{ x: number; y: number } | null>(null);
  const respCardPosRef = useRef<{ x: number; y: number } | null>(null);
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
          if (data.synthesis) setSynthesis(data.synthesis);
        } catch (err) {
          console.error("[canvas] Load error:", err);
        }
        setCanvasReady(true);
        return;
      }

      // No capture and no session_id — redirect
      if (!captureParam) { router.push("/session/new"); return; }

      // Create new session
      if (uid) {
        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: uid, goal: capture, mode, qas, dimensions,
              canvas_state: { notes, connections },
            }),
          });
          const data = await res.json();
          if (data.id) setSessionId(data.id);
        } catch { /* continue without session id */ }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: debounced, triggers on changes
  const saveCanvas = useCallback(async () => {
    if (!sessionId) return;
    setSaveStatus("saving");
    try {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          canvas_state: { notes, connections },
          synthesis: synthesis || undefined,
        }),
      });
      setSaveStatus("saved");
      dirtyRef.current = false;
    } catch {
      setSaveStatus("unsaved");
    }
  }, [sessionId, notes, connections, synthesis]);

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

  // Periodic autosave every 30s if dirty
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && sessionId) saveCanvas();
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionId, saveCanvas]);

  // First-time tour check
  useEffect(() => {
    if (tourCheckedRef.current || !canvasReady) return;
    tourCheckedRef.current = true;
    const toured = localStorage.getItem("primer_canvas_toured");
    if (!toured) {
      setTourWelcome(true);
      setCoachDismissed(true); // suppress coach card during/after tour
    }
  }, [canvasReady]);

  const startTour = () => { setTourWelcome(false); setTourStep(0); };
  const skipTour = () => {
    setTourWelcome(false); setTourStep(null);
    localStorage.setItem("primer_canvas_toured", "true");
    // Show coach card after 10s if no note selected
    setTimeout(() => {
      setCoachDismissed(false);
    }, 10000);
  };
  const nextTourStep = () => {
    if (tourStep !== null && tourStep < 3) {
      setTourStep(tourStep + 1);
    } else {
      setTourStep(null);
      localStorage.setItem("primer_canvas_toured", "true");
      setTimeout(() => {
        setCoachDismissed(false);
      }, 10000);
    }
  };

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

  // Note analysis: suggest actions for notes
  const analyzeNotes = useCallback(async () => {
    const now = Date.now();
    if (now - lastAnalyzeRef.current < 15000) return;
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

  // Keep refs in sync with state (so window-level listeners always have current values)
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { dragIdRef.current = dragId; }, [dragId]);
  useEffect(() => { dragOffRef.current = dragOff; }, [dragOff]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { respDragOffRef.current = respDragOff; }, [respDragOff]);
  useEffect(() => { respCardPosRef.current = respCardPos; }, [respCardPos]);

  // Pan + drag: window-level mousemove/mouseup so dragging works even when cursor leaves canvas
  const startPan = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".cn")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - panXRef.current, y: e.clientY - panYRef.current };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const s2cRef = (cx: number, cy: number) => {
      if (!vpRef.current) return { x: 0, y: 0 };
      const r = vpRef.current.getBoundingClientRect();
      return { x: (cx - r.left - panXRef.current) / zoomRef.current, y: (cy - r.top - panYRef.current) / zoomRef.current };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning.current) {
        const nx = e.clientX - panStart.current.x;
        const ny = e.clientY - panStart.current.y;
        panXRef.current = nx;
        panYRef.current = ny;
        setPanX(nx);
        setPanY(ny);
        return;
      }
      if (respDragOffRef.current) {
        const pt = s2cRef(e.clientX, e.clientY);
        const np = { x: pt.x - respDragOffRef.current.x, y: pt.y - respDragOffRef.current.y };
        respCardPosRef.current = np;
        setRespCardPos(np);
        return;
      }
      if (dragIdRef.current) {
        const pt = s2cRef(e.clientX, e.clientY);
        const off = dragOffRef.current;
        const did = dragIdRef.current;
        setNotes(ns => ns.map(n => n.id === did ? { ...n, x: pt.x - off.x, y: pt.y - off.y } : n));
      }
    };

    const handleMouseUp = () => {
      isPanning.current = false;
      setDragId(null);
      dragIdRef.current = null;
      setRespDragOff(null);
      respDragOffRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (editId === id || justFinishedEditRef.current) return;
    e.stopPropagation();
    const n = notes.find(n => n.id === id);
    if (!n || n.source === "dimension") return;
    if (connecting) {
      if (!connectFrom) { setConnectFrom(id); return; }
      if (connectFrom !== id) { setConnModal({ from: connectFrom, to: id }); setConnectFrom(null); }
      return;
    }
    const pt = s2c(e.clientX, e.clientY);
    const off = { x: pt.x - n.x, y: pt.y - n.y };
    setDragId(id);
    dragIdRef.current = id;
    setDragOff(off);
    dragOffRef.current = off;
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
    // Re-analyze after editing
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current = setTimeout(() => analyzeNotes(), 3000);
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
    // Clear suggestion dot for this note
    setNoteSuggestions(prev => { const n = { ...prev }; delete n[selId]; return n; });
    // Dismiss coach card immediately
    if (showCoach) dismissCoach();
    // Find which dimension this note belongs to (closest x position)
    const dimNotes = notes.filter(n => n.source === "dimension");
    let dimLabel = "";
    let dimDesc = "";
    if (dimNotes.length > 0) {
      let closestDim = dimNotes[0];
      let closestDist = Math.abs(selNote.x - dimNotes[0].x);
      dimNotes.forEach(d => {
        const dist = Math.abs(selNote.x - d.x);
        if (dist < closestDist) { closestDist = dist; closestDim = d; }
      });
      dimLabel = closestDim.dimLabel || "";
      dimDesc = closestDim.dimDesc || "";
    }

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
          dimensionLabel: dimLabel,
          dimensionDescription: dimDesc,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      const rawInstructions: ({ title: string; text: string } | string)[] = data.instructions || [];

      // Normalize and parse: handle {title,text}, plain strings, and unparsed "TITLE: x | INSTRUCTION: y" lines
      const instructions = rawInstructions.map((raw) => {
        const str = typeof raw === "string" ? raw : (raw.text || "");
        const titleRaw = typeof raw === "string" ? "" : (raw.title || "");
        // Try parsing "TITLE: x | INSTRUCTION: y" format from the text
        const pipeMatch = str.match(/^(?:TITLE:\s*)?(.+?)\s*\|\s*(?:INSTRUCTION:\s*)?(.+)$/i);
        if (pipeMatch) {
          return { title: pipeMatch[1].trim(), text: pipeMatch[2].trim() };
        }
        // If API already parsed title and text cleanly
        if (titleRaw && !str.includes(" | ")) {
          return { title: titleRaw, text: str };
        }
        // Fallback: first 4 words as title
        const words = str.split(/\s+/);
        return { title: words.slice(0, 4).join(" "), text: str };
      });

      // Place new notes in a HORIZONTAL ROW below the LOWEST point on the canvas
      const noteW = dimensions.length > 0 ? 190 : 200;
      const estimateH = (text: string) => {
        const len = text.length;
        if (len < 50) return 80;
        if (len < 100) return 100;
        if (len < 200) return 140;
        return 180;
      };

      // Find the lowest point across ALL existing notes
      let bottomY = 0;
      notes.forEach(n => {
        const h = estimateH(n.text);
        const bottom = n.y + h;
        if (bottom > bottomY) bottomY = bottom;
      });

      const startY = bottomY + 60;
      const newNotes: Note[] = instructions.map((inst, i) => ({
        id: uid(),
        x: 60 + i * 240,
        y: startY,
        text: inst.text,
        source: "ai" as const,
        action,
        aiInstruction: true,
        aiTitle: inst.title,
      }));

      const newConns: Connection[] = newNotes.map(n => ({
        id: uid(), from: selId, to: n.id, label: "", color: ACT[action].color,
      }));
      setNotes(ns => [...ns, ...newNotes]);
      setConnections(cs => [...cs, ...newConns]);

      // Auto-scroll to show new notes centered in viewport
      if (vpRef.current && newNotes.length > 0) {
        const vpRect = vpRef.current.getBoundingClientRect();
        const targetY = startY + 60;
        const newPanY = vpRect.height / 2 - targetY * zoom;
        setPanY(newPanY);
        panYRef.current = newPanY;
        const midX = newNotes[Math.floor(newNotes.length / 2)].x + noteW / 2;
        const newPanX = vpRect.width / 2 - midX * zoom;
        setPanX(newPanX);
        panXRef.current = newPanX;
      }

      // Start guided response flow
      setResponseFlow({
        instructionIds: newNotes.map(n => n.id),
        currentIdx: 0,
        sourceId: selId,
        action,
      });
      setResponseText("");
      setSelected(new Set());
    } catch {
      // handled by API fallback
    }
    setAiLoading(false);
    // Re-analyze after coaching completes
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current = setTimeout(() => analyzeNotes(), 3000);
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

  // Response flow: complete current instruction
  const completeResponse = () => {
    if (!responseFlow) return;
    const instId = responseFlow.instructionIds[responseFlow.currentIdx];
    const instNote = notes.find(n => n.id === instId);
    if (!instNote || !responseText.trim()) return;

    // Create response note below the instruction
    const respId = uid();
    const respNote: Note = {
      id: respId, x: instNote.x, y: instNote.y + 140,
      text: responseText.trim(), source: "user",
    };
    setNotes(ns => [...ns, respNote]);
    setConnections(cs => [...cs, {
      id: uid(), from: instId, to: respId, label: "", color: "rgba(0,3,50,0.1)",
    }]);
    setResponseText("");

    // Advance to next instruction
    const nextIdx = responseFlow.currentIdx + 1;
    setRespCardPos(null);
    if (nextIdx < responseFlow.instructionIds.length) {
      setResponseFlow({ ...responseFlow, currentIdx: nextIdx });
    } else {
      setResponseFlow(null);
      setToast("Nice. You've worked through all the branches. Select another note to keep going.");
      setTimeout(() => setToast(""), 3500);
      // Re-analyze after completing all responses
      if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
      analyzeTimerRef.current = setTimeout(() => analyzeNotes(), 3000);
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
      {/* TOOLBAR */}
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30,
        display: "flex", alignItems: "center", gap: 4,
        background: "#fff", borderRadius: 100, padding: "6px 12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        <button onClick={addNote} style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: "#000332", cursor: "pointer", fontFamily: "inherit" }}>+ Note</button>
        <button onClick={() => { setConnecting(!connecting); setConnectFrom(null); }} style={{ padding: "6px 14px", borderRadius: 100, border: "none", background: connecting ? "rgba(0,3,50,0.08)" : "transparent", fontSize: 12, fontWeight: 600, color: connecting ? "#FF9090" : "#000332", cursor: "pointer", fontFamily: "inherit" }}>Connect</button>
        <button onClick={() => saveCanvas()} title="Save" style={{ padding: "6px 10px", borderRadius: 100, border: "none", background: "transparent", fontSize: 12, color: saveStatus === "saved" ? "rgba(0,3,50,0.25)" : "#000332", cursor: "pointer", fontFamily: "inherit" }}>
          {saveStatus === "saving" ? "..." : saveStatus === "saved" ? "✓" : "💾"}
        </button>
        <div style={{ width: 1, height: 20, background: "rgba(0,3,50,0.1)", margin: "0 4px" }} />
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
                padding: "6px 10px", borderRadius: 100, border: "none", background: "transparent",
                fontSize: 14, color: hasSelection ? ACT[a].color : "rgba(0,3,50,0.2)",
                cursor: hasSelection ? "pointer" : "default", opacity: hasSelection ? 1 : 0.4,
                fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
              }}>{ACT[a].icon}</button>
              <div className="act-tip" style={{
                position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                marginTop: 8, background: "#000332", color: "#FAF7F0", fontSize: 12,
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
              if (data.deliverable_label || data.sections) setSynthesis(data);
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
        <div style={{ position: "absolute", top: 52, right: 20, zIndex: 40, background: "#fff", borderRadius: 16, padding: "24px 24px", width: 340, maxHeight: "calc(100vh - 100px)", overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
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
            Select any note, then choose an action: <strong style={{ color: "#6B8AFE" }}>Clarify</strong> to cut to the core. <strong style={{ color: "#FF9090" }}>Expand</strong> to stretch it. <strong style={{ color: "#7ED6A8" }}>Decide</strong> to stress-test it. <strong style={{ color: "#C4A6FF" }}>Express</strong> to structure it.
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
            setPanX(px => cx - (cx - px) * (nz / zoom));
            setPanY(py => cy - (cy - py) * (nz / zoom));
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
            setPanX(px => cx - (cx - px) * (nz / zoom));
            setPanY(py => cy - (cy - py) * (nz / zoom));
          }
          setZoom(nz);
        }} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94949E", fontSize: 16, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,3,50,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >−</button>
        <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94949E", fontSize: 14, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,3,50,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >⟲</button>
      </div>

      {/* CANVAS VIEWPORT */}
      <div ref={vpRef} style={{ flex: 1, overflow: "hidden", cursor: connecting ? "crosshair" : isPanning.current ? "grabbing" : "grab", position: "relative" }}>
        <div
          ref={canvasRef}
          onMouseDown={startPan}
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
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
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
                    zIndex: 10,
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
                onDoubleClick={e => { e.stopPropagation(); e.preventDefault(); setDragId(null); setEditId(n.id); }}
                style={{
                  position: "absolute", left: n.x, top: n.y,
                  width: dimensions.length > 0 ? 190 : 200, minHeight: n.aiInstruction ? 100 : 60, padding: "10px 12px",
                  borderRadius: 10,
                  background: isAi ? `${actColor}08` : n.source === "goal" ? "rgba(0,3,50,0.05)" : (n.source === "thinking" && n.qIndex === 3) ? "rgba(255,144,144,0.06)" : n.source === "thinking" ? "rgba(255,144,144,0.04)" : "#fff",
                  border: `${(n.source === "thinking" && n.qIndex === 3) ? "3px" : "1.5px"} solid ${editId === n.id ? "#FF9090" : isSel ? "#FF9090" : isAi ? actColor + "30" : n.source === "goal" ? "rgba(0,3,50,0.12)" : (n.source === "thinking" && n.qIndex === 3) ? "rgba(255,144,144,0.35)" : n.source === "thinking" ? "rgba(255,144,144,0.15)" : "rgba(0,3,50,0.06)"}`,
                  borderLeft: (n.source === "thinking" && n.qIndex === 3 && !isSel) ? "3px solid #FF9090" : undefined,
                  boxShadow: isSel ? "0 0 0 3px rgba(255,144,144,0.15), 0 1px 3px rgba(0,3,50,0.03)" : (q4Pulsing && n.source === "thinking" && n.qIndex === 3) ? undefined : "0 1px 3px rgba(0,3,50,0.03)",
                  cursor: connecting ? "crosshair" : dragId === n.id ? "grabbing" : "grab",
                  zIndex: dragId === n.id ? 20 : isSel ? 15 : 10,
                  transition: isAi ? "none" : "box-shadow 0.15s, opacity 0.3s",
                  animation: (q4Pulsing && n.source === "thinking" && n.qIndex === 3) ? "q4Glow 2s ease-in-out 3"
                    : (responseFlow && n.aiInstruction && n.id === responseFlow.instructionIds[responseFlow.currentIdx]) ? "rfPulse 1.5s ease-in-out 2"
                    : isAi ? "noteIn 0.3s ease-out forwards" : undefined,
                  animationDelay: isAi && !responseFlow ? `${(notes.indexOf(n) % 3) * 100}ms` : undefined,
                  opacity: responseFlow && n.aiInstruction && responseFlow.instructionIds.includes(n.id) && responseFlow.instructionIds.indexOf(n.id) !== responseFlow.currentIdx ? 0.4 : isAi && !responseFlow ? undefined : undefined,
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
                {editId !== n.id && (
                  <button
                    className="cn-edit"
                    onClick={(e) => { e.stopPropagation(); setDragId(null); setEditId(n.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "none", border: "none",
                      fontSize: 14, color: "#94949E", lineHeight: 1,
                      cursor: "pointer", opacity: 0,
                      transition: "opacity 0.15s",
                      zIndex: 4, padding: 0,
                    }}
                  >&#9998;</button>
                )}
                {noteSuggestions[n.id] && !isAi && n.source !== "goal" && (() => {
                  const sugAction = noteSuggestions[n.id];
                  const sugColor = ACT[sugAction].color;
                  const sugIcon = ACT[sugAction].icon;
                  const isFresh = freshSuggestions.has(n.id);
                  const tipTexts: Record<Action, string> = {
                    clarify: "Try clarifying this",
                    expand: "Try expanding this",
                    decide: "Try deciding on this",
                    express: "Try expressing this",
                  };
                  return (
                    <div
                      className="sug-dot-wrap"
                      style={{ position: "absolute", top: 6, right: 6, zIndex: 5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(new Set([n.id]));
                        setNoteSuggestions(prev => { const next = { ...prev }; delete next[n.id]; return next; });
                        setTimeout(() => runAction(sugAction), 100);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div style={{
                        fontSize: 14, color: sugColor, opacity: 0.5,
                        cursor: "pointer", lineHeight: 1,
                        transition: "opacity 0.15s",
                        animation: isFresh ? "sugPulse 0.6s ease-in-out 2" : undefined,
                      }} className="sug-dot">{sugIcon}</div>
                      <div className="sug-tip" style={{
                        position: "absolute", top: "100%", right: 0,
                        marginTop: 6, background: "#000332", color: "#FAF7F0", fontSize: 11,
                        padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap",
                        pointerEvents: "none", zIndex: 100, opacity: 0, transition: "opacity 0.15s",
                        fontWeight: 400,
                      }}>
                        {tipTexts[sugAction]}
                      </div>
                    </div>
                  );
                })()}
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

          {/* RESPONSE CARD */}
          {responseFlow && (() => {
            const instId = responseFlow.instructionIds[responseFlow.currentIdx];
            const instNote = notes.find(n => n.id === instId);
            if (!instNote) return null;
            const mColor = ACT[responseFlow.action].color;
            const rcX = respCardPos ? respCardPos.x : instNote.x;
            const rcY = respCardPos ? respCardPos.y : instNote.y + 140;
            return (
              <div
                className="cn"
                onMouseDown={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
                  e.stopPropagation();
                  const pt = s2c(e.clientX, e.clientY);
                  const rd = { x: pt.x - rcX, y: pt.y - rcY };
                  setRespDragOff(rd);
                  respDragOffRef.current = rd;
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
        .sug-dot-wrap:hover .sug-dot { opacity: 1 !important; }
        .sug-dot-wrap:hover .sug-tip { opacity: 1 !important; }
        @keyframes sugPulse { 0%,100% { transform:scale(1); opacity:0.5; } 50% { transform:scale(1.3); opacity:1; } }
        @keyframes arrowDraw { to { stroke-dashoffset: 0; } }
        @keyframes rfPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0); } 50% { box-shadow: 0 0 0 6px rgba(255,144,144,0.15); } }
        @keyframes noteIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
        @keyframes coachIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes q4Glow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,144,144,0), 0 1px 3px rgba(0,3,50,0.03); } 50% { box-shadow: 0 0 0 8px rgba(255,144,144,0.12), 0 1px 3px rgba(0,3,50,0.03); } }
        @keyframes tourFadeIn { from { opacity:0; } to { opacity:1; } }
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
