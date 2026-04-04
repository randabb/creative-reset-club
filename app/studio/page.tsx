"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Mode = "clarity" | "expansion" | "decision" | "expression";

const MODE_META: Record<Mode, { icon: string; color: string; label: string }> = {
  clarity: { icon: "◎", color: "#6B8AFE", label: "Clarity" },
  expansion: { icon: "✦", color: "#FF9090", label: "Expansion" },
  decision: { icon: "⟁", color: "#7ED6A8", label: "Decision" },
  expression: { icon: "◈", color: "#C4A6FF", label: "Expression" },
};

interface CanvasItem {
  id: string;
  goal: string;
  excerpt: string;
  mode: Mode;
  note_count: number;
  connection_count: number;
  created_at: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const EXAMPLE_PROMPTS = [
  "How should I position my product?",
  "I need to make a hiring decision",
  "I have an idea but can't articulate it",
  "I want to plan my next quarter",
];

export default function Studio() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Mode | "thoughts">("all");
  const [arcModal, setArcModal] = useState(false);
  const [arcEmail, setArcEmail] = useState("");
  const [arcSubmitted, setArcSubmitted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [themes, setThemes] = useState<{ label: string; sessionIds: string[] }[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [themesLoaded, setThemesLoaded] = useState(false);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUser(user);
      setArcEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      const name = profile?.name || "";
      setFirstName(name.split(" ")[0]);

      try {
        const res = await fetch(`/api/sessions?userId=${user.id}`);
        const data = await res.json();
        if (data.sessions) {
          setCanvases(data.sessions.map((s: Record<string, unknown>) => ({
            id: s.id,
            goal: s.goal || "Untitled canvas",
            excerpt: "",
            mode: s.mode || "clarity",
            note_count: s.note_count || 0,
            connection_count: 0,
            created_at: s.updated_at || s.created_at || "",
          })));
        }
      } catch { /* table may not exist yet */ }

      setLoading(false);
    };
    load();
  }, [router]);

  const loadThemes = async () => {
    if (themesLoaded || canvases.length < 3) return;
    setThemesLoading(true);
    const sessionsToSend = canvases.map(c => ({ id: c.id, goal: c.goal, mode: c.mode }));
    console.log("[studio] Sessions being sent to themes:", sessionsToSend.length);
    try {
      const res = await fetch("/api/generate-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: sessionsToSend }),
      });
      const data = await res.json();
      console.log("[studio] Themes response:", data);
      if (data.themes?.length) {
        setThemes(data.themes);
      } else {
        // Fallback: group by mode
        const modeGroups: Record<string, string[]> = {};
        canvases.forEach(c => {
          const label = c.mode || "clarity";
          if (!modeGroups[label]) modeGroups[label] = [];
          modeGroups[label].push(c.id);
        });
        const fallbackThemes = Object.entries(modeGroups)
          .filter(([, ids]) => ids.length > 0)
          .map(([label, sessionIds]) => ({
            label: `${label} sessions`,
            sessionIds,
          }));
        if (fallbackThemes.length > 0) setThemes(fallbackThemes);
      }
      setThemesLoaded(true);
    } catch (err) {
      console.error("[studio] Themes error:", err);
      // Fallback: group by mode
      const modeGroups: Record<string, string[]> = {};
      canvases.forEach(c => {
        const label = c.mode || "clarity";
        if (!modeGroups[label]) modeGroups[label] = [];
        modeGroups[label].push(c.id);
      });
      const fallbackThemes = Object.entries(modeGroups)
        .filter(([, ids]) => ids.length > 0)
        .map(([label, sessionIds]) => ({ label: `${label} sessions`, sessionIds }));
      if (fallbackThemes.length > 0) setThemes(fallbackThemes);
      setThemesLoaded(true);
    }
    setThemesLoading(false);
  };

  const handleDelete = async (id: string) => {
    setCanvases(prev => prev.filter(c => c.id !== id));
    setThemes(prev => prev.map(t => ({ ...t, sessionIds: t.sessionIds.filter(sid => sid !== id) })).filter(t => t.sessionIds.length > 0));
    setDeleteConfirm(null);
    try {
      await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
    } catch { /* already removed from UI */ }
    setToast("Canvas deleted");
    setTimeout(() => setToast(""), 2000);
  };

  const handleArcWaitlist = async () => {
    if (!arcEmail.trim() || !user) return;
    try {
      await supabase.from("profiles").update({ arc_waitlist_email: arcEmail.trim() }).eq("id", user.id);
    } catch { /* column may not exist */ }
    setArcSubmitted(true);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    );
  }

  const isFirstTime = canvases.length === 0;
  const filtered = filter === "thoughts" ? canvases : filter === "all" ? canvases : canvases.filter((c) => c.mode === filter);

  const filters: { key: "all" | Mode | "thoughts"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "clarity", label: "◎ Clarity" },
    { key: "expansion", label: "✦ Expansion" },
    { key: "decision", label: "⟁ Decision" },
    { key: "expression", label: "◈ Expression" },
    ...(canvases.length >= 3 ? [{ key: "thoughts" as const, label: "Thoughts" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F0", fontFamily: "'Codec Pro',sans-serif" }}>
      {/* NAV */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "24px 40px", maxWidth: 960, margin: "0 auto",
      }}>
        <Link href="/" style={{ fontSize: 15, fontWeight: 700, color: "#000332", textDecoration: "none", letterSpacing: "-0.01em" }}>
          primer
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#FF9090" }}>Studio</span>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#000332",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FAF7F0", fontSize: 13, fontWeight: 700,
          }}>
            {firstName ? firstName[0].toUpperCase() : "?"}
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={{
            background: "none", border: "none", fontSize: 11,
            color: "rgba(0,3,50,0.3)", cursor: "pointer", fontFamily: "inherit",
          }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px 80px" }}>
        {/* GREETING */}
        <div style={{ marginBottom: isFirstTime ? 32 : 40, animation: "studioFadeUp 0.5s ease forwards", opacity: 0 }}>
          <h1 style={{
            fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 400,
            color: "#000332", fontStyle: "italic", letterSpacing: "-0.02em",
            lineHeight: 1.2, marginBottom: isFirstTime ? 0 : 8,
          }}>
            Good {getGreeting()}{firstName ? `, ${firstName}` : ""}.
          </h1>
          {!isFirstTime && (
            <p style={{ fontSize: 15, color: "rgba(0,3,50,0.45)", fontWeight: 300 }}>
              Your studio has {canvases.length} canvas{canvases.length !== 1 ? "es" : ""}.
            </p>
          )}
        </div>

        {isFirstTime ? (
          <>
            {/* FIRST-TIME ENTRY CARD */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "40px 40px",
              boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
              marginBottom: 48,
              animation: "studioFadeUp 0.5s ease 0.1s forwards", opacity: 0,
            }}>
              <h2 style={{
                fontSize: 22, fontWeight: 400, fontStyle: "italic",
                color: "#000332", letterSpacing: "-0.01em", marginBottom: 12,
              }}>
                Start your first canvas
              </h2>
              <p style={{
                fontSize: 15, color: "rgba(0,3,50,0.5)", fontWeight: 300,
                lineHeight: 1.7, maxWidth: 480, marginBottom: 28,
              }}>
                Got a decision to make, an idea to develop, or a problem to untangle? Primer guides you through it in about 15 minutes. You&rsquo;ll leave with something you can actually use.
              </p>

              {/* Example prompt chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      const params = new URLSearchParams({ prefill: prompt });
                      router.push(`/session/new?${params.toString()}`);
                    }}
                    className="prompt-chip"
                    style={{
                      padding: "8px 16px", borderRadius: 20,
                      background: "rgba(0,3,50,0.03)", border: "1px solid rgba(0,3,50,0.08)",
                      color: "#000332", fontSize: 13, fontWeight: 400,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <Link href="/session/new" style={{
                display: "inline-block", padding: "14px 32px", borderRadius: 100,
                background: "#FF9090", color: "#000332", fontSize: 15, fontWeight: 700,
                textDecoration: "none", fontFamily: "inherit",
              }}>
                Or start blank
              </Link>
            </div>

            {/* HOW IT WORKS */}
            <div style={{
              borderTop: "1px solid rgba(0,3,50,0.06)", paddingTop: 36,
              animation: "studioFadeUp 0.5s ease 0.2s forwards", opacity: 0,
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 32,
              }}>
                {[
                  { step: "1", title: "Capture", desc: "Write what\u2019s on your mind. No structure needed." },
                  { step: "2", title: "Think", desc: "AI asks you questions grounded in expert frameworks. You go deeper." },
                  { step: "3", title: "Canvas", desc: "See your ideas on a spatial canvas. Clarify, expand, decide, or express them." },
                ].map((s) => (
                  <div key={s.step}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(255,144,144,0.12)", color: "#FF9090",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, marginBottom: 12,
                    }}>
                      {s.step}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#000332", marginBottom: 4 }}>{s.title}</div>
                    <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontWeight: 300, lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* RETURNING USER: ACTION BUTTONS */}
            <div style={{ display: "flex", gap: 12, marginBottom: 56, animation: "studioFadeUp 0.5s ease 0.1s forwards", opacity: 0, flexWrap: "wrap" }}>
              <Link href="/session/new" style={{
                flex: 1, minWidth: 240, padding: "28px 28px",
                background: "#fff", border: "1.5px solid #FF9090", borderRadius: 16,
                textDecoration: "none", transition: "transform 0.2s, box-shadow 0.2s",
                display: "block",
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#000332", fontStyle: "italic", marginBottom: 4 }}>New canvas</div>
                <div style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontWeight: 300 }}>Think through something specific</div>
              </Link>
              <button
                onClick={() => setArcModal(true)}
                style={{
                  flex: 1, minWidth: 240, padding: "28px 28px",
                  background: "transparent", border: "1.5px dashed rgba(0,3,50,0.15)", borderRadius: 16,
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#000332", fontStyle: "italic", marginBottom: 4 }}>
                  New arc
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase" as const, color: "#FF9090",
                    background: "rgba(255,144,144,0.1)", padding: "3px 8px",
                    borderRadius: 100, marginLeft: 10, verticalAlign: "middle",
                    fontStyle: "normal",
                  }}>Coming soon</span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontWeight: 300, fontStyle: "normal" }}>Work toward something bigger, over days</div>
              </button>
            </div>

            {/* CANVASES */}
            <div style={{ animation: "studioFadeUp 0.5s ease 0.3s forwards", opacity: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#000332" }}>Your canvases</h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {filters.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setFilter(f.key); if (f.key === "thoughts") loadThemes(); }}
                      style={{
                        padding: "6px 14px", borderRadius: 100, border: "none",
                        background: filter === f.key ? "#fff" : "transparent",
                        boxShadow: filter === f.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                        fontSize: 12, fontWeight: filter === f.key ? 600 : 400,
                        color: filter === f.key ? "#000332" : "rgba(0,3,50,0.4)",
                        cursor: "pointer", fontFamily: "'Codec Pro',sans-serif",
                        transition: "all 0.15s",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* THOUGHTS VIEW */}
              {filter === "thoughts" ? (
                <div>
                  {themesLoading ? (
                    <div style={{ textAlign: "center", padding: "48px 0" }}>
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,144,144,0.2)", borderTopColor: "#FF9090", borderRadius: "50%", animation: "studioSpin 0.7s linear infinite", margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, color: "rgba(0,3,50,0.35)" }}>Organizing your thinking...</p>
                    </div>
                  ) : themes.length === 0 ? (
                    <p style={{ fontSize: 14, color: "rgba(0,3,50,0.35)", textAlign: "center", padding: "32px 0" }}>Not enough sessions to group yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {themes.map((theme) => {
                        const themeSessions = canvases.filter(c => theme.sessionIds.includes(c.id));
                        const isExpanded = expandedTheme === theme.label;
                        return (
                          <div key={theme.label}>
                            <button
                              onClick={() => setExpandedTheme(isExpanded ? null : theme.label)}
                              style={{
                                width: "100%", textAlign: "left", padding: "18px 20px",
                                background: "#fff", border: "1px solid rgba(0,3,50,0.06)", borderRadius: 14,
                                cursor: "pointer", fontFamily: "inherit",
                                transition: "box-shadow 0.2s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)")}
                              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 16, fontWeight: 700, color: "#000332", marginBottom: 2 }}>{theme.label}</div>
                                  <span style={{ fontSize: 12, color: "rgba(0,3,50,0.35)" }}>{themeSessions.length} session{themeSessions.length !== 1 ? "s" : ""}</span>
                                </div>
                                <span style={{ fontSize: 14, color: "rgba(0,3,50,0.2)", transform: isExpanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>&rsaquo;</span>
                              </div>
                              {!isExpanded && themeSessions.length > 0 && (
                                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                                  {themeSessions.slice(0, 2).map(s => (
                                    <p key={s.id} style={{ fontSize: 12, color: "rgba(0,3,50,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {s.goal}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </button>
                            {isExpanded && (
                              <div style={{ paddingLeft: 16, borderLeft: "2px solid rgba(0,3,50,0.06)", marginLeft: 12, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                                {themeSessions.map(c => {
                                  const m = MODE_META[c.mode] || MODE_META.clarity;
                                  return (
                                    <div
                                      key={c.id}
                                      className="studio-card"
                                      onClick={() => { const isMobile = window.innerWidth < 768; router.push(`/session/${isMobile ? "mobile-canvas" : "canvas"}?session_id=${c.id}`); }}
                                      style={{
                                        background: "#fff", borderRadius: 12, padding: "16px 18px",
                                        border: "1px solid rgba(0,3,50,0.04)", cursor: "pointer",
                                        transition: "transform 0.2s",
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                                      onMouseLeave={e => (e.currentTarget.style.transform = "")}
                                    >
                                      <div style={{ fontSize: 14, fontWeight: 600, color: "#000332", marginBottom: 4 }}>{c.goal || "Untitled"}</div>
                                      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "rgba(0,3,50,0.3)" }}>
                                        <span>{c.note_count || 0} notes</span>
                                        <span style={{ color: m.color }}>{m.icon}</span>
                                        <span>{formatDate(c.created_at)}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{
                  padding: "56px 32px", textAlign: "center",
                  border: "1.5px dashed rgba(0,3,50,0.1)", borderRadius: 16,
                }}>
                  <p style={{ fontSize: 15, color: "rgba(0,3,50,0.35)", fontWeight: 300 }}>
                    No canvases in this mode.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 14,
                }}>
                  {filtered.map((c, i) => {
                    const m = MODE_META[c.mode] || MODE_META.clarity;
                    return (
                      <div
                        key={c.id}
                        className="studio-card"
                        onClick={() => { if (deleteConfirm !== c.id) { const isMobile = window.innerWidth < 768; router.push(`/session/${isMobile ? "mobile-canvas" : "canvas"}?session_id=${c.id}`); } }}
                        style={{
                          background: "#fff", borderRadius: 16, padding: "24px 24px",
                          border: "1px solid rgba(0,3,50,0.06)",
                          transition: "transform 0.2s, box-shadow 0.2s",
                          cursor: "pointer",
                          animation: `studioFadeUp 0.4s ease ${0.05 * i}s forwards`,
                          opacity: 0, position: "relative",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                      >
                        {/* Delete icon */}
                        <button
                          className="card-del"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(deleteConfirm === c.id ? null : c.id); }}
                          style={{
                            position: "absolute", top: 10, right: 10, zIndex: 2,
                            background: "none", border: "none", fontSize: 14, color: "#94949E",
                            cursor: "pointer", opacity: 0, transition: "opacity 0.15s", padding: 4, lineHeight: 1,
                          }}
                        >×</button>
                        {/* Delete confirmation */}
                        {deleteConfirm === c.id && (
                          <div onClick={e => e.stopPropagation()} style={{
                            position: "absolute", inset: 0, zIndex: 3,
                            background: "rgba(255,255,255,0.95)", borderRadius: 16,
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                          }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#000332" }}>Delete this canvas?</p>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleDelete(c.id)} style={{ padding: "8px 20px", borderRadius: 100, border: "none", background: "#FF9090", color: "#000332", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "8px 20px", borderRadius: 100, border: "1px solid rgba(0,3,50,0.1)", background: "transparent", color: "#000332", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                            </div>
                          </div>
                        )}
                        <div style={{
                          height: 48, marginBottom: 14, position: "relative",
                          background: "rgba(0,3,50,0.02)", borderRadius: 8, overflow: "hidden",
                        }}>
                          <svg width="100%" height="48" style={{ position: "absolute", inset: 0 }}>
                            {[0, 1, 2, 3, 4].map((j) => (
                              <circle
                                key={j}
                                cx={30 + j * 50 + Math.random() * 20}
                                cy={12 + Math.random() * 24}
                                r={3 + Math.random() * 2}
                                fill={m.color}
                                opacity={0.3 + Math.random() * 0.4}
                              />
                            ))}
                          </svg>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", marginBottom: 6, lineHeight: 1.3 }}>
                          {c.goal || "Untitled canvas"}
                        </div>
                        {c.excerpt && (
                          <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontStyle: "italic", fontWeight: 300, lineHeight: 1.55, marginBottom: 10 }}>
                            {c.excerpt.length > 80 ? c.excerpt.slice(0, 80) + "..." : c.excerpt}
                          </p>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", gap: 10, fontSize: 11, color: "rgba(0,3,50,0.3)" }}>
                            <span>{c.note_count || 0} notes</span>
                            <span>{c.connection_count || 0} connections</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "rgba(0,3,50,0.25)" }}>{formatDate(c.created_at)}</span>
                            <span style={{ fontSize: 14, color: m.color }}>{m.icon}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ARC COMING SOON MODAL */}
      {arcModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setArcModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16, padding: "32px 32px",
              maxWidth: 440, width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            {arcSubmitted ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>&#10003;</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#000332", marginBottom: 4 }}>You&rsquo;re on the list.</p>
                <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontWeight: 300 }}>We&rsquo;ll let you know when thinking arcs are ready.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#000332", fontStyle: "italic", marginBottom: 12 }}>
                  Thinking arcs are coming soon.
                </h3>
                <p style={{ fontSize: 14, color: "rgba(0,3,50,0.55)", fontWeight: 300, lineHeight: 1.65, marginBottom: 24 }}>
                  An arc is a multi-day thinking journey for goals too big for one session &mdash; like building a product, repositioning a brand, or planning a career move. Want us to let you know when it&rsquo;s ready?
                </p>
                <input
                  type="email"
                  value={arcEmail}
                  onChange={(e) => setArcEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: "100%", padding: "12px 16px",
                    border: "1.5px solid rgba(0,3,50,0.1)", borderRadius: 10,
                    fontSize: 14, color: "#000332", outline: "none",
                    fontFamily: "inherit", marginBottom: 12,
                  }}
                />
                <button
                  onClick={handleArcWaitlist}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 100,
                    background: "#FF9090", color: "#000332", border: "none",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Notify me
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "#000332", color: "#FAF7F0", padding: "12px 24px", borderRadius: 100, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes studioFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .prompt-chip:hover {
          border-color: #FF9090 !important;
          background: rgba(255,144,144,0.04) !important;
        }
        @keyframes studioSpin { to { transform: rotate(360deg); } }
        .studio-card:hover .card-del { opacity: 0.5 !important; }
        .card-del:hover { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
