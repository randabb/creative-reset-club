"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const trackResults: Record<string, { name: string; heading: string; body: string }> = {
  empty_the_head: {
    name: "Empty the Head",
    heading: "Your head is full.",
    body: "Too many things competing at once. The problem isn't that you don't have ideas. It's that you can't hear them over everything else. This track starts by clearing space.",
  },
  make_it_yours: {
    name: "Make It Yours",
    heading: "You've been making for everyone else.",
    body: "You're still producing. But somewhere along the way it stopped feeling like yours. This track is about making something with no audience in mind.",
  },
  reignite: {
    name: "Reignite",
    heading: "The thread went quiet.",
    body: "The connection to your own thinking hasn't disappeared. It's just been quiet. This track is about finding your way back, one thought at a time.",
  },
  refill: {
    name: "Refill",
    heading: "The well ran dry.",
    body: "You've been giving out more than you've been taking in. Before anything else, you need to restore. This track starts there.",
  },
  move_it_forward: {
    name: "Move It Forward",
    heading: "You're stuck in the loop.",
    body: "The thinking is there. The movement isn't. This track is designed to break the cycle and get something out of your head and into the world.",
  },
  one_thing: {
    name: "One Thing at a Time",
    heading: "You know what you want to make.",
    body: "Something keeps stopping you. And it's not a lack of ideas or ability. This track creates the conditions to finally move toward the thing you've been avoiding.",
  },
};

const q3Labels: Record<string, string> = {
  head: "your thinking", body: "your energy", habits: "your patterns", confidence: "your self-trust",
};
const q5Labels: Record<string, string> = {
  deep_focus: "deep focus", connections: "lateral thinking", expression: "through expression", genuinely_mine: "through making",
};
const q7Labels: Record<string, string> = {
  clear_thinking: "mental clarity", finishing: "forward movement", energized: "creative energy", trusting: "self trust",
};

