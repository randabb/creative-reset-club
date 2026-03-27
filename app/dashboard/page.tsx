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

const dailyPrompts: Record<string, string[]> = {
  fear: [
    "Tell me about the thing you keep not starting.",
    "How long have you been sitting with this without fully committing — and what has that time actually looked like?",
    "What are you actually afraid will happen if you fully commit to this?",
    "What are you protecting yourself from by not committing to this?",
    "Look at the fear you named this week. What evidence actually supports it — and what evidence from your own history contradicts it?",
    "Write your absolute worst case scenario in full, specific detail — and then examine it honestly.",
    "Looking at everything you've written this week — what thinking pattern has been running most of your fear?",
    "What would you make or build today if you knew with absolute certainty that no one would ever see it?",
    "What happened when you sat with your work or idea for twenty minutes with no agenda — not planning, not producing, just being present with it?",
    "Describe your artist's date — where you went, what you noticed, and what it stirred in you.",
    "What is the smallest, most real public move you could make today related to your work or idea — and what happens when you actually do it?",
    "Looking back at yesterday's move — what did reality actually deliver, and what does that tell you?",
    "What did a slightly bigger version of your move look like — and what did doing it teach you about yourself as a creative and builder?",
    "Write your declaration. What are you making or building, why does it matter to you, and what are you committing to from here?",
  ],
  ai: [
    "Write everything you know, think, feel, and half-believe about the thing you've been making or building — without stopping, without editing, without looking anything up.",
    "What is the core of what you're making or solving — described entirely in your own words, from your own understanding, without looking anything up?",
    "Describe the person you're making or building this for — in vivid, specific, human detail — entirely from what you already know or have observed.",
    "What do you bring to this work that no one else brings — and where did it come from?",
    "What job is someone actually hiring your work to do — and what does that reveal about what you're really making?",
    "What are you assuming to be true about your work or idea that you have never actually verified?",
    "Apply a constraint to your work or idea and follow where it leads: what if you could only share this with the first 100 people through one person you already know and trust?",
    "Write your positioning statement from scratch — who it's for, what already exists, what makes yours different, and why that difference matters.",
    "Write every reason someone might say no to your work, your offer, or your idea — and then examine each one honestly.",
    "Write the origin story of your work or idea — why this found you, what it felt like, and why you can't leave it alone.",
    "Write a one-page portrait of the person you're making for — everything you know about who they are, what they want, what they fear, and what would make them trust you.",
    "What exists in your field or market right now, what does it do well, where does it consistently fall short — and where does your work live in relation to all of that?",
    "Write the one-page context document that captures everything you've developed across this program — your thinking about your work, distilled.",
    "Use AI today — with everything you've developed as context — and document what's different about the experience.",
  ],
  overwhelmed: [
    "Write down every idea, direction, project, and creative possibility that is currently competing for your attention — every single one, without filtering.",
    "For each idea on your list — where did it actually come from? Which ones are genuinely yours, and which ones were handed to you?",
    "For every idea or creative project you've already started, explored, or abandoned — what happened, and what did the stopping tell you?",
    "What are you actually afraid of losing if you commit to one idea or creative direction and let the others go?",
    "For each idea on your list — what happens in your body and your thinking when you imagine actually working on it every day?",
    "Which idea on your list is most aligned with who you actually are — not who you're trying to be, or who others expect you to be?",
    "If you could only pursue five creative or business directions for the rest of your working life — what would they be? And then: if you could only pursue one?",
    "For the idea or ideas that survived your filters — does it solve a real problem or serve a real need that real people are actively experiencing?",
    "Describe the specific person your surviving idea or creative work is for — in enough detail that someone who read this could recognise them.",
    "What would you actually have to give up, endure, and commit to if you chose this idea fully — and are you genuinely willing?",
    "Write a letter to the creative ideas and directions you're letting go — what they meant to you, why you're releasing them, and what you want them to know.",
    "Write your commitment statement — what you're choosing, why you're choosing it, what you're giving up, and what you're committing to do.",
    "What is the first real, concrete move that makes your creative choice a fact rather than a thought — and what happened when you made it?",
    "Write your declaration — what you chose, what it cost you, what you learned, and who you are in relation to this idea now.",
  ],
  blank: [
    "When did your creative energy go quiet — and what was happening in your life and your work when it did?",
    "What have you been outputting — creating, producing, performing, managing, delivering — without adequately refilling?",
    "What have you been avoiding making or building — and what does that avoidance protect you from?",
    "What does the creative blank actually feel like in your body — and where do you feel it when you sit down to make something?",
    "Describe your attention walk — where you went, what you noticed, and what it was like to pay attention deliberately.",
    "Describe your artist's date — where you went, what you experienced, and what it did to your creative temperature.",
    "Write down everything beautiful you encountered today in your world — in as much sensory detail as you can.",
    "Make something terrible today — in any medium, any form — and write about what it was like to make without trying to make it good.",
    "Make something in a creative medium you've never used before — and write about what being a complete beginner felt like.",
    "Make something in ten minutes using only what is physically in front of you right now — no AI, no references, no looking anything up — and write about what came out.",
    "Write badly for fifteen minutes — whatever comes, without stopping, without editing, without rereading, without wondering if AI could do it better — and then write about what came out.",
    "What is the smallest possible version of the creative work or project you've been avoiding — and what happened when you actually did it?",
    "Show one small thing you've made during this program to one person — a creative peer, a trusted friend — and write about what it felt like to show it.",
    "Write your recommitment — what you're returning to as a creative or builder, what you understand now that you didn't when you started, and how you'll keep the well from going empty again.",
  ],
};

