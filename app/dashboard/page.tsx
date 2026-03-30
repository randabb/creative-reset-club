"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const programs: Record<string, { title: string; subtitle: string; description: string }> = {
  empty_the_head: {
    title: "Empty the Head",
    subtitle: "14 days · Phase 1: Clear",
    description: "Too many things competing at once. This track starts by clearing space.",
  },
  make_it_yours: {
    title: "Make It Yours",
    subtitle: "14 days · Phase 1: Notice",
    description: "You're still producing. But it stopped feeling like yours. This track is about making something with no audience in mind.",
  },
  reignite: {
    title: "Reignite",
    subtitle: "14 days · Phase 1: Remember",
    description: "It's not gone. It's just been quiet for a while. This track is about finding your way back.",
  },
  refill: {
    title: "Refill",
    subtitle: "14 days · Phase 1: Diagnose",
    description: "You've been giving out more than you've been taking in. This track starts with restoring.",
  },
  move_it_forward: {
    title: "Move It Forward",
    subtitle: "14 days · Phase 1: Name It",
    description: "The thinking is there. The movement isn't. This track breaks the cycle.",
  },
  one_thing: {
    title: "One Thing at a Time",
    subtitle: "14 days · Phase 1: Choose",
    description: "Something keeps stopping you. This track creates the conditions to finally move.",
  },
};

