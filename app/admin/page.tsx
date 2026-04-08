"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const MODE_COLORS: Record<string, string> = {
  clarity: "#6B8AFE", expansion: "#FF9090", decision: "#7ED6A8", expression: "#C4A6FF",
};
const DIM_COLORS = ["#FF9090", "#6B8AFE", "#7ED6A8", "#C4A6FF", "#E8C97A"];

interface Session {
  id: string;
  user_id: string;
  user_name: string;
  goal: string;
  mode: string;
  qas: { question: string; answer: string }[];
  dimensions: { label: string; description: string }[];
  canvas_state: {
    notes?: { id: string; text: string; source?: string; dimLabel?: string; promptQuestion?: string }[];
    discoveries?: { text: string; dimLabel: string; createdAt: string }[];
    patterns?: { label: string; behavior?: string; question?: string; suggestedAction?: string; description?: string }[];
    dimQAs?: Record<string, { question: string; answer: string; action?: string }[]>;
  };
  synthesis: { deliverable_label: string; sections: { heading: string; content: string }[]; thinking_approaches?: string } | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
  note_count: number;
  discovery_count: number;
  pattern_count: number;
  has_synthesis: boolean;
}

interface Stats {
  totalSessions: number;
  totalUsers: number;
  todaySessions: number;
  avgNotes: number;
  synthRate: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      try {
        const res = await fetch(`/api/admin?userId=${user.id}`);
        if (res.status === 403 || res.status === 401) { router.push("/studio"); return; }
        const data = await res.json();
        if (data.error) { router.push("/studio"); return; }
        setSessions(data.sessions || []);
        setStats(data.stats || null);
      } catch { router.push("/studio"); }
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading admin...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F0", fontFamily: "'Codec Pro',sans-serif", color: "#000332" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(0,3,50,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>primer admin</div>
        <button onClick={() => router.push("/studio")} style={{ background: "none", border: "none", fontSize: 13, color: "rgba(0,3,50,0.4)", cursor: "pointer", fontFamily: "inherit" }}>&larr; back to studio</button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: "flex", gap: 32, padding: "20px 32px", borderBottom: "1px solid rgba(0,3,50,0.06)" }}>
          {[
            { label: "SESSIONS", value: stats.totalSessions },
            { label: "USERS", value: stats.totalUsers },
            { label: "TODAY", value: stats.todaySessions },
            { label: "AVG NOTES", value: stats.avgNotes },
            { label: "SYNTH RATE", value: `${stats.synthRate}%` },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(0,3,50,0.35)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 700, color: "#000332" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Session List */}
      <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
        {sessions.map(s => (
          <div key={s.id} style={{ marginBottom: 12 }}>
            {/* Card */}
            <div
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              style={{
                background: "#fff", borderRadius: 12, padding: "16px 20px",
                cursor: "pointer", border: "1px solid rgba(0,3,50,0.06)",
                transition: "box-shadow 0.2s",
                boxShadow: expanded === s.id ? "0 4px 16px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,3,50,0.45)" }}>{s.user_name}</span>
                    <span style={{
                      fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                      color: MODE_COLORS[s.mode] || "#FF9090", background: `${MODE_COLORS[s.mode] || "#FF9090"}15`,
                      padding: "2px 8px", borderRadius: 100,
                    }}>{s.mode.toUpperCase()}</span>
                    {s.has_synthesis && <span style={{ color: "#7ED6A8", fontSize: 12 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#000332", lineHeight: 1.4 }}>{s.goal || "Untitled"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700 }}>{s.note_count}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(0,3,50,0.3)", letterSpacing: "0.1em" }}>NOTES</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700 }}>{s.discovery_count}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(0,3,50,0.3)", letterSpacing: "0.1em" }}>DISC</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700 }}>{s.pattern_count}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(0,3,50,0.3)", letterSpacing: "0.1em" }}>PAT</div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(0,3,50,0.3)" }}>{formatDate(s.created_at)}</div>
                </div>
              </div>
            </div>

            {/* Expanded View */}
            {expanded === s.id && (
              <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", borderTop: "1px solid rgba(0,3,50,0.04)", padding: "28px 28px 36px" }}>

                {/* GOAL */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(0,3,50,0.35)", marginBottom: 8 }}>GOAL</div>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#000332", lineHeight: 1.4 }}>{s.goal}</p>
                </div>

                {/* GUIDED THINKING */}
                {s.qas?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(0,3,50,0.35)", marginBottom: 12 }}>GUIDED THINKING</div>
                    {s.qas.map((qa, i) => (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 13, color: "rgba(0,3,50,0.4)", fontStyle: "italic", marginBottom: 4, lineHeight: 1.5 }}>{qa.question}</p>
                        <p style={{ fontSize: 15, color: "#000332", fontWeight: 500, lineHeight: 1.6 }}>{qa.answer}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* DIMENSIONS */}
                {s.dimensions?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(0,3,50,0.35)", marginBottom: 12 }}>DIMENSIONS</div>
                    {s.dimensions.map((dim, di) => {
                      const color = DIM_COLORS[di % DIM_COLORS.length];
                      const dimQAs = s.canvas_state?.dimQAs?.[dim.label] || [];
                      const dimDiscoveries = (s.canvas_state?.discoveries || []).filter(d => d.dimLabel === dim.label);
                      return (
                        <div key={di} style={{ marginBottom: 24, borderLeft: `3px solid ${color}`, paddingLeft: 16 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#000332", marginBottom: 4 }}>{dim.label}</div>
                          <div style={{ fontSize: 12, color: "rgba(0,3,50,0.4)", marginBottom: 12 }}>{dim.description}</div>
                          {dimQAs.map((qa, qi) => {
                            // Find discovery for this QA
                            const disc = dimDiscoveries[qi];
                            return (
                              <div key={qi} style={{ marginBottom: 14 }}>
                                <p style={{ fontSize: 12, color: "rgba(0,3,50,0.35)", fontStyle: "italic", marginBottom: 3, lineHeight: 1.5 }}>{qa.question}</p>
                                <p style={{ fontSize: 14, color: "#000332", lineHeight: 1.6, marginBottom: disc ? 6 : 0 }}>{qa.answer}</p>
                                {disc && (
                                  <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10, marginTop: 4 }}>
                                    <p style={{ fontSize: 13, color, fontStyle: "italic", lineHeight: 1.5 }}>{disc.text}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {dimQAs.length === 0 && (
                            <p style={{ fontSize: 12, color: "rgba(0,3,50,0.25)", fontStyle: "italic" }}>No answers in this dimension</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PATTERNS */}
                {(s.canvas_state?.patterns?.length || 0) > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(0,3,50,0.35)", marginBottom: 12 }}>PATTERNS DETECTED</div>
                    {s.canvas_state!.patterns!.map((p, pi) => (
                      <div key={pi} style={{
                        border: "1.5px dashed rgba(0,3,50,0.15)", borderRadius: 8,
                        padding: "12px 16px", marginBottom: 8,
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#000332", marginBottom: 4 }}>{p.label}</div>
                        <p style={{ fontSize: 13, color: "rgba(0,3,50,0.6)", lineHeight: 1.5 }}>
                          {p.behavior || p.description}
                        </p>
                        {p.question && (
                          <p style={{ fontSize: 13, color: "rgba(0,3,50,0.5)", fontStyle: "italic", marginTop: 4 }}>{p.question}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* SYNTHESIS */}
                {s.synthesis && s.synthesis.sections && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(0,3,50,0.35)", marginBottom: 12 }}>SYNTHESIS</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontStyle: "italic", color: "#000332", marginBottom: 16 }}>{s.synthesis.deliverable_label}</div>
                    {s.synthesis.sections.map((sec, si) => (
                      <div key={si} style={{ borderLeft: `3px solid ${MODE_COLORS[s.mode] || "#FF9090"}`, paddingLeft: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#000332", marginBottom: 3 }}>{sec.heading}</div>
                        <p style={{ fontSize: 14, color: "rgba(0,3,50,0.7)", lineHeight: 1.6 }}>{sec.content}</p>
                      </div>
                    ))}
                    {s.synthesis.thinking_approaches && (
                      <p style={{ fontSize: 12, color: "rgba(0,3,50,0.4)", fontStyle: "italic", marginTop: 8, lineHeight: 1.5 }}>{s.synthesis.thinking_approaches}</p>
                    )}
                  </div>
                )}

                {/* CONFIDENCE */}
                {s.confidence_score && (
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(0,3,50,0.35)", marginBottom: 8 }}>CONFIDENCE</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} style={{
                          width: 20, height: 20, borderRadius: "50%",
                          border: "1.5px solid rgba(0,3,50,0.15)",
                          background: n <= s.confidence_score! ? "#FF9090" : "transparent",
                        }} />
                      ))}
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(0,3,50,0.35)", marginLeft: 8 }}>
                        {s.confidence_score}/5
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