function calculateStreak(submissions: { submitted_at: string }[]): number {
  if (!submissions.length) return 0;

  const uniqueDays = [...new Set(
    submissions.map(s => {
      const d = new Date(s.submitted_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  )].map(key => {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m, d);
    date.setHours(0, 0, 0, 0);
    return date;
  }).sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let check = today;
  for (const date of uniqueDays) {
    const diff = (check.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1) {
      streak++;
      check = date;
    } else {
      break;
    }
  }
  return streak;
}

export default function Dashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [matchedProgram, setMatchedProgram] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState(0);
  const [streak, setStreak] = useState(0);
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
          .select("day_number, submitted_at")
          .eq("user_id", user.id)
          .eq("program_id", mp);

        if (submissions && submissions.length > 0) {
          setCompletedDays(submissions.length);
          setStreak(calculateStreak(submissions));
        }
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
  const totalDays = 14;
  const currentDay = Math.min(completedDays + 1, totalDays);
  const isComplete = completedDays >= totalDays;
  const todayPrompt = matchedProgram && dailyPrompts[matchedProgram]
    ? dailyPrompts[matchedProgram][currentDay - 1]
    : null;

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

          <h1 style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#000332", marginBottom: 8, whiteSpace: "nowrap" }}>
            welcome{firstName ? `, ${firstName.toLowerCase()}` : ""}.
          </h1>

          {streak > 0 && (
            <p style={{ fontSize: 14, color: "rgba(0,3,50,0.5)", marginBottom: 28 }}>
              🔥 {streak} day streak
            </p>
          )}

          {!streak && <div style={{ marginBottom: 28 }} />}

          {matched ? (
            <div style={{
              background: "#000332", borderRadius: 24, padding: "44px 48px",
              maxWidth: 560, position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(255,144,144,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />

              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ff9090", marginBottom: 16, position: "relative" }}>
                your program
              </p>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#f4f2ee", marginBottom: 20, position: "relative" }}>
                {matched.title}
              </h2>

              {/* PROGRESS BAR */}
              <div style={{ marginBottom: 24, position: "relative" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(244,242,238,0.5)", marginBottom: 8 }}>
                  {isComplete ? "14 of 14 days complete" : `day ${currentDay} of ${totalDays}`}
                </p>
                <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99 }}>
                  <div style={{ height: 4, background: "#ff9090", borderRadius: 99, transition: "width 0.4s ease", width: `${(completedDays / totalDays) * 100}%` }} />
                </div>
              </div>

              {/* TODAY'S PROMPT or COMPLETION */}
              {isComplete ? (
                <div style={{ padding: "16px 20px", background: "rgba(244,242,238,0.06)", borderRadius: 12, marginBottom: 24, position: "relative" }}>
                  <p style={{ fontSize: 13, color: "#ff9090", fontWeight: 700, marginBottom: 4 }}>program complete</p>
                  <p style={{ fontSize: 13, color: "rgba(244,242,238,0.55)", lineHeight: 1.6 }}>
                    you showed up for 14 days. that matters more than you think.
                  </p>
                </div>
              ) : todayPrompt ? (
                <div style={{ padding: "16px 20px", background: "rgba(244,242,238,0.06)", borderRadius: 12, marginBottom: 24, position: "relative" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,242,238,0.35)", marginBottom: 8 }}>today&apos;s prompt</p>
                  <p style={{ fontSize: 14, color: "rgba(244,242,238,0.7)", lineHeight: 1.55, fontStyle: "italic" }}>
                    &ldquo;{todayPrompt.length > 80 ? todayPrompt.slice(0, 80) + "..." : todayPrompt}&rdquo;
                  </p>
                </div>
              ) : null}

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
                {isComplete ? "revisit program →" : completedDays > 0 ? "continue →" : "start program →"}
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
