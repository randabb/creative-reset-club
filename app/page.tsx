"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const programNames: Record<string, string> = {
  ai: "Think Before You Build",
  overwhelmed: "From Many to One",
  fear: "Fear to First Move",
  blank: "Back to the Well",
};

const openingLines: Record<string, string> = {
  idea: "You're at the beginning of something.",
  early: "You've already begun — you just need to find the thread again.",
  building: "You're in it. You just need to come back to yourself.",
  restart: "You already know something needs to shift.",
};

const middleParagraphs: Record<string, string> = {
  "ai+solo": "When you work mostly on your own, your thinking is everything — and right now it's getting bypassed before it even starts. Think Before You Build is a 14-day practice to get your own thinking on the page before anything else gets to it.",
  "ai+team": "When you're inside a team, your own perspective is the first thing that gets crowded out. Think Before You Build is a 14-day practice to find your thinking again — before the noise, before the brief, before anyone else's opinion.",
  "ai+mix": "Moving between solo and collaborative work means your thinking is constantly being shaped by others. Think Before You Build is a 14-day practice to come back to what you actually think — before anything else influences it.",
  "ai+unsure": "Not knowing your process yet is actually useful information. Think Before You Build is a 14-day practice to discover what you think — before AI, before frameworks, before anyone else's input.",
  "overwhelmed+solo": "When you work on your own, every direction is equally possible — which makes choosing feel like losing. From Many to One is a 14-day practice to move through the options and commit to the one that's actually yours.",
  "overwhelmed+team": "Inside a team, you absorb everyone's ideas alongside your own — and they all start to feel equally valid. From Many to One is a 14-day practice to find your thread inside the noise.",
  "overwhelmed+mix": "Moving between solo and collaborative means you're constantly accumulating directions without space to eliminate them. From Many to One is a 14-day practice to clear the field and choose.",
  "overwhelmed+unsure": "When your process is still forming, every possibility feels open — which can be exciting and paralysing at once. From Many to One is a 14-day practice to find out what you actually want to make.",
  "fear+solo": "Working alone means there's no one to push you past the moment of hesitation — it's just you and the gap between knowing and doing. Fear to First Move is a 14-day practice to close that gap.",
  "fear+team": "In a team you can stay busy without ever making the thing that's actually yours. Fear to First Move is a 14-day practice to move toward what you actually want to make.",
  "fear+mix": "The collaborative parts of your work give you cover to avoid the solo leap. Fear to First Move is a 14-day practice to take it anyway.",
  "fear+unsure": "When you're still figuring out your process, it's easy to stay in the figuring-out phase indefinitely. Fear to First Move is a 14-day practice to move before everything is clear.",
  "blank+solo": "Working alone means when the spark is quiet, there's nothing external to reignite it — you have to find it yourself. Back to the Well is a 14-day practice to bring it back.",
  "blank+team": "Inside a team, output is constant — which makes it easy to miss the moment your own creative energy went quiet. Back to the Well is a 14-day practice to notice and refill.",
  "blank+mix": "Switching between modes is energising until it isn't. Back to the Well is a 14-day practice to come back to the source before the tank runs dry.",
  "blank+unsure": "Not having a settled process means your energy can scatter without you noticing. Back to the Well is a 14-day practice to find what actually refills you.",
};

const bridgeLines: Record<string, string> = {
  hollow: "The practice is there. We're just going to make it feel alive again.",
  inconsistent: "Consistency isn't about discipline. It's about having something worth showing up for.",
  quiet: "Quiet isn't empty. Let's find out what's there.",
  output: "You've been giving a lot. This is about taking something back.",
};

const closingLines: Record<string, string> = {
  clarity: "14 days to get clear on what you're making and why.",
  reconnect: "14 days to find the part of you that makes things.",
  practice: "14 days to build something that actually sticks.",
  unstuck: "14 days to make something you're proud of.",
};