export default function Home() {
  const [screen, setScreen] = useState(1);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [assignedTrack, setAssignedTrack] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");
  const [q5, setQ5] = useState("");
  const [q6, setQ6] = useState("");
  const [q7, setQ7] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [statValues, setStatValues] = useState([0, 0]);
  const [fadeKey, setFadeKey] = useState(0);
  const statRowRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Stat counter animation
  useEffect(() => {
    if (!statRowRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsAnimated) {
          setStatsAnimated(true);
          const duration = 1500;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setStatValues([Math.round(42 * eased), Math.round(1 * eased)]);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(statRowRef.current);
    return () => observer.disconnect();
  }, [statsAnimated]);

  const go = (n: number) => {
    setFadeKey(k => k + 1);
    setScreen(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pick = (setter: (v: string) => void, val: string, next: number) => {
    setter(val);
    setTimeout(() => go(next), 250);
  };

  // Q2 branch logic: assign track based on Q1 + Q2 answer
  const pickQ2 = (val: string) => {
    setQ2(val);
    // Determine track from Q2 answer value directly
    setAssignedTrack(val);
    setTimeout(() => go(7), 250); // skip to Q3
  };

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

  const handleSignup = async () => {
    if (!email || !email.includes("@")) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    setSignupError("");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        setSignupError("That email is already in use. Sign in instead.");
      } else {
        setSignupError(error.message);
      }
      setSubmitting(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          matched_program: assignedTrack,
          cohort_waitlist: false,
          q3_block_location: q3,
          q4_ai_relationship: q4,
          q5_creative_style: q5,
          q6_time_available: q6,
          q7_intention: q7,
        }),
      });
    }

    router.push("/dashboard");
  };

  // Quiz steps: q1(3) + q2(4) + q3(7) + q4(8) + q5(9) + q6(10) + q7(11) + results(12)
  const totalSteps = 8;
  const stepMap: Record<number, number> = { 3: 1, 4: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8 };
  const currentStep = stepMap[screen] || 0;
  const progress = Math.min((currentStep / totalSteps) * 100, 100);

  // Q2 branching options based on Q1
  const q2Options = q1 === "full"
    ? [
        { val: "empty_the_head", label: "Like I can't filter. Too many inputs, too many directions." },
        { val: "make_it_yours", label: "Like I'm making things for everyone except myself." },
      ]
    : q1 === "flat"
    ? [
        { val: "reignite", label: "I've lost the thread back to my own thinking." },
        { val: "refill", label: "I used to have more in me. I'm just tired." },
      ]
    : [
        { val: "move_it_forward", label: "I keep going in circles and can't move anything forward." },
        { val: "one_thing", label: "I know what I want to make but something keeps stopping me." },
      ];

  const q2Question = q1 === "full"
    ? "What does the noise feel like?"
    : q1 === "flat"
    ? "What's closer to what's happening?"
    : "What's keeping you there?";

  const result = trackResults[assignedTrack];

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Codec Pro';
          src: url('/fonts/codec-pro_regular.ttf') format('truetype');
          font-weight: 400 700;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; overflow-x:hidden; }
        body { background:#f4f2ee; color:#1a1f3a; font-family:'Codec Pro',sans-serif !important; overflow-x:hidden; }
        .stickman-img { width:200px; animation:idle 4s ease-in-out infinite; }
        @keyframes idle {
          0%, 100% { transform: translateY(0px) rotate(0deg) scaleX(-1); }
          25% { transform: translateY(-4px) rotate(0.5deg) scaleX(-1); }
          75% { transform: translateY(2px) rotate(-0.5deg) scaleX(-1); }
        }
        .stat-countup { transition: opacity 0.4s ease; }
        .stat-fadein { animation: statFade 1.5s ease-out forwards; }
        @keyframes statFade { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .stickman-mobile { display:none !important; }
        .stickman-desktop { display:block; }
        .headline-row { display:block; }
        .quiz-screen { animation: fadeUp 0.3s ease forwards; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .quiz-screen, .quiz-screen * { font-family:'Codec Pro',sans-serif; }
        .quiz-card { display:block; width:100%; padding:20px 24px; border:1.5px solid rgba(26,31,58,0.1); border-radius:16px; background:transparent; cursor:pointer; text-align:left; font-family:'Codec Pro',sans-serif; font-size:15px; font-weight:500; color:#1a1f3a; line-height:1.5; transition:all 0.2s ease; }
        .quiz-card:hover { background:rgba(232,132,106,0.08); border-color:#E8846A; }
        .quiz-card.selected { background:rgba(232,132,106,0.12); border:2px solid #E8846A; }
        .results-grid { grid-template-columns: 1fr auto 1fr; }
        @media (max-width:768px) {
          .stickman-img { width:100px; }
          .hero-heading { font-size:1.85rem !important; line-height:1.15 !important; }
          .hero-outer { padding:40px 35px 0 35px !important; }
          .hero-grid { grid-template-columns:1fr !important; gap:24px !important; min-height:auto !important; margin-top:40px !important; }
          .hero-left { padding-left:0 !important; }
          .headline-row { display:flex !important; align-items:center; gap:4px; }
          .stickman-mobile { display:block !important; align-self:center; }
          .stickman-desktop { display:none !important; }
          .hero-right { width:calc(100vw - 70px) !important; max-width:calc(100vw - 70px) !important; overflow:hidden; }
          .stat-row-right { flex-direction:row !important; gap:12px !important; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:8px; scroll-snap-type:x mandatory; }
          .stat-row-right > div { border-left:none !important; padding-left:0 !important; min-width:140px; flex-shrink:0 !important; flex:none !important; background:transparent; border:1px solid rgba(0,3,50,0.12); border-radius:12px; padding:16px !important; scroll-snap-align:start; }
          .stat-row-right > div p:last-child { white-space:normal; word-wrap:break-word; }
          .card-row-right { flex-direction:column !important; gap:10px !important; width:100% !important; overflow:hidden; padding:0 !important; box-sizing:border-box; }
          .card-row-right > div { flex:none !important; height:auto !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; display:block !important; margin:0 !important; }
          .card-row-right > div p { white-space:normal; word-wrap:break-word; overflow-wrap:break-word; max-width:100%; }
          .results-grid { grid-template-columns:1fr !important; gap:32px !important; }
          .results-grid > div:first-child { padding-right:0 !important; }
          .results-grid > div:nth-child(2) { display:none !important; }
          .results-grid > div:last-child { padding-left:0 !important; }
        }
      `}</style>

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
            style={{ background: "none", border: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(26,31,58,0.45)", cursor: "pointer", padding: 0 }}
          >
            sign in
          </button>
          {screen > 2 && screen <= 12 && (
            <div style={{ width: 80, height: 3, background: "rgba(26,31,58,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#E8846A", borderRadius: 2, transition: "width 0.4s ease", width: `${progress}%` }} />
            </div>
          )}
        </div>
      </nav>

      {/* SIGN IN MODAL */}
      {showSignIn && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,31,58,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSignIn(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#f4f2ee", borderRadius: 24, padding: "40px 44px", maxWidth: 400, width: "100%" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1f3a", marginBottom: 6 }}>welcome back.</h2>
            <p style={{ fontSize: 14, color: "rgba(26,31,58,0.5)", marginBottom: 24 }}>sign in to access your track.</p>
            {signInError && <p style={{ fontSize: 13, color: "#E8846A", marginBottom: 14 }}>{signInError}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="email" value={signInEmail} onChange={e => setSignInEmail(e.target.value)} placeholder="your email" style={{ padding: "16px 20px", border: "1.5px solid rgba(26,31,58,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#1a1f3a", outline: "none" }} />
              <input type="password" value={signInPassword} onChange={e => setSignInPassword(e.target.value)} placeholder="password" style={{ padding: "16px 20px", border: "1.5px solid rgba(26,31,58,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#1a1f3a", outline: "none" }} />
              <button onClick={handleSignIn} disabled={signingIn} style={{ background: "#1a1f3a", color: "#f4f2ee", border: "none", padding: "16px 28px", borderRadius: 100, fontFamily: "'Codec Pro',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: signingIn ? 0.6 : 1 }}>
                {signingIn ? "signing in..." : "sign in"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 1: HERO */}
      {screen === 1 && (
        <div className="hero-outer" style={{ padding: "0 48px", paddingTop: 60, paddingBottom: 48, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 500, height: 500, background: "radial-gradient(circle, rgba(230,246,255,0.4) 0%, transparent 70%)", borderRadius: "50%", top: -120, right: -200, pointerEvents: "none", zIndex: 0 }} />
          <div className="hero-grid" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", maxWidth: 1200, margin: "0 auto", minHeight: "calc(100vh - 120px)" }}>
            <div className="hero-left" style={{ paddingLeft: "4rem" }}>
              <div className="headline-row" style={{ marginBottom: 16 }}>
                <h1 className="hero-heading" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.02em" }}>
                  your daily prompt<br />
                  for <span style={{ fontStyle: "italic" }}>creative thinking,</span><br />
                  <span style={{ color: "#E8846A", whiteSpace: "nowrap" }}>in the age of AI.</span>
                </h1>
                <img src="/stickman.png" alt="playful stickman" className="stickman-mobile" style={{ display: "none", objectFit: "contain", objectPosition: "bottom", width: 120, flexShrink: 0 }} />
              </div>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(26,31,58,0.7)", maxWidth: 480, marginBottom: 32, fontWeight: 400 }}>come play. the prompts are already warm.</p>
              <button onClick={() => go(3)} style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#1a1f3a", color: "#f4f2ee", padding: "18px 36px", borderRadius: 100, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.25s", width: "fit-content", maxWidth: "fit-content", minWidth: 200 }} onMouseEnter={e => { (e.target as HTMLElement).style.background = "#E8846A"; }} onMouseLeave={e => { (e.target as HTMLElement).style.background = "#1a1f3a"; }}>
                start your first reset
                <span style={{ width: 20, height: 20, background: "#E8846A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>→</span>
              </button>
              <p style={{ marginTop: 20, fontSize: 12, color: "rgba(26,31,58,0.4)" }}>backed by behavioral science · takes 2 minutes · free to start</p>
            </div>
            <div className="hero-right" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div className="stickman-desktop"><img src="/stickman.png" alt="playful stickman" className="stickman-img" style={{ display: "block", objectFit: "contain", objectPosition: "bottom" }} /></div>
              <div ref={statRowRef} className="stat-row-right" style={{ display: "flex", gap: 0 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#1a1f3a", lineHeight: 1.1, marginBottom: 6 }}>{statsAnimated ? `${statValues[0]}%` : "0%"}</p>
                  <p style={{ fontSize: 12, color: "rgba(26,31,58,0.45)", lineHeight: 1.45 }}>drop in creative thinking since 2020</p>
                </div>
                <div style={{ flex: 1, paddingLeft: 20, borderLeft: "1px solid rgba(26,31,58,0.12)" }}>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#1a1f3a", lineHeight: 1.1, marginBottom: 6 }}>{statsAnimated ? `${statValues[1]} in 2` : "0"}</p>
                  <p style={{ fontSize: 12, color: "rgba(26,31,58,0.45)", lineHeight: 1.45 }}>people say AI dulls their creativity</p>
                </div>
                <div style={{ flex: 1, paddingLeft: 20, borderLeft: "1px solid rgba(26,31,58,0.12)" }}>
                  <p className={statsAnimated ? "stat-fadein" : ""} style={{ fontSize: "2rem", fontWeight: 700, color: "#1a1f3a", lineHeight: 1.1, marginBottom: 6, opacity: statsAnimated ? 1 : 0 }}>1 daily practice.</p>
                  <p className={statsAnimated ? "stat-fadein" : ""} style={{ fontSize: 12, color: "rgba(26,31,58,0.45)", lineHeight: 1.45, opacity: statsAnimated ? 1 : 0 }}>use it or lose it.</p>
                </div>
              </div>
              <div className="card-row-right" style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1a1f3a", borderRadius: 16, padding: "24px 24px" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E8846A", marginBottom: 10 }}>daily exercises</p>
                  <p style={{ fontSize: 13, color: "rgba(244,242,238,0.7)", lineHeight: 1.6, marginBottom: 10 }}>morning pages · brain dumps · timed sprints · ugly first drafts · constraint prompts</p>
                  <p style={{ fontSize: 12, color: "rgba(244,242,238,0.45)", lineHeight: 1.55 }}>A different practice every day. All designed to get you out of your head and onto the page.</p>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1a1f3a", borderRadius: 16, padding: "24px 24px" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E8846A", marginBottom: 10 }}>why it works</p>
                  <p style={{ fontSize: 13, color: "rgba(244,242,238,0.7)", lineHeight: 1.6, marginBottom: 10 }}>Every exercise is designed to reduce cognitive load, bypass your inner critic, and rebuild the neural pathways that daily AI use quietly erodes.</p>
                  <p style={{ fontSize: 12, color: "rgba(244,242,238,0.45)", lineHeight: 1.55 }}>Because the most valuable thing you bring to your work isn&apos;t your output. It&apos;s how you think.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3: Q1 (with intro header) */}
      {screen === 3 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px", maxWidth: 600 }}>
          <p style={{ fontSize: 14, color: "rgba(26,31,58,0.45)", lineHeight: 1.5, marginBottom: 6 }}>a few questions to understand where you are right now.</p>
          <p style={{ fontSize: 12, color: "rgba(26,31,58,0.3)", marginBottom: 32 }}>there are no right answers. just pick what feels most true.</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 32 }}>
            When you sit down to think or create lately, what&apos;s the closest feeling?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ1, "full", 4)} className={`quiz-card ${q1 === "full" ? "selected" : ""}`}>My head is full. Too many things competing at once.</button>
            <button onClick={() => pick(setQ1, "flat", 4)} className={`quiz-card ${q1 === "flat" ? "selected" : ""}`}>I feel flat. Low energy, disconnected, not much coming up.</button>
            <button onClick={() => pick(setQ1, "stuck", 4)} className={`quiz-card ${q1 === "stuck" ? "selected" : ""}`}>I&apos;m stuck. Something&apos;s there but it won&apos;t move.</button>
          </div>
        </div>
      )}

      {/* SCREEN 4: Q2 (branched) */}
      {screen === 4 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px", maxWidth: 600 }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 32 }}>
            {q2Question}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q2Options.map(o => (
              <button key={o.val} onClick={() => pickQ2(o.val)} className={`quiz-card ${q2 === o.val ? "selected" : ""}`}>{o.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 7: Q3 */}
      {screen === 7 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px", maxWidth: 600 }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 32 }}>
            Where do you feel the block most?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ3, "head", 8)} className={`quiz-card ${q3 === "head" ? "selected" : ""}`}>In my head. I can&apos;t stop thinking.</button>
            <button onClick={() => pick(setQ3, "body", 8)} className={`quiz-card ${q3 === "body" ? "selected" : ""}`}>In my body. I feel tense, tired, or numb.</button>
            <button onClick={() => pick(setQ3, "habits", 8)} className={`quiz-card ${q3 === "habits" ? "selected" : ""}`}>In my habits. I keep defaulting to the same patterns.</button>
            <button onClick={() => pick(setQ3, "confidence", 8)} className={`quiz-card ${q3 === "confidence" ? "selected" : ""}`}>In my confidence. I don&apos;t trust what comes up.</button>
          </div>
        </div>
      )}

      {/* SCREEN 8: Q4 */}
      {screen === 8 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px", maxWidth: 600 }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 32 }}>
            When it comes to AI tools, which feels most true right now?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ4, "before_thinking", 9)} className={`quiz-card ${q4 === "before_thinking" ? "selected" : ""}`}>I reach for them before I&apos;ve even tried thinking myself.</button>
            <button onClick={() => pick(setQ4, "losing_something", 9)} className={`quiz-card ${q4 === "losing_something" ? "selected" : ""}`}>I use them but I&apos;m aware I&apos;m losing something.</button>
            <button onClick={() => pick(setQ4, "avoid_pressure", 9)} className={`quiz-card ${q4 === "avoid_pressure" ? "selected" : ""}`}>I avoid them but feel the pressure to use them more.</button>
            <button onClick={() => pick(setQ4, "found_balance", 9)} className={`quiz-card ${q4 === "found_balance" ? "selected" : ""}`}>I&apos;ve found a balance. This is more about getting back to myself.</button>
          </div>
        </div>
      )}

      {/* SCREEN 9: Q5 */}
      {screen === 9 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px", maxWidth: 600 }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 32 }}>
            On a good creative day, what does it feel like?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ5, "deep_focus", 10)} className={`quiz-card ${q5 === "deep_focus" ? "selected" : ""}`}>I go deep on one thing and lose track of time.</button>
            <button onClick={() => pick(setQ5, "connections", 10)} className={`quiz-card ${q5 === "connections" ? "selected" : ""}`}>I make unexpected connections between unrelated ideas.</button>
            <button onClick={() => pick(setQ5, "expression", 10)} className={`quiz-card ${q5 === "expression" ? "selected" : ""}`}>I express something I didn&apos;t know I thought until I said it out loud.</button>
            <button onClick={() => pick(setQ5, "genuinely_mine", 10)} className={`quiz-card ${q5 === "genuinely_mine" ? "selected" : ""}`}>I make something and it feels genuinely mine.</button>
          </div>
        </div>
      )}

      {/* SCREEN 10: Q6 */}
      {screen === 10 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px", maxWidth: 600 }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 32 }}>
            How much time do you have each day?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ6, "5min", 11)} className={`quiz-card ${q6 === "5min" ? "selected" : ""}`}>5 minutes. Keep it short and focused.</button>
            <button onClick={() => pick(setQ6, "15min", 11)} className={`quiz-card ${q6 === "15min" ? "selected" : ""}`}>10 to 15 minutes. I can go a bit deeper.</button>
            <button onClick={() => pick(setQ6, "30min", 11)} className={`quiz-card ${q6 === "30min" ? "selected" : ""}`}>30+ minutes. I want the full experience.</button>
          </div>
        </div>
      )}

      {/* SCREEN 11: Q7 */}
      {screen === 11 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 48px 80px", maxWidth: 600 }}>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 32 }}>
            Three weeks from now, what would feel most meaningful?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ7, "clear_thinking", 12)} className={`quiz-card ${q7 === "clear_thinking" ? "selected" : ""}`}>Thinking more clearly without reaching for external input first.</button>
            <button onClick={() => pick(setQ7, "finishing", 12)} className={`quiz-card ${q7 === "finishing" ? "selected" : ""}`}>Actually finishing something I&apos;ve been avoiding.</button>
            <button onClick={() => pick(setQ7, "energized", 12)} className={`quiz-card ${q7 === "energized" ? "selected" : ""}`}>Feeling creatively energized again.</button>
            <button onClick={() => pick(setQ7, "trusting", 12)} className={`quiz-card ${q7 === "trusting" ? "selected" : ""}`}>Trusting my own ideas again.</button>
          </div>
        </div>
      )}

      {/* SCREEN 12: RESULTS + ACCOUNT CREATION */}
      {screen === 12 && result && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "120px 48px 80px" }}>
          <div className="results-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, maxWidth: 960, width: "100%", margin: "0 auto", alignItems: "center" }}>
            {/* LEFT: Track result */}
            <div style={{ paddingRight: 48 }}>
              <div style={{ background: "#0f1428", borderRadius: 16, padding: 40, border: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(circle, rgba(232,132,106,0.08) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E8846A", marginBottom: 14, position: "relative" }}>{result.name}</p>
                <h2 style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#f4f2ee", marginBottom: 14, position: "relative" }}>
                  {result.heading}
                </h2>
                <p style={{ fontSize: 15, color: "rgba(244,242,238,0.6)", lineHeight: 1.7, marginBottom: 24, position: "relative" }}>
                  {result.body}
                </p>
                <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 24 }} />
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E8846A", marginBottom: 14 }}>your profile</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <span style={{ color: "rgba(244,242,238,0.4)" }}>where you&apos;re blocked: </span>
                    <span style={{ color: "#f4f2ee" }}>{q3Labels[q3] || "unknown"}</span>
                  </p>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <span style={{ color: "rgba(244,242,238,0.4)" }}>how you work best: </span>
                    <span style={{ color: "#f4f2ee" }}>{q5Labels[q5] || "unknown"}</span>
                  </p>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <span style={{ color: "rgba(244,242,238,0.4)" }}>what you&apos;re here for: </span>
                    <span style={{ color: "#f4f2ee" }}>{q7Labels[q7] || "unknown"}</span>
                  </p>
                </div>
                <p style={{ fontSize: 11, color: "rgba(244,242,238,0.3)", marginTop: 20 }}>14 days. one practice a day. free to start.</p>
              </div>
            </div>

            {/* DIVIDER */}
            <div style={{ width: 1, background: "rgba(26,31,58,0.1)", alignSelf: "stretch" }} />

            {/* RIGHT: Account creation */}
            <div style={{ paddingLeft: 48 }}>
              <h3 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1a1f3a", marginBottom: 8 }}>
                one last thing before you begin.
              </h3>
              <p style={{ fontSize: 14, color: "rgba(26,31,58,0.5)", lineHeight: 1.6, marginBottom: 24 }}>
                create a free account to save your progress.
              </p>
              {signupError && <p style={{ fontSize: 13, color: "#E8846A", marginBottom: 14 }}>{signupError}</p>}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your email" style={{ padding: "16px 20px", border: "1.5px solid rgba(26,31,58,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#1a1f3a", outline: "none", marginBottom: 10, width: "100%" }} />
              <div style={{ position: "relative", marginBottom: 14 }}>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="create a password" style={{ padding: "16px 20px", paddingRight: 48, border: "1.5px solid rgba(26,31,58,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#1a1f3a", outline: "none", width: "100%" }} />
                <button onClick={() => setShowPassword(!showPassword)} type="button" style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(26,31,58,0.35)", fontFamily: "'Codec Pro',sans-serif" }}>
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
              <button onClick={handleSignup} disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#1a1f3a", color: "#f4f2ee", padding: "16px 32px", borderRadius: 100, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", width: "fit-content", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "creating your account..." : "create my account"}
                <span style={{ width: 20, height: 20, background: "#E8846A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>→</span>
              </button>
              <button onClick={() => setShowSignIn(true)} style={{ background: "none", border: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 12, color: "rgba(26,31,58,0.4)", cursor: "pointer", marginTop: 16, padding: 0, textDecoration: "underline", textUnderlineOffset: 3, display: "block" }}>already have an account? sign in</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
