"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Dimension { label: string; description: string; }

function DimensionsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const capture = sp.get("capture") || "";
  const mode = sp.get("mode") || "clarity";
  const qasRaw = sp.get("qas") || "[]";

  let dimsParam: Dimension[] = [];
  try { dimsParam = JSON.parse(sp.get("dimensions") || "[]"); } catch { dimsParam = []; }

  const [dimensions, setDimensions] = useState<Dimension[]>(dimsParam);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [minWarning, setMinWarning] = useState(false);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editingDesc, setEditingDesc] = useState<number | null>(null);

  const removeDim = (idx: number) => {
    if (dimensions.length <= 2) {
      setMinWarning(true);
      setTimeout(() => setMinWarning(false), 2000);
      return;
    }
    setRemovingIdx(idx);
    setTimeout(() => {
      setDimensions(prev => prev.filter((_, i) => i !== idx));
      setRemovingIdx(null);
    }, 250);
  };

  const addDim = () => {
    if (!newLabel.trim() || dimensions.length >= 5) return;
    setDimensions(prev => [...prev, { label: newLabel.trim(), description: "" }]);
    setNewLabel("");
    setAdding(false);
  };

  const confirm = () => {
    const params = new URLSearchParams({
      capture,
      mode,
      qas: qasRaw,
      dimensions: JSON.stringify(dimensions),
    });
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    router.push(`/session/${isMobile ? "mobile-canvas" : "canvas"}?${params.toString()}`);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px 80px", fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 32 }}>
        primer
      </div>

      <div style={{ maxWidth: 520, width: "100%" }}>
        {/* Goal card */}
        <div style={{ background: "#000332", borderRadius: 12, padding: "14px 18px", marginBottom: 28 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#FF9090", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>YOUR GOAL</div>
          <p style={{ fontSize: 13, color: "rgba(250,247,240,0.7)", lineHeight: 1.6, fontWeight: 300 }}>
            {capture.length > 120 ? capture.slice(0, 120) + "..." : capture}
          </p>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 24, fontWeight: 400, fontStyle: "italic", color: "#000332", lineHeight: 1.35, marginBottom: 8 }}>
          Here&rsquo;s what we&rsquo;ll think through.
        </h1>
        <p style={{ fontSize: 14, color: "rgba(0,3,50,0.45)", fontWeight: 300, marginBottom: 28 }}>
          Remove anything that doesn&rsquo;t feel right, or add your own.
        </p>

        {/* Dimension cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {dimensions.map((dim, i) => (
            <div
              key={`${dim.label}-${i}`}
              style={{
                background: "#fff", borderRadius: 14, padding: "18px 20px",
                border: "1px solid rgba(0,3,50,0.06)",
                position: "relative",
                opacity: removingIdx === i ? 0 : 1,
                transform: removingIdx === i ? "translateX(-20px)" : "translateX(0)",
                transition: "opacity 0.25s, transform 0.25s",
              }}
            >
              <button
                onClick={() => removeDim(i)}
                style={{
                  position: "absolute", top: 12, right: 12,
                  background: "none", border: "none", fontSize: 16,
                  color: "rgba(0,3,50,0.2)", cursor: "pointer", lineHeight: 1,
                  padding: 4,
                }}
              >&times;</button>
              {/* Editable title */}
              {editingLabel === i ? (
                <input
                  autoFocus
                  value={dim.label}
                  onChange={e => setDimensions(prev => prev.map((d, j) => j === i ? { ...d, label: e.target.value } : d))}
                  onBlur={() => setEditingLabel(null)}
                  onKeyDown={e => { if (e.key === "Enter") setEditingLabel(null); }}
                  style={{
                    fontSize: 16, fontWeight: 700, color: "#000332", border: "none",
                    borderBottom: "1.5px solid #FF9090", outline: "none", background: "transparent",
                    width: "calc(100% - 32px)", fontFamily: "inherit", marginBottom: 4, padding: 0,
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingLabel(i)}
                  style={{ fontSize: 16, fontWeight: 700, color: "#000332", marginBottom: 4, paddingRight: 28, cursor: "text", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {dim.label}
                  <span style={{ fontSize: 12, color: "rgba(0,3,50,0.15)" }}>&#9998;</span>
                </div>
              )}
              {/* Editable description */}
              {editingDesc === i ? (
                <input
                  autoFocus
                  value={dim.description}
                  onChange={e => setDimensions(prev => prev.map((d, j) => j === i ? { ...d, description: e.target.value } : d))}
                  onBlur={() => setEditingDesc(null)}
                  onKeyDown={e => { if (e.key === "Enter") setEditingDesc(null); }}
                  style={{
                    fontSize: 13, color: "rgba(0,3,50,0.55)", border: "none",
                    borderBottom: "1px solid rgba(0,3,50,0.1)", outline: "none", background: "transparent",
                    width: "100%", fontFamily: "inherit", fontWeight: 300, padding: 0,
                  }}
                  placeholder="Add a description..."
                />
              ) : (
                <p
                  onClick={() => setEditingDesc(i)}
                  style={{ fontSize: 13, color: dim.description ? "rgba(0,3,50,0.45)" : "rgba(0,3,50,0.2)", fontWeight: 300, lineHeight: 1.5, cursor: "text" }}
                >
                  {dim.description || "Tap to add description..."}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Min warning */}
        {minWarning && (
          <p style={{ fontSize: 12, color: "#FF9090", marginBottom: 12, textAlign: "center" }}>
            You need at least 2 dimensions.
          </p>
        )}

        {/* Add dimension */}
        {dimensions.length < 5 && (
          adding ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <input
                autoFocus
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addDim(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
                placeholder="e.g. Who to talk to first"
                style={{
                  flex: 1, padding: "12px 16px", border: "1.5px solid rgba(0,3,50,0.1)",
                  borderRadius: 10, fontSize: 14, color: "#000332", outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={addDim}
                disabled={!newLabel.trim()}
                style={{
                  padding: "12px 20px", borderRadius: 10, border: "none",
                  background: newLabel.trim() ? "#FF9090" : "rgba(0,3,50,0.06)",
                  color: newLabel.trim() ? "#000332" : "rgba(0,3,50,0.25)",
                  fontSize: 13, fontWeight: 700, cursor: newLabel.trim() ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
              >Add</button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              style={{
                background: "none", border: "1.5px dashed rgba(0,3,50,0.12)",
                borderRadius: 14, padding: "14px 20px", width: "100%",
                fontSize: 14, color: "rgba(0,3,50,0.35)", cursor: "pointer",
                fontFamily: "inherit", marginBottom: 24,
                transition: "border-color 0.15s",
              }}
            >
              + Add a dimension
            </button>
          )
        )}

        {/* Confirm button */}
        <button
          onClick={confirm}
          disabled={dimensions.length < 2}
          style={{
            width: "100%", padding: "16px", borderRadius: 100,
            background: dimensions.length >= 2 ? "#FF9090" : "rgba(0,3,50,0.06)",
            color: dimensions.length >= 2 ? "#000332" : "rgba(0,3,50,0.25)",
            border: "none", fontSize: 15, fontWeight: 700,
            cursor: dimensions.length >= 2 ? "pointer" : "default",
            fontFamily: "inherit", transition: "all 0.2s",
          }}
        >
          Let&rsquo;s go &rarr;
        </button>
      </div>
    </div>
  );
}

export default function DimensionsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <DimensionsInner />
    </Suspense>
  );
}