const whyContent: Record<string, string> = {
  ai: "The thinking you do before you reach for any tool is the most valuable thinking you'll do all day. Behavioural science shows that consistently outsourcing decisions before forming your own weakens the brain's capacity for independent reasoning — like any muscle, it atrophies without use. 15 minutes of daily writing, before anything else, rebuilds that capacity. Not because writing is magic. Because answering questions yourself, repeatedly, rewires the default toward your own thinking first.",
  overwhelmed: "Having too many ideas isn't a creativity problem. It's a commitment problem. Somatic research shows that the inability to choose often lives in the body before the mind — a low-level tension that keeps all options alive because choosing feels like loss. A daily practice works on both levels. It gives your nervous system a consistent signal that choosing is safe. Each day the field narrows naturally — not through willpower, through repetition.",
  fear: "Fear doesn't respond to logic. It responds to evidence accumulated through small repeated actions. Behavioural science calls this exposure — each small act toward the thing you fear slightly recalibrates your nervous system's threat response. A daily practice keeps the exposure consistent and low-stakes. You're not asked to launch or commit. Just to show up for 15 minutes and answer one honest question. Over time, the body learns this is safe. The mind follows.",
  blank: "Creative depletion isn't a thinking problem — it's a nervous system problem. Somatic research shows that creative energy is physical before it's mental. It lives in sensation and presence, not effort. Which is why trying harder makes it worse. 15 minutes a day. No output required. Just showing up to yourself — consistently, gently, before the day's demands arrive.",
};

