"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const programs: Record<string, { title: string; subtitle: string; description: string }> = {
  fear: {
    title: "Fear to First Move",
    subtitle: "14 days · Phase 1: Name It",
    description: "You already know what you want. This program helps you move toward it.",
  },
  ai: {
    title: "Think Before You Build",
    subtitle: "14 days · Phase 1: Excavate",
    description: "Your best thinking, before AI gets to it.",
  },
  overwhelmed: {
    title: "From Many to One",
    subtitle: "14 days · Phase 1: Empty the Head",
    description: "Too many directions. This program helps you choose one and mean it.",
  },
  blank: {
    title: "Back to the Well",
    subtitle: "14 days · Phase 1: Diagnose",
    description: "The creativity didn't leave. This program helps you find it again.",
  },
};

export default function Dashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [matchedProgram, setMatchedProgram] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("matched_program, username")
        .eq("id", user.id)
        .single();

      const mp = profile?.matched_program ?? null;
      const meta = (user as unknown as { user_metadata?: Record<string, string> }).user_metadata;
      const name = profile?.username ?? meta?.username ?? null;
      if (name) setFirstName(name.split(" ")[0]);
      setMatchedProgram(mp);

      if (mp) {
        const { data: submissions } = await supabase
          .from("day_submissions")
          .select("day_number")
          .eq("user_id", user.id)
          .eq("program_id", mp)
          .limit(1);

        setHasStarted(!!submissions && submissions.length > 0);
      }

      setLoading(false);
    };
    load();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f4f2ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
    </div>
  );

  const matched = matchedProgram && programs[matchedProgram] ? programs[matchedProgram] : null;
  const otherPrograms = Object.entries(programs).filter(([id]) => id !== matchedProgram);

  const sidebarContent = (
    <>
      <div style={{ padding: "0 28px", marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "lowercase", color: "#f4f2ee" }}>
          creativeresetclub
        </div>
        <button
          className="drawer-close"
          onClick={() => setMenuOpen(false)}
          style={{ background: "none", border: "none", color: "rgba(244,242,238,0.5)", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <a
          href="/dashboard"
          onClick={() => setMenuOpen(false)}
          style={{
            display: "block", padding: "10px 12px",
            borderRadius: 10, textDecoration: "none",
            fontSize: 13, fontWeight: 700, color: "rgba(244,242,238,0.65)",
          }}
        >
          ← Home
        </a>
      </div>

      <div style={{ padding: "0 16px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(244,242,238,0.3)", padding: "0 12px", marginBottom: 10 }}>
          other programs
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {otherPrograms.map(([id, p]) => (
            <a
              key={id}
              href={`/program/${id}`}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block", padding: "10px 12px",
                borderRadius: 10, textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(244,242,238,0.65)" }}>{p.title}</p>
            </a>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 28px" }}>
        <p style={{ fontSize: 12, color: "rgba(244,242,238,0.35)", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
        <button
          onClick={signOut}
          style={{
            background: "none", border: "1px solid rgba(244,242,238,0.15)",
            padding: "8px 18px", borderRadius: 100,
            fontFamily: "'Codec Pro',sans-serif", fontSize: 11,
            fontWeight: 700, color: "rgba(244,242,238,0.5)", cursor: "pointer",
            width: "100%",
          }}
        >
          sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Codec Pro';
          src: url('/fonts/codec-pro_regular.ttf') format('truetype');
          font-weight: 400 700;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#f4f2ee; font-family:'Codec Pro',sans-serif; }

        .sidebar-desktop {
          width: 260px; flex-shrink: 0;
          background: #000332;
          display: flex; flex-direction: column;
          padding: 32px 0;
          position: fixed; top: 0; left: 0; bottom: 0;
        }
        .sidebar-desktop .drawer-close { display: none; }
        .mobile-topbar { display: none; }
        .main-content { margin-left: 260px; }

        .drawer-backdrop {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(0,3,50,0.5);
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .drawer-backdrop.open {
          opacity: 1; pointer-events: auto;
        }
        .drawer-panel {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 280px; z-index: 301;
          background: #000332;
          display: flex; flex-direction: column;
          padding: 32px 0;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }
        .drawer-panel.open {
          transform: translateX(0);
        }

        @media (max-width: 768px) {
          .sidebar-desktop { display: none; }
          .mobile-topbar {
            display: flex;
            align-items: center;
            padding: 16px 20px;
            gap: 12px;
            background: #000332;
            position: sticky;
            top: 0;
            z-index: 200;
          }
          .main-content {
            margin-left: 0;
            padding: 24px 24px 80px !important;
            min-height: auto !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>

      {/* MOBILE TOPBAR */}
      <nav className="mobile-topbar">
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            background: "none", border: "none", color: "#f4f2ee",
            fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1,
          }}
        >
          ☰
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "lowercase" as const, color: "#f4f2ee" }}>
          creativeresetclub
        </span>
      </nav>

      {/* MOBILE DRAWER BACKDROP */}
      <div
        className={`drawer-backdrop ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* MOBILE DRAWER PANEL */}
      <aside className={`drawer-panel ${menuOpen ? "open" : ""}`}>
        {sidebarContent}
      </aside>

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* DESKTOP SIDEBAR */}
        <aside className="sidebar-desktop">
          {sidebarContent}
        </aside>

        {/* MAIN CONTENT */}
        <main className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px 100px", minHeight: "100vh" }}>

          <h1 style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#000332", marginBottom: 36, whiteSpace: "nowrap" }}>
            welcome{firstName ? `, ${firstName.toLowerCase()}` : ""}.
          </h1>

          {matched ? (
            <div style={{
              background: "#000332", borderRadius: 24, padding: "44px 48px",
              maxWidth: 560, position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(255,144,144,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />

              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ff9090", marginBottom: 16, position: "relative" }}>
                your program
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,242,238,0.4)", marginBottom: 12, position: "relative" }}>
                {matched.subtitle}
              </p>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#f4f2ee", marginBottom: 12, position: "relative" }}>
                {matched.title}
              </h2>
              <p style={{ fontSize: 15, color: "rgba(244,242,238,0.6)", lineHeight: 1.7, marginBottom: 32, position: "relative" }}>
                {matched.description}
              </p>
              <a
                href={`/program/${matchedProgram}`}
                style={{
                  display: "inline-block",
                  background: "#ff9090", color: "#000332",
                  padding: "16px 32px", borderRadius: 100,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                  position: "relative",
                }}
              >
                {hasStarted ? "continue →" : "start program →"}
              </a>
            </div>
          ) : (
            <div style={{
              background: "#000332", borderRadius: 24, padding: "44px 48px",
              maxWidth: 560, position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(255,144,144,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />
              <p style={{ fontSize: 15, color: "rgba(244,242,238,0.7)", lineHeight: 1.7, marginBottom: 24, position: "relative" }}>
                find out which program is right for you.
              </p>
              <a
                href="/"
                style={{
                  display: "inline-block",
                  background: "#ff9090", color: "#000332",
                  padding: "16px 32px", borderRadius: 100,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                  position: "relative",
                }}
              >
                take the quiz →
              </a>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
