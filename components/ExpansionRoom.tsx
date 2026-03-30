"use client";

import { useState, useRef, useCallback } from "react";

interface CanvasElement {
  id: string;
  type: "sticky" | "action-card";
  x: number;
  y: number;
  color?: string;
  text?: string;
  theme?: string;
  insight?: string;
  actions?: { text: string; timeframe: string; checked: boolean }[];
}

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  choices?: string[];
  canvasAction?: { type: "sticky" | "action-card"; data: Partial<CanvasElement> };
}

const STICKY_COLORS = ["#FFF3B0", "#FFD0D0", "#C8F0DC", "#D0E8FF"];

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content: initialDiscovery,
    },
    {
      role: "ai",
      content: "what do you want to do with this?",
      choices: ["break it down", "turn it into actions", "sit with it", "add a note to the canvas"],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addElement = useCallback((el: CanvasElement) => {
    setElements((prev) => [...prev, el]);
  }, []);

  const handleChoice = (choice: string) => {
    setMessages((prev) => [...prev, { role: "user", content: choice }]);

    if (choice === "add a note to the canvas") {
      const newSticky: CanvasElement = {
        id: crypto.randomUUID(),
        type: "sticky",
        x: 40 + Math.random() * 200,
        y: 40 + Math.random() * 200,
        color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
        text: "",
      };
      addElement(newSticky);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "added a sticky note to your canvas. click it to start writing." },
      ]);
    } else if (choice === "turn it into actions") {
      const actionCard: CanvasElement = {
        id: crypto.randomUUID(),
        type: "action-card",
        x: 60 + Math.random() * 100,
        y: 60 + Math.random() * 100,
        theme: "what you discovered",
        insight: initialDiscovery.length > 120 ? initialDiscovery.slice(0, 120) + "..." : initialDiscovery,
        actions: [
          { text: "name the thing you want to move forward", timeframe: "first move", checked: false },
          { text: "write down one concrete next step", timeframe: "this week", checked: false },
          { text: "return to this card daily and check in", timeframe: "the practice", checked: false },
        ],
      };
      addElement(actionCard);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "here's an action card based on what you said. i've added it to your canvas.",
          canvasAction: { type: "action-card", data: actionCard },
        },
      ]);
    } else if (choice === "break it down") {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "let's pull it apart. what's the one thread in what you said that feels most alive right now?",
          choices: ["the thing i'm avoiding", "what surprised me", "where i got stuck"],
        },
      ]);
    } else if (choice === "sit with it") {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "that's a valid response. sometimes the best thing to do with a discovery is to let it sit. come back when you're ready." },
      ]);
    } else {
      // Generic follow-up for sub-choices
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `you said "${choice}." that's worth following. want to put that on the canvas?`,
          choices: ["add as a sticky note", "turn it into actions"],
        },
      ]);
    }

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    // Simulated response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "interesting. want to capture that thought?",
          choices: ["add as a sticky note", "turn it into actions", "keep talking"],
        },
      ]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, 600);
  };

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    const el = elements.find((el) => el.id === id);
    if (!el || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragState({ id, offsetX: e.clientX - rect.left - el.x, offsetY: e.clientY - rect.top - el.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setElements((prev) =>
      prev.map((el) =>
        el.id === dragState.id
          ? { ...el, x: e.clientX - rect.left - dragState.offsetX, y: e.clientY - rect.top - dragState.offsetY }
          : el
      )
    );
  };

  const handleMouseUp = () => setDragState(null);

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
        body: JSON.stringify({
          theme: el.theme,
          insight: el.insight,
          actions: el.actions,
          source_day_submission_id: sourceSubmissionId,
          userId,
        }),
      });
    } catch {
      // silent fail
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Codec Pro',sans-serif" }}>
      {/* CANVAS */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          position: "relative",
          background: "#ffffff",
          backgroundImage: "radial-gradient(circle, rgba(0,3,50,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          overflow: "hidden",
          cursor: dragState ? "grabbing" : "default",
        }}
      >
        {/* Back button */}
        <a
          href="/dashboard"
          style={{
            position: "absolute", top: 20, left: 24, zIndex: 10,
            fontSize: 13, fontWeight: 700, color: "rgba(0,3,50,0.5)",
            textDecoration: "none",
          }}
        >
          ← dashboard
        </a>

        {elements.map((el) => {
          if (el.type === "sticky") {
            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleMouseDown(el.id, e)}
                style={{
                  position: "absolute",
                  left: el.x,
                  top: el.y,
                  width: 180,
                  minHeight: 140,
                  background: el.color,
                  borderRadius: 4,
                  padding: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  cursor: dragState?.id === el.id ? "grabbing" : "grab",
                  userSelect: "none",
                  zIndex: dragState?.id === el.id ? 100 : 1,
                }}
              >
                <textarea
                  value={el.text || ""}
                  onChange={(e) => updateElementText(el.id, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="write here..."
                  style={{
                    width: "100%",
                    minHeight: 100,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "'Codec Pro',sans-serif",
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#000332",
                    resize: "none",
                  }}
                />
              </div>
            );
          }

          if (el.type === "action-card") {
            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleMouseDown(el.id, e)}
                style={{
                  position: "absolute",
                  left: el.x,
                  top: el.y,
                  width: 280,
                  background: "#fff",
                  borderRadius: 12,
                  borderLeft: "3px solid #FF9090",
                  padding: "20px 22px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  cursor: dragState?.id === el.id ? "grabbing" : "grab",
                  userSelect: "none",
                  zIndex: dragState?.id === el.id ? 100 : 1,
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 8 }}>
                  {el.theme}
                </p>
                <p style={{ fontSize: 13, color: "rgba(0,3,50,0.6)", lineHeight: 1.6, marginBottom: 14, fontWeight: 300 }}>
                  {el.insight}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {el.actions?.map((action, i) => (
                    <div
                      key={i}
                      onClick={(e) => { e.stopPropagation(); toggleAction(el.id, i); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                        border: action.checked ? "none" : "1.5px solid rgba(0,3,50,0.2)",
                        background: action.checked ? "#FF9090" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 11,
                      }}>
                        {action.checked ? "✓" : ""}
                      </div>
                      <div>
                        <p style={{
                          fontSize: 13, color: "#000332", lineHeight: 1.4,
                          textDecoration: action.checked ? "line-through" : "none",
                          opacity: action.checked ? 0.4 : 1,
                        }}>
                          {action.text}
                        </p>
                        <p style={{ fontSize: 10, color: "rgba(0,3,50,0.35)", marginTop: 2 }}>{action.timeframe}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); saveExpansion(el); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    marginTop: 14, background: "none", border: "none",
                    fontSize: 11, color: "rgba(0,3,50,0.35)", cursor: "pointer",
                    fontFamily: "'Codec Pro',sans-serif", textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  save to account
                </button>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* CHAT PANEL */}
      <div style={{
        width: 320, height: "100vh",
        background: "#FAF7F0", borderLeft: "1px solid rgba(0,3,50,0.08)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 22px",
          background: "#000332",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF9090", marginBottom: 4 }}>
            expansion room
          </p>
          <p style={{ fontSize: 13, color: "rgba(244,242,238,0.5)", fontWeight: 300 }}>
            explore what came up
          </p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "ai" && i === 0 ? (
                // Initial discovery block
                <div style={{
                  background: "#FAF7F0", borderLeft: "3px solid #FF9090",
                  padding: "14px 16px", borderRadius: "0 8px 8px 0",
                  border: "1px solid rgba(0,3,50,0.06)", borderLeftColor: "#FF9090",
                }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 6 }}>
                    your day 1 discovery
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(0,3,50,0.7)", lineHeight: 1.65, fontWeight: 300 }}>
                    {msg.content}
                  </p>
                </div>
              ) : msg.role === "ai" ? (
                <div>
                  <p style={{ fontSize: 13, color: "#000332", lineHeight: 1.6, fontWeight: 300 }}>
                    {msg.content}
                  </p>
                  {msg.choices && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {msg.choices.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleChoice(c)}
                          style={{
                            background: "#fff", border: "1px solid rgba(0,3,50,0.12)",
                            borderRadius: 100, padding: "8px 14px",
                            fontFamily: "'Codec Pro',sans-serif", fontSize: 12,
                            color: "#000332", cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#000332"; (e.target as HTMLElement).style.color = "#FAF7F0"; }}
                          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#fff"; (e.target as HTMLElement).style.color = "#000332"; }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{
                    background: "#000332", color: "#FAF7F0",
                    padding: "10px 16px", borderRadius: "16px 16px 4px 16px",
                    fontSize: 13, lineHeight: 1.5, maxWidth: "85%", fontWeight: 300,
                  }}>
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "14px 16px",
          borderTop: "1px solid rgba(0,3,50,0.08)",
          display: "flex", gap: 8,
        }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="type something..."
            style={{
              flex: 1, padding: "12px 16px",
              border: "1px solid rgba(0,3,50,0.12)",
              borderRadius: 100, background: "#fff",
              fontFamily: "'Codec Pro',sans-serif", fontSize: 13,
              color: "#000332", outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "#000332", border: "none",
              color: "#FAF7F0", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