const dailyPrompts: Record<string, string[]> = {
  empty_the_head: [
    "Write down everything that's currently living in your head. Every task, worry, idea, obligation, and half-thought. Don't organize. Just dump.",
    "Look at your list. What's actually urgent and what just feels urgent? Mark the difference.",
    "What recurring thoughts show up every day that you never actually resolve or act on?",
    "What on your list can you drop entirely without real consequences? Give yourself permission.",
    "For each remaining item, does it give you energy or take it? Be honest.",
    "One thread on your list pulls harder than the others. Which one is it?",
    "Apply a constraint: if you could only work on three things this week, what would they be?",
    "Design a simple filter for deciding what gets your attention and what doesn't.",
    "Write for 15 minutes first thing tomorrow before checking anything. What comes up?",
    "Block one hour today for deep work on the one thing that matters most. What happened?",
    "Check in: is the noise quieter? What signals are you hearing now that you couldn't before?",
    "Build a simple daily system for keeping your head clear. What does it look like?",
    "Test your system for a full week. What worked and what didn't?",
    "What stayed after all the clearing? That's what actually matters to you.",
  ],
  make_it_yours: [
    "Who have you been making for? List every audience, client, follower, or expectation that shapes your work.",
    "Audit the last month of your creative output. How much of it was for someone else's approval?",
    "If no one would ever see it, what would you actually want to make right now?",
    "Write yourself a permission slip. What are you giving yourself permission to create without justification?",
    "What does your real voice sound like when you're not performing for anyone?",
    "Make something today that you would never show anyone. Describe the experience.",
    "Create without a brief, a purpose, or a plan. Just follow what feels interesting for 30 minutes.",
    "Write or make the selfish version. The one that only you would love.",
    "What's the thing you do that nobody else does quite like you? Name it.",
    "Make the honest version of what you've been working on. No polish. Just truth.",
    "Show one person the thing you made this week. What was that like?",
    "Declare what you're making and why it matters to you. Not to anyone else. To you.",
    "Make the thing again, but more. Push it further in the direction only you would take it.",
    "What's yours now that wasn't yours two weeks ago?",
  ],
  reignite: [
    "Think back to a time when creative work felt easy. What was different about your life then?",
    "What changed between then and now? Be specific about what shifted.",
    "There's a thread you dropped somewhere along the way. Can you name it?",
    "What do you miss most about the way you used to think or create?",
    "Do one small creative thing today. It doesn't matter what. Just start.",
    "Take a 20-minute walk with no headphones. Notice 10 things you'd normally walk past.",
    "Make something deliberately bad. The goal is quantity and speed, not quality.",
    "Follow one curiosity today wherever it leads. Don't judge it. Just follow.",
    "Design a tiny daily ritual that reconnects you to creative thinking. What is it?",
    "Spend 30 minutes going deep on the thing that pulled you in yesterday.",
    "What feels alive right now? What topic, question, or idea has energy in it?",
    "Build your new routine around what you discovered this week. Keep it small.",
    "Commit to the practice for the next month. Write what you're committing to and why.",
    "You came back. How does it feel to be here again?",
  ],
  refill: [
    "Map your depletion. Where is your energy going? Be specific about every drain.",
    "Trace where it went. When did you start running on empty? What was the trigger?",
    "What drains you most? Name the activities, people, and habits that take without giving back.",
    "Describe what empty feels like. Not metaphorically. In your body, your thinking, your motivation.",
    "Do nothing creative today. Literally nothing. Just rest. Write about what that was like.",
    "Spend today only on inputs. Read, watch, listen, absorb. Don't produce anything.",
    "Do something purely for pleasure today. No productivity angle. No self-improvement. Just joy.",
    "Take a slow morning. No alarms, no agenda, no screens for the first hour. What happens?",
    "Notice one beautiful thing today and sit with it for longer than feels comfortable.",
    "Try something you've never tried before. Be a complete beginner. Write about it.",
    "Before you give anything to anyone else today, give something to yourself first.",
    "Name your boundaries. What are you no longer willing to give away for free?",
    "Design a sustainable rhythm. When do you create? When do you rest? Write it down.",
    "The well is fuller than it was. What did it take? What will you protect?",
  ],
  move_it_forward: [
    "Describe the loop you're stuck in. What keeps repeating? Be specific.",
    "What thought, fear, or pattern shows up every time you try to move forward?",
    "Name the real block. Not the excuse. The actual thing stopping you.",
    "If someone could wave a magic wand and remove one obstacle, what would it be?",
    "What's the smallest possible step you could take today? Take it. Write what happened.",
    "Do the thing wrong. Deliberately. Make the worst version. Ship it to no one.",
    "Set a timer for 5 minutes and work on the thing. Stop when the timer stops. What came out?",
    "Check your momentum. Are you moving? Even a little? What's different from day one?",
    "Write the ugliest first draft of the thing you've been avoiding. No editing allowed.",
    "Ship something small to one person today. A draft, a sketch, a paragraph. Anything real.",
    "Ask one person for honest feedback on what you made. Write down what they said.",
    "Share what you're working on publicly. Even a single sentence. Build in the open.",
    "The final push. What needs to happen to call this done? Write the list and start.",
    "You made something. It exists in the world now. What did it take to get here?",
  ],
  one_thing: [
    "Name the thing. The one you keep coming back to. The one that won't leave you alone.",
    "Why this one? What makes it different from every other idea you've had?",
    "What are you avoiding about it? Be honest about the resistance.",
    "What's the cost of not doing it? Not someday. Right now. What are you losing?",
    "Give it the first hour of your day tomorrow. Protect that hour. What happened?",
    "Remove the escape hatches. What distractions do you reach for when it gets hard?",
    "Make this the daily non-negotiable. 15 minutes minimum. No exceptions. What shifted?",
    "Today will be hard. You'll want to stop. Write about what happened when you didn't.",
    "Protect the work from interruption today. What did you have to say no to?",
    "Say no to everything else today. Just this one thing. Nothing else gets your energy.",
    "You're halfway through. Check in: is this still the thing? What do you know now?",
    "Push through the part where it stops being fun. That's where the real work is.",
    "The home stretch. What would it take to finish this in the next 48 hours?",
    "You built the thing. It's real. Write about what you made and who you became making it.",
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
          other tracks
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
                your track
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
                  <p style={{ fontSize: 13, color: "#ff9090", fontWeight: 700, marginBottom: 4 }}>track complete</p>
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
                {isComplete ? "revisit track →" : completedDays > 0 ? "continue →" : "start track →"}
              </a>
            </div>
          ) : (
            <div style={{
              background: "#000332", borderRadius: 24, padding: "44px 48px",
              maxWidth: 560, position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(255,144,144,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />
              <p style={{ fontSize: 15, color: "rgba(244,242,238,0.7)", lineHeight: 1.7, marginBottom: 24, position: "relative" }}>
                find out which track is right for you.
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

          {/* TEMP: Clear all data button for testing */}
          <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid rgba(0,3,50,0.08)" }}>
            <button
              onClick={async () => {
                if (!user) return;
                if (!confirm("This will permanently delete all your track progress, writing, and voice notes. Are you sure?")) return;
                // Clear localStorage keys for this user
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith("crc-" + user.id)) keysToRemove.push(key);
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                // Also clear any legacy non-uid-scoped keys
                const legacyPrefixes = ["crc-ri", "crc-mif", "crc-ot", "crc-rf", "crc-miy", "crc-eth", "crc-timestamps", "crc-kg-response"];
                const legacyKeys: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && legacyPrefixes.some(p => key.startsWith(p))) legacyKeys.push(key);
                }
                legacyKeys.forEach(k => localStorage.removeItem(k));
                // Delete all day_submissions for this user
                await supabase.from("day_submissions").delete().eq("user_id", user.id);
                alert("All data cleared. Reloading...");
                window.location.reload();
              }}
              style={{
                background: "none", border: "1px solid rgba(0,3,50,0.15)",
                borderRadius: 8, padding: "10px 18px",
                fontFamily: "'Codec Pro',sans-serif", fontSize: 12,
                color: "rgba(0,3,50,0.4)", cursor: "pointer",
              }}
            >
              clear all data (testing only)
            </button>
          </div>

        </main>
      </div>
    </>
  );
}
