"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Tool = "select" | "sticky" | "text" | "draw" | "shape";
type ShapeKind = "rect" | "circle";

interface CanvasElement {
  id: string;
  type: "sticky" | "action-card" | "text" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  text?: string;
  theme?: string;
  insight?: string;
  actions?: { text: string; timeframe: string; checked: boolean }[];
  shapeKind?: ShapeKind;
}

interface DrawPath {
  id: string;
  points: { x: number; y: number }[];
}

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  choices?: string[];
  canvasAction?: { type: "sticky" | "action-card"; data: Partial<CanvasElement> };
}

const STICKY_COLORS = ["#fff9c4", "#ffe0e0", "#d4f5e9", "#ddeeff"];
let stickyColorIdx = 0;

function nextStickyColor() {
  const c = STICKY_COLORS[stickyColorIdx % STICKY_COLORS.length];
  stickyColorIdx++;
  return c;
}

export default function ExpansionRoom({
  initialDiscovery,
  sourceSubmissionId,
  userId,
}: {
  initialDiscovery: string;
  sourceSubmissionId: string;
  userId: string;
}) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [nextShape, setNextShape] = useState<ShapeKind>("rect");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", content: initialDiscovery },
    { role: "ai", content: "what do you want to do with this?", choices: ["break it down", "turn it into actions", "sit with it", "add a note to the canvas"] },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addElement = useCallback((el: CanvasElement) => {
    setElements((prev) => [...prev, el]);
  }, []);

  const deleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (dragState || resizeState) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "sticky") {
      addElement({ id: crypto.randomUUID(), type: "sticky", x: x - 90, y: y - 70, w: 180, h: 140, color: nextStickyColor(), text: "" });
      setActiveTool("select");
    } else if (activeTool === "text") {
      addElement({ id: crypto.randomUUID(), type: "text", x: x - 60, y: y - 12, w: 200, h: 32, text: "" });
      setActiveTool("select");
    } else if (activeTool === "shape") {
      addElement({ id: crypto.randomUUID(), type: "shape", x: x - 40, y: y - 40, w: 80, h: 80, shapeKind: nextShape, color: "#000332" });
      setNextShape(nextShape === "rect" ? "circle" : "rect");
      setActiveTool("select");
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "draw" && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDrawing(true);
      setCurrentPath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (drawing && activeTool === "draw") {
      setCurrentPath((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      return;
    }

    if (resizeState) {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      setElements((prev) =>
        prev.map((el) =>
          el.id === resizeState.id
            ? { ...el, w: Math.max(60, resizeState.startW + dx), h: Math.max(40, resizeState.startH + dy) }
            : el
        )
      );
      return;
    }

    if (dragState) {
      setElements((prev) =>
        prev.map((el) =>
          el.id === dragState.id
            ? { ...el, x: e.clientX - rect.left - dragState.offsetX, y: e.clientY - rect.top - dragState.offsetY }
            : el
        )
      );
    }
  };

  const handleMouseUp = () => {
    if (drawing && currentPath.length > 1) {
      setPaths((prev) => [...prev, { id: crypto.randomUUID(), points: currentPath }]);
      setActiveTool("select");
    }
    setDrawing(false);
    setCurrentPath([]);
    setDragState(null);
    setResizeState(null);
  };

  const handleElementMouseDown = (id: string, e: React.MouseEvent) => {
    if (activeTool !== "select") return;
    const el = elements.find((el) => el.id === id);
    if (!el || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragState({ id, offsetX: e.clientX - rect.left - el.x, offsetY: e.clientY - rect.top - el.y });
  };

  const handleResizeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const el = elements.find((el) => el.id === id);
    if (!el) return;
    setResizeState({ id, startX: e.clientX, startY: e.clientY, startW: el.w, startH: el.h });
  };

  const updateElementText = (id: string, text: string) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, text } : el)));
  };

  const toggleAction = (elementId: string, actionIdx: number) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== elementId || !el.actions) return el;
        const newActions = el.actions.map((a, i) => (i === actionIdx ? { ...a, checked: !a.checked } : a));
        return { ...el, actions: newActions };
      })
    );
  };

  const saveExpansion = async (el: CanvasElement) => {
    if (el.type !== "action-card") return;
    try {
      await fetch("/api/expansion/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: el.theme, insight: el.insight, actions: el.actions, source_day_submission_id: sourceSubmissionId, userId }),
      });
    } catch { /* silent */ }
  };

  // Chat handlers
  const handleChoice = (choice: string) => {
    setMessages((prev) => [...prev, { role: "user", content: choice }]);
    if (choice === "add a note to the canvas" || choice === "add as a sticky note") {
      addElement({ id: crypto.randomUUID(), type: "sticky", x: 40 + Math.random() * 200, y: 80 + Math.random() * 200, w: 180, h: 140, color: nextStickyColor(), text: "" });
      setMessages((prev) => [...prev, { role: "ai", content: "added a sticky note to your canvas. click it to start writing." }]);
    } else if (choice === "turn it into actions") {
      const actionCard: CanvasElement = {
        id: crypto.randomUUID(), type: "action-card", x: 60 + Math.random() * 100, y: 80 + Math.random() * 100, w: 280, h: 240,
        theme: "what you discovered",
        insight: initialDiscovery.length > 120 ? initialDiscovery.slice(0, 120) + "..." : initialDiscovery,
        actions: [
          { text: "name the thing you want to move forward", timeframe: "first move", checked: false },
          { text: "write down one concrete next step", timeframe: "this week", checked: false },
          { text: "return to this card daily and check in", timeframe: "the practice", checked: false },
        ],
      };
      addElement(actionCard);
      setMessages((prev) => [...prev, { role: "ai", content: "here's an action card based on what you said. i've added it to your canvas." }]);
    } else if (choice === "break it down") {
      setMessages((prev) => [...prev, { role: "ai", content: "let's pull it apart. what's the one thread in what you said that feels most alive right now?", choices: ["the thing i'm avoiding", "what surprised me", "where i got stuck"] }]);
    } else if (choice === "sit with it") {
      setMessages((prev) => [...prev, { role: "ai", content: "that's a valid response. sometimes the best thing to do with a discovery is to let it sit. come back when you're ready." }]);
    } else if (choice === "keep talking") {
      setMessages((prev) => [...prev, { role: "ai", content: "go ahead. what else is coming up?" }]);
    } else {
      setMessages((prev) => [...prev, { role: "ai", content: `you said "${choice}." that's worth following. want to put that on the canvas?`, choices: ["add as a sticky note", "turn it into actions"] }]);
    }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "ai", content: "interesting. want to capture that thought?", choices: ["add as a sticky note", "turn it into actions", "keep talking"] }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, 600);
  };

  const pointsToPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  };

  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: "select", label: "Select", icon: "↖" },
    { id: "sticky", label: "Note", icon: "▪" },
    { id: "text", label: "Text", icon: "T" },
    { id: "draw", label: "Draw", icon: "✎" },
    { id: "shape", label: "Shape", icon: "◻" },
  ];

  const canvasCursor = activeTool === "select" ? (dragState ? "grabbing" : "default") : activeTool === "draw" ? "crosshair" : "cell";

  // Delete button + resize handle renderer
  const renderOverlays = (el: CanvasElement) => {
    const isHovered = hoveredId === el.id;
    return (
      <>
        {isHovered && (
          <button
            onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: -8, right: -8,
              width: 20, height: 20, borderRadius: "50%",
              background: "#000332", color: "#FAF7F0", border: "none",
              fontSize: 11, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", zIndex: 10,
            }}
          >
            ×
          </button>
        )}
        {isHovered && (
          <div
            onMouseDown={(e) => handleResizeMouseDown(el.id, e)}
            style={{
              position: "absolute", bottom: 0, right: 0,
              width: 12, height: 12, cursor: "nwse-resize",
              background: "linear-gradient(135deg, transparent 50%, rgba(0,3,50,0.25) 50%)",
              borderRadius: "0 0 4px 0", zIndex: 10,
            }}
          />
        )}
      </>
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Codec Pro',sans-serif" }}>
      {/* CANVAS */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        {/* TOOLBAR */}
        <div style={{
          display: "flex", alignItems: "center", gap: 2, padding: "8px 16px",
          background: "#fff", borderBottom: "1px solid #e2ddd8",
          zIndex: 20, position: "relative",
        }}>
          <a href="/dashboard" style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,3,50,0.45)", textDecoration: "none", marginRight: 16 }}>← dashboard</a>
          <div style={{ width: 1, height: 24, background: "#e2ddd8", marginRight: 8 }} />
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(activeTool === t.id && t.id !== "select" ? "select" : t.id)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "none",
                background: activeTool === t.id ? "rgba(255,144,144,0.12)" : "transparent",
                color: activeTool === t.id ? "#FF9090" : "rgba(0,3,50,0.45)",
                fontSize: 16, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Codec Pro',sans-serif",
                transition: "all 0.15s",
                borderBottom: activeTool === t.id ? "2px solid #FF9090" : "2px solid transparent",
              }}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
          {activeTool === "shape" && (
            <button
              onClick={() => setNextShape(nextShape === "rect" ? "circle" : "rect")}
              style={{
                marginLeft: 4, padding: "4px 10px", borderRadius: 6,
                border: "1px solid #e2ddd8", background: "#fff",
                fontSize: 11, color: "rgba(0,3,50,0.5)", cursor: "pointer",
                fontFamily: "'Codec Pro',sans-serif",
              }}
            >
              {nextShape === "rect" ? "□ rect" : "○ circle"}
            </button>
          )}
        </div>

        {/* CANVAS AREA */}
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            flex: 1, position: "relative", background: "#ffffff",
            backgroundImage: "radial-gradient(circle, rgba(0,3,50,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px", overflow: "hidden", cursor: canvasCursor,
          }}
        >
          {/* Drawing layer */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
            {paths.map((p) => (
              <path key={p.id} d={pointsToPath(p.points)} fill="none" stroke="#000332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            ))}
            {drawing && currentPath.length > 1 && (
              <path d={pointsToPath(currentPath)} fill="none" stroke="#FF9090" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>

          {/* Elements */}
          {elements.map((el) => {
            if (el.type === "sticky") {
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                  onMouseEnter={() => setHoveredId(el.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: "absolute", left: el.x, top: el.y, width: el.w, minHeight: el.h,
                    background: el.color, borderRadius: 4, padding: 14,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    cursor: activeTool === "select" ? (dragState?.id === el.id ? "grabbing" : "grab") : "default",
                    userSelect: "none", zIndex: dragState?.id === el.id ? 100 : 1,
                  }}
                >
                  {renderOverlays(el)}
                  <textarea
                    value={el.text || ""}
                    onChange={(e) => updateElementText(el.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="write here..."
                    style={{ width: "100%", minHeight: el.h - 28, background: "transparent", border: "none", outline: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 13, lineHeight: 1.5, color: "#000332", resize: "none" }}
                  />
                </div>
              );
            }

            if (el.type === "text") {
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                  onMouseEnter={() => setHoveredId(el.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: "absolute", left: el.x, top: el.y, width: el.w,
                    cursor: activeTool === "select" ? (dragState?.id === el.id ? "grabbing" : "grab") : "default",
                    userSelect: "none", zIndex: dragState?.id === el.id ? 100 : 1,
                  }}
                >
                  {renderOverlays(el)}
                  <textarea
                    value={el.text || ""}
                    onChange={(e) => updateElementText(el.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="type here..."
                    style={{ width: "100%", minHeight: 28, background: "transparent", border: "none", outline: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 15, lineHeight: 1.5, color: "#000332", resize: "none", fontWeight: 400 }}
                  />
                </div>
              );
            }

            if (el.type === "shape") {
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                  onMouseEnter={() => setHoveredId(el.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h,
                    border: "2px solid rgba(0,3,50,0.3)",
                    borderRadius: el.shapeKind === "circle" ? "50%" : 4,
                    cursor: activeTool === "select" ? (dragState?.id === el.id ? "grabbing" : "grab") : "default",
                    userSelect: "none", zIndex: dragState?.id === el.id ? 100 : 1,
                  }}
                >
                  {renderOverlays(el)}
                </div>
              );
            }

            if (el.type === "action-card") {
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                  onMouseEnter={() => setHoveredId(el.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: "absolute", left: el.x, top: el.y, width: el.w,
                    background: "#fff", borderRadius: 12, borderLeft: "3px solid #FF9090",
                    padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                    cursor: activeTool === "select" ? (dragState?.id === el.id ? "grabbing" : "grab") : "default",
                    userSelect: "none", zIndex: dragState?.id === el.id ? 100 : 1,
                  }}
                >
                  {renderOverlays(el)}
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 8 }}>{el.theme}</p>
                  <p style={{ fontSize: 13, color: "rgba(0,3,50,0.6)", lineHeight: 1.6, marginBottom: 14, fontWeight: 300 }}>{el.insight}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {el.actions?.map((action, i) => (
                      <div key={i} onClick={(e) => { e.stopPropagation(); toggleAction(el.id, i); }} onMouseDown={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1, border: action.checked ? "none" : "1.5px solid rgba(0,3,50,0.2)", background: action.checked ? "#FF9090" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>
                          {action.checked ? "✓" : ""}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, color: "#000332", lineHeight: 1.4, textDecoration: action.checked ? "line-through" : "none", opacity: action.checked ? 0.4 : 1 }}>{action.text}</p>
                          <p style={{ fontSize: 10, color: "rgba(0,3,50,0.35)", marginTop: 2 }}>{action.timeframe}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); saveExpansion(el); }} onMouseDown={(e) => e.stopPropagation()} style={{ marginTop: 14, background: "none", border: "none", fontSize: 11, color: "rgba(0,3,50,0.35)", cursor: "pointer", fontFamily: "'Codec Pro',sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}>
                    save to account
                  </button>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* CHAT PANEL */}
      <div style={{ width: 320, height: "100vh", background: "#FAF7F0", borderLeft: "1px solid rgba(0,3,50,0.08)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 22px", background: "#000332" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF9090", marginBottom: 4 }}>expansion room</p>
          <p style={{ fontSize: 13, color: "rgba(244,242,238,0.5)", fontWeight: 300 }}>explore what came up</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "ai" && i === 0 ? (
                <div style={{ background: "#FAF7F0", borderLeft: "3px solid #FF9090", padding: "14px 16px", borderRadius: "0 8px 8px 0", border: "1px solid rgba(0,3,50,0.06)", borderLeftColor: "#FF9090" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 6 }}>your day 1 discovery</p>
                  <p style={{ fontSize: 13, color: "rgba(0,3,50,0.7)", lineHeight: 1.65, fontWeight: 300 }}>{msg.content}</p>
                </div>
              ) : msg.role === "ai" ? (
                <div>
                  <p style={{ fontSize: 13, color: "#000332", lineHeight: 1.6, fontWeight: 300 }}>{msg.content}</p>
                  {msg.choices && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {msg.choices.map((c) => (
                        <button key={c} onClick={() => handleChoice(c)} style={{ background: "#fff", border: "1px solid rgba(0,3,50,0.12)", borderRadius: 100, padding: "8px 14px", fontFamily: "'Codec Pro',sans-serif", fontSize: 12, color: "#000332", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#000332"; (e.target as HTMLElement).style.color = "#FAF7F0"; }} onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#fff"; (e.target as HTMLElement).style.color = "#000332"; }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "#000332", color: "#FAF7F0", padding: "10px 16px", borderRadius: "16px 16px 4px 16px", fontSize: 13, lineHeight: 1.5, maxWidth: "85%", fontWeight: 300 }}>{msg.content}</div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(0,3,50,0.08)", display: "flex", gap: 8 }}>
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="type something..." style={{ flex: 1, padding: "12px 16px", border: "1px solid rgba(0,3,50,0.12)", borderRadius: 100, background: "#fff", fontFamily: "'Codec Pro',sans-serif", fontSize: 13, color: "#000332", outline: "none" }} />
          <button onClick={handleSend} style={{ width: 40, height: 40, borderRadius: "50%", background: "#000332", border: "none", color: "#FAF7F0", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
        </div>
      </div>
    </div>
  );
}
