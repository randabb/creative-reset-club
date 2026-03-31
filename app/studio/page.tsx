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

interface ArcItem {
  id: string;
  outcome: string;
  mode: Mode;
  current_day: number;
  total_days: number;
  phase: string;
  last_reflection: string;
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

export default function Studio() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [arcs, setArcs] = useState<ArcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Mode>("all");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const meta = (user as unknown as { user_metadata?: Record<string, string> }).user_metadata;
      const name = profile?.username ?? meta?.username ?? user.email?.split("@")[0] ?? "";
      setFirstName(name.split(" ")[0]);

      // Fetch canvases (sessions table) — gracefully handle missing table
      try {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, goal, excerpt, mode, note_count, connection_count, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (sessions) setCanvases(sessions as CanvasItem[]);
      } catch { /* table may not exist yet */ }

      // Fetch arcs — gracefully handle missing table
      try {
        const { data: arcData } = await supabase
          .from("arcs")
          .select("id, outcome, mode, current_day, total_days, phase, last_reflection")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });
        if (arcData) setArcs(arcData as ArcItem[]);
      } catch { /* table may not exist yet */ }

      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    );
  }

  const filtered = filter === "all" ? canvases : canvases.filter((c) => c.mode === filter);

  const filters: { key: "all" | Mode; label: string }[] = [
    { key: "all", label: "All" },
    { key: "clarity", label: "◎ Clarity" },
    { key: "expansion", label: "✦ Expansion" },
    { key: "decision", label: "⟁ Decision" },
    { key: "expression", label: "◈ Expression" },
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
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px 80px" }}>
        {/* GREETING */}
        <div style={{ marginBottom: 40, animation: "studioFadeUp 0.5s ease forwards", opacity: 0 }}>
          <h1 style={{
            fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 400,
            color: "#000332", fontStyle: "italic", letterSpacing: "-0.02em",
            lineHeight: 1.2, marginBottom: 8,
          }}>
            Good {getGreeting()}, {firstName || "there"}.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(0,3,50,0.45)", fontWeight: 300 }}>
            Your studio has {canvases.length} canvas{canvases.length !== 1 ? "es" : ""} and {arcs.length} active arc{arcs.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {/* ACTION BUTTONS */}
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
          <Link href="/arc/new" style={{
            flex: 1, minWidth: 240, padding: "28px 28px",
            background: "transparent", border: "1.5px dashed rgba(0,3,50,0.15)", borderRadius: 16,
            textDecoration: "none", transition: "transform 0.2s, box-shadow 0.2s",
            display: "block",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#000332", fontStyle: "italic", marginBottom: 4 }}>New arc</div>
            <div style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontWeight: 300 }}>Work toward something bigger, over days</div>
          </Link>
        </div>

        {/* ACTIVE ARCS */}
        {arcs.length > 0 && (
          <div style={{ marginBottom: 56, animation: "studioFadeUp 0.5s ease 0.2s forwards", opacity: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF9090", animation: "arcDotPulse 2s ease-in-out infinite" }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#000332" }}>Active arcs</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {arcs.map((arc) => {
                const m = MODE_META[arc.mode] || MODE_META.clarity;
                const pct = arc.total_days > 0 ? (arc.current_day / arc.total_days) * 100 : 0;
                return (
                  <div key={arc.id} style={{
                    background: "#fff", borderRadius: 16, padding: "28px 28px",
                    border: `1.5px solid ${m.color}22`, transition: "transform 0.2s, box-shadow 0.2s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#000332", marginBottom: 4 }}>{arc.outcome}</div>
                        <div style={{ fontSize: 12, color: m.color, fontWeight: 600 }}>{m.icon} {m.label} · {arc.phase}</div>
                      </div>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        border: `3px solid ${m.color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: m.color,
                      }}>
                        {arc.current_day}/{arc.total_days}
                      </div>
                    </div>
                    <div style={{ height: 3, background: "rgba(0,3,50,0.06)", borderRadius: 2, marginBottom: 16 }}>
                      <div style={{ height: 3, background: m.color, borderRadius: 2, width: `${pct}%`, transition: "width 0.4s" }} />
                    </div>
                    {arc.last_reflection && (
                      <p style={{ fontSize: 13, color: "rgba(0,3,50,0.5)", fontStyle: "italic", fontWeight: 300, lineHeight: 1.6, marginBottom: 16 }}>
                        &ldquo;{arc.last_reflection.length > 100 ? arc.last_reflection.slice(0, 100) + "..." : arc.last_reflection}&rdquo;
                      </p>
                    )}
                    <button style={{
                      background: m.color, color: "#000332", border: "none",
                      padding: "10px 24px", borderRadius: 100, fontSize: 13,
                      fontWeight: 700, cursor: "pointer", fontFamily: "'Codec Pro',sans-serif",
                    }}>
                      Continue Day {arc.current_day}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CANVASES */}
        <div style={{ animation: "studioFadeUp 0.5s ease 0.3s forwards", opacity: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#000332" }}>Your canvases</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
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

          {filtered.length === 0 ? (
            <div style={{
              padding: "56px 32px", textAlign: "center",
              border: "1.5px dashed rgba(0,3,50,0.1)", borderRadius: 16,
            }}>
              <p style={{ fontSize: 15, color: "rgba(0,3,50,0.35)", fontWeight: 300, marginBottom: 8 }}>
                {canvases.length === 0 ? "No canvases yet." : "No canvases in this mode."}
              </p>
              {canvases.length === 0 && (
                <p style={{ fontSize: 13, color: "rgba(0,3,50,0.25)", fontWeight: 300 }}>
                  Start one to see your thinking take shape.
                </p>
              )}
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
                    style={{
                      background: "#fff", borderRadius: 16, padding: "24px 24px",
                      border: "1px solid rgba(0,3,50,0.06)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: "pointer",
                      animation: `studioFadeUp 0.4s ease ${0.05 * i}s forwards`,
                      opacity: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    {/* Mini spatial thumbnail */}
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
      </div>

      <style>{`
        @keyframes studioFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes arcDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