export default function Home() {
  const [screen, setScreen] = useState(1);
  const [userStage, setUserStage] = useState("");
  const [userState, setUserState] = useState("");
  const [userWorkStyle, setUserWorkStyle] = useState("");
  const [userPractice, setUserPractice] = useState("");
  const [userWant, setUserWant] = useState("");
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cohortWaitlist, setCohortWaitlist] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const router = useRouter();
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mx = useRef(0);
  const my = useRef(0);
  const rx = useRef(0);
  const ry = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX;
      my.current = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + "px";
        cursorRef.current.style.top = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", onMove);
    let raf: number;
    const animate = () => {
      rx.current += (mx.current - rx.current) * 0.12;
      ry.current += (my.current - ry.current) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.left = rx.current + "px";
        ringRef.current.style.top = ry.current + "px";
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleSignIn = async () => {
    if (!signInEmail || !signInPassword) {
      setSignInError("Please enter your email and password.");
      return;
    }
    setSigningIn(true);
    setSignInError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    if (error) {
      setSignInError(error.message);
      setSigningIn(false);
      return;
    }
    router.push("/dashboard");
  };

  const go = (n: number) => {
    setScreen(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickOption = (setter: (v: string) => void, val: string, nextScreen: number) => {
    setter(val);
    setTimeout(() => go(nextScreen), 280);
  };

  const submit = async () => {
    if (!email || !email.includes("@") || !password || password.length < 6) {
      setSignupError("Please enter a valid email and a password (6+ characters).");
      return;
    }
    setSubmitting(true);
    setSignupError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      setSignupError(error.message);
      setSubmitting(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          username,
          matched_program: userState,
          cohort_waitlist: cohortWaitlist,
        }),
      });
      if (!res.ok) {
        console.error("Failed to save profile:", await res.text());
      }
    }

    router.push("/dashboard");
  };

  // Quiz question screens are 2–6, result is 7
  const quizStep = screen >= 2 && screen <= 6 ? screen - 1 : 0;

  const renderQuestion = (
    screenNum: number,
    stepLabel: string,
    title: string,
    subtitle: string,
    options: { val: string; label: string }[],
    currentVal: string,
    setter: (v: string) => void,
    nextScreen: number,
  ) => {
    if (screen !== screenNum) return null;
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px" }}>
        <button onClick={() => go(screenNum - 1)} style={{ background: "none", border: "none", cursor: "none", fontSize: 13, color: "rgba(0,3,50,0.45)", marginBottom: 48, display: "flex", alignItems: "center", gap: 8, padding: 0 }}>← back</button>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ff9090", marginBottom: 16 }}>{stepLabel}</p>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 12, maxWidth: 560 }}>
          {title}
        </h2>
        <p style={{ fontSize: 15, color: "rgba(0,3,50,0.5)", marginBottom: 40 }}>{subtitle}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 580 }}>
          {options.map((c, i) => {
            const activeOrHover = currentVal === c.val || hoveredOption === `${screenNum}-${c.val}`;
            return (
              <button
                key={c.val}
                onClick={() => pickOption(setter, c.val, nextScreen)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 16,
                  padding: "20px 24px", border: "1.5px solid rgba(0,3,50,0.12)",
                  borderRadius: 16, background: activeOrHover ? "#000332" : "transparent",
                  cursor: "none", textAlign: "left", transition: "all 0.22s"
                }}
                onMouseEnter={() => setHoveredOption(`${screenNum}-${c.val}`)}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: activeOrHover ? "rgba(244,242,238,0.4)" : "rgba(0,3,50,0.25)", minWidth: 20, paddingTop: 2 }}>0{i + 1}</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: activeOrHover ? "#f4f2ee" : "#000332" }}>{c.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const matchMessage = userState && userStage && userWorkStyle && userPractice && userWant
    ? [
        openingLines[userStage],
        middleParagraphs[`${userState}+${userWorkStyle}`],
        bridgeLines[userPractice],
        closingLines[userWant],
      ].filter(Boolean)
    : [];

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Codec Pro';
          src: url('/fonts/codec-pro_regular.ttf') format('truetype');
          font-weight: 400 700;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        body {
          background:#f4f2ee;
          color:#000332;
          font-family:'Codec Pro',sans-serif;
          overflow-x:hidden;
          cursor:none;
        }
        .cursor {
          width:10px; height:10px;
          background:#ff9090;
          border-radius:50%;
          position:fixed;
          pointer-events:none;
          z-index:9999;
          transform:translate(-50%,-50%);
          transition:transform .15s ease;
        }
        .cursor-ring {
          width:36px; height:36px;
          border:1.5px solid #000332;
          border-radius:50%;
          position:fixed;
          pointer-events:none;
          z-index:9998;
          transform:translate(-50%,-50%);
          opacity:.35;
          transition:all .12s ease;
        }
      `}</style>

      <div ref={cursorRef} className="cursor" />
      <div ref={ringRef} className="cursor-ring" />

      {/* NAV */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "28px 48px", position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 100, background: "linear-gradient(to bottom, #f4f2ee 60%, transparent)"
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "lowercase" }}>
          creativeresetclub
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button
            onClick={() => setShowSignIn(true)}
            style={{ background: "none", border: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(0,3,50,0.45)", cursor: "none", padding: 0 }}
          >
            sign in
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: quizStep > 0
                ? i < quizStep ? "#000332" : i === quizStep ? "#ff9090" : "rgba(0,3,50,0.15)"
                : screen === 7 ? "#000332"
                : "rgba(0,3,50,0.15)",
              transform: i === quizStep ? "scale(1.4)" : "scale(1)",
              transition: "all 0.3s"
            }} />
          ))}
          </div>
        </div>
      </nav>

      {/* SIGN IN MODAL */}
      {showSignIn && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,3,50,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSignIn(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#f4f2ee", borderRadius: 24, padding: "40px 44px", maxWidth: 400, width: "100%" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#000332", marginBottom: 6 }}>welcome back.</h2>
            <p style={{ fontSize: 14, color: "rgba(0,3,50,0.5)", marginBottom: 24 }}>sign in to access your program.</p>
            {signInError && <p style={{ fontSize: 13, color: "#ff9090", marginBottom: 14 }}>{signInError}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="email" value={signInEmail} onChange={e => setSignInEmail(e.target.value)} placeholder="your email" style={{ padding: "16px 20px", border: "1.5px solid rgba(0,3,50,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#000332", outline: "none" }} />
              <input type="password" value={signInPassword} onChange={e => setSignInPassword(e.target.value)} placeholder="password" style={{ padding: "16px 20px", border: "1.5px solid rgba(0,3,50,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#000332", outline: "none" }} />
              <button onClick={handleSignIn} disabled={signingIn} style={{ background: "#000332", color: "#f4f2ee", border: "none", padding: "16px 28px", borderRadius: 100, fontFamily: "'Codec Pro',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: signingIn ? 0.6 : 1 }}>
                {signingIn ? "signing in..." : "sign in"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 1: HERO */}
      {screen === 1 && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 48px", paddingTop: 40, position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", width: 600, height: 600,
            background: "radial-gradient(circle, #e6f6ff 0%, transparent 70%)",
            borderRadius: "50%", top: -100, right: -150, pointerEvents: "none",
            animation: "drift 8s ease-in-out infinite alternate"
          }} />
          <style>{`@keyframes drift { from { transform:translate(0,0) scale(1); } to { transform:translate(-20px,20px) scale(1.05); } }`}</style>

          <div style={{ maxWidth: 640 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#000332", color: "#f4f2ee",
              padding: "8px 16px", borderRadius: 100,
              fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              marginBottom: 36
            }}>
              <div style={{ width: 6, height: 6, background: "#ff9090", borderRadius: "50%", animation: "blink 2s ease infinite" }} />
              think before you create
            </div>
            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 16 }}>
              <h1 style={{
                fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700,
                lineHeight: 1.0, letterSpacing: "-0.02em"
              }}>
                your daily reset<br />
                for creative thinking,<br />
                <span style={{ color: "#ff9090" }}>in the age of AI.</span>
              </h1>
              <img
                src="/stickman.png"
                alt="playful stickman"
                style={{
                  width: 140,
                  flexShrink: 0,
                  marginTop: 0,
                  transform: "scaleX(-1)",
                }}
              />
            </div>

            <p style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(0,3,50,0.7)", maxWidth: 480, marginBottom: 32, fontWeight: 400 }}>
              think first. play often. create before you prompt.
            </p>

            <button
              onClick={() => go(2)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 12,
                background: "#000332", color: "#f4f2ee",
                padding: "18px 36px", borderRadius: 100,
                fontSize: 15, fontWeight: 700, border: "none", cursor: "none",
                transition: "all 0.25s"
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = "#ff9090"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = "#000332"; }}
            >
              find your path
              <span style={{ width: 20, height: 20, background: "#ff9090", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>→</span>
            </button>

            <p style={{ marginTop: 20, fontSize: 12, color: "rgba(0,3,50,0.4)" }}>takes 2 minutes · free to start</p>
          </div>
        </div>
      )}

      {/* QUESTION 1 — Where are you with your work right now? */}
      {renderQuestion(2, "01 / 05", "Where are you with your work right now?", "Pick the one that's most honest.", [
        { val: "idea", label: "I have ideas I haven't started yet — and I'm ready to" },
        { val: "early", label: "I've started something but lost the momentum" },
        { val: "building", label: "I'm building, but I've drifted from what excited me about it" },
        { val: "restart", label: "I need to change direction and I know it" },
      ], userStage, setUserStage, 3)}

      {/* QUESTION 2 — What does it feel like right now? */}
      {renderQuestion(3, "02 / 05", "What does it feel like right now?", "The one that makes you go — yeah, that's it.", [
        { val: "ai", label: "I reach for AI before I've figured out what I think" },
        { val: "overwhelmed", label: "I have too many directions and keep circling without choosing" },
        { val: "fear", label: "I know what I want but something keeps stopping me" },
        { val: "blank", label: "My thinking feels quieter than usual — quieter than I'd like" },
      ], userState, setUserState, 4)}

      {/* QUESTION 3 — How do you mostly work? */}
      {renderQuestion(4, "03 / 05", "How do you mostly work?", "No wrong answer here.", [
        { val: "solo", label: "On my own, mostly in my own head" },
        { val: "team", label: "In a team but the creative thinking is mine to do" },
        { val: "mix", label: "I move between solo and collaborative depending on the project" },
        { val: "unsure", label: "I'm not sure yet — still figuring out my process" },
      ], userWorkStyle, setUserWorkStyle, 5)}

      {/* QUESTION 4 — What does your creative practice look like right now? */}
      {renderQuestion(5, "04 / 05", "What does your creative practice look like right now?", "Be honest with yourself.", [
        { val: "hollow", label: "I show up regularly but it doesn't always feel alive" },
        { val: "inconsistent", label: "I dip in and out — inconsistent but not gone" },
        { val: "quiet", label: "It's been quieter than I'd like lately" },
        { val: "output", label: "I've been in full output mode and haven't made space for it" },
      ], userPractice, setUserPractice, 6)}

      {/* QUESTION 5 — What do you want most from this? */}
      {renderQuestion(6, "05 / 05", "What do you want most from this?", "Pick the one that pulls.", [
        { val: "clarity", label: "Clarity on what I'm actually making and why" },
        { val: "reconnect", label: "To reconnect with the part of me that makes things" },
        { val: "practice", label: "To build a practice that actually sticks" },
        { val: "unstuck", label: "To get unstuck and make something I'm proud of" },
      ], userWant, setUserWant, 7)}

      {/* SCREEN 7: RESULT */}
      {screen === 7 && matchMessage.length > 0 && (
        <div style={{ padding: "100px 48px 80px" }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <button onClick={() => go(6)} style={{ background: "none", border: "none", cursor: "none", fontSize: 13, color: "rgba(0,3,50,0.45)", marginBottom: 32, display: "flex", alignItems: "center", gap: 8, padding: 0 }}>← back</button>

            <div style={{ background: "#000332", borderRadius: 24, padding: 40, marginBottom: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(255,144,144,0.2) 0%, transparent 70%)", borderRadius: "50%" }} />
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ff9090", marginBottom: 14, position: "relative" }}>your program</p>
              <h2 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, color: "#f4f2ee", lineHeight: 1.2, marginBottom: 20, position: "relative" }}>{programNames[userState]}</h2>

              <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(244,242,238,0.85)", marginBottom: 16, position: "relative" }}>{matchMessage[0]}</p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(244,242,238,0.7)", marginBottom: 16, position: "relative" }}>{matchMessage[1]}</p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(244,242,238,0.7)", marginBottom: 16, position: "relative", fontStyle: "italic" }}>{matchMessage[2]}</p>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: "#ff9090", fontWeight: 700, position: "relative" }}>{matchMessage[3]}</p>

              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(244,242,238,0.4)", margin: "28px 0 12px", position: "relative" }}>why a daily practice</p>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: "rgba(244,242,238,0.7)", position: "relative" }}>{whyContent[userState]}</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6, lineHeight: 1.2 }}>
                create your account to access{" "}
                <span style={{ color: "#ff9090" }}>your program.</span>
              </h3>
              <p style={{ fontSize: 14, color: "rgba(0,3,50,0.5)", marginBottom: 20, lineHeight: 1.6 }}>your 14-day practice is ready. create a free account to begin.</p>

              {signupError && (
                <p style={{ fontSize: 13, color: "#ff9090", marginBottom: 14 }}>{signupError}</p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your email"
                    style={{ flex: 1, minWidth: 200, padding: "16px 20px", border: "1.5px solid rgba(0,3,50,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#000332", outline: "none", cursor: "text" }}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="first name"
                    style={{ flex: 1, minWidth: 140, padding: "16px 20px", border: "1.5px solid rgba(0,3,50,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#000332", outline: "none", cursor: "text" }}
                  />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="create a password (6+ characters)"
                  style={{ padding: "16px 20px", border: "1.5px solid rgba(0,3,50,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#000332", outline: "none", cursor: "text" }}
                />

                <div style={{ background: "#e6f6ff", borderRadius: 16, padding: "20px 24px", marginTop: 8 }}>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(0,3,50,0.6)", marginBottom: 14 }}>
                    We&apos;re building a group experience around these programs — a 4-week cohort where a small group of creatives and builders move through the practice together, with weekly live sessions and shared reflection. If that sounds like something you&apos;d want, tick the box and we&apos;ll reach out when it&apos;s ready.
                  </p>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#000332" }}>
                    <input
                      type="checkbox"
                      checked={cohortWaitlist}
                      onChange={e => setCohortWaitlist(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#000332", cursor: "pointer" }}
                    />
                    Yes, add me to the cohort waitlist
                  </label>
                </div>

                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{ alignSelf: "flex-start", background: "#000332", color: "#f4f2ee", border: "none", padding: "16px 28px", borderRadius: 100, fontFamily: "'Codec Pro',sans-serif", fontSize: 14, fontWeight: 700, cursor: "none", whiteSpace: "nowrap", opacity: submitting ? 0.6 : 1, marginTop: 4 }}
                  onMouseEnter={e => { if (!submitting) (e.target as HTMLElement).style.background = "#ff9090"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = "#000332"; }}
                >
                  {submitting ? "creating account..." : "create account & start →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 8: SUCCESS */}
      {screen === 8 && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px" }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ width: 52, height: 52, background: "#000332", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff9090", fontSize: 22, marginBottom: 28 }}>✓</div>
            <h2 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 16 }}>
              day 1 is on its<br />way.{" "}
              <span style={{ color: "#ff9090" }}>check your inbox.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(0,3,50,0.55)", marginBottom: 36 }}>
              While you wait — open a blank doc or grab a piece of paper. Write this at the top and let it sit:
            </p>
            <div style={{ background: "#e6f6ff", borderRadius: 16, padding: "24px 28px", marginBottom: 32, borderLeft: "3px solid #ff9090" }}>
              <p style={{ fontSize: 19, fontWeight: 700, color: "#000332", lineHeight: 1.4 }}>
                &ldquo;what do I actually think about this — before anyone else tells me?&rdquo;
              </p>
            </div>
            <p style={{ fontSize: 14, color: "rgba(0,3,50,0.55)", lineHeight: 1.7, marginBottom: 28 }}>
              Don&apos;t answer it yet. The fact that you&apos;re asking it is already the work.
            </p>
            <a
              href="https://instagram.com/creativeresetclub"
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#000332", color: "#f4f2ee", padding: "16px 28px", borderRadius: 100, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
            >
              follow along on instagram →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
