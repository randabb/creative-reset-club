// CRC VOICE RULES:
// - calm, not soft. intelligent, not academic. guiding, not instructing.
// - we say: "start here" · "notice this" · "stay with this" · "see what comes up"
// - we never say: "complete this exercise" · "optimize" · "improve your creativity"
// - no gamification language. no celebration. no "congratulations."
// - the page should feel like entering a different pace.

"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const trackResults: Record<string, { name: string; body: string; recognize: string[]; looksLike: string }> = {
  empty_the_head: {
    name: "Empty the Head",
    body: "Your head is full. You care about a lot of things and none of them have had a chance to land. You've been holding too much at once, and the mental weight of it is making it hard to think clearly about any of it.",
    recognize: [
      "you start things but can't decide which one actually matters",
      "your best thinking happens in the shower or on a walk, never at your desk",
      "you feel productive but not particularly clear",
    ],
    looksLike: "You'll start by getting everything out. All of it, without filtering. Then you'll start to see what actually matters and what's just been taking up space. By the end you'll have a clearer sense of where your real attention wants to go.",
  },
  make_it_yours: {
    name: "Make It Yours",
    body: "You've been making things for everyone else. You're still producing. You show up, you deliver, you move fast. But somewhere along the way the work stopped feeling like it came from you. You know the difference, there's the thing you made because it was expected, and the thing you made that felt real. The gap between those two has been getting wider.",
    recognize: [
      "you edit yourself before you've even started",
      "you know what would perform well before you know what you actually think",
      "you've stopped making things just to see what happens",
    ],
    looksLike: "You'll start by getting honest about where the noise comes from. Then you'll spend some time just making, no brief, no audience, no filter. By the end you'll have made something that felt like yours. That's the whole point.",
  },
  reignite: {
    name: "Reignite",
    body: "You've lost the thread back to your own thinking. It didn't happen suddenly. It was gradual, a slow drift toward reacting, consuming, responding. At some point you stopped generating and started curating. The ideas are still there. You just haven't had the conditions to hear them.",
    recognize: [
      "you can't remember the last time you had an idea that felt entirely yours",
      "you feel more comfortable responding to things than starting them",
      "you've been waiting to feel inspired before you begin",
    ],
    looksLike: "You'll start small, noticing what you actually think before you reach for anything external. Then you'll build back the habit of generating. By the end the connection to your own thinking will feel less fragile.",
  },
  refill: {
    name: "Refill",
    body: "The well ran dry. You kept going without replenishing. You've been producing, delivering, showing up. But the creative energy that used to feel natural has gotten thin. What used to come easily now takes effort. What used to excite you now just feels like more to do.",
    recognize: [
      "you feel like you're running on fumes creatively",
      "you can execute but you can't remember the last time you felt genuinely inspired",
      "rest doesn't seem to help as much as it used to",
    ],
    looksLike: "You'll start by slowing down on purpose, enough to restore. You'll spend time noticing, receiving, and giving yourself permission to take in before you put out. By the end the well will have something in it again.",
  },
  move_it_forward: {
    name: "Move It Forward",
    body: "You're stuck in the loop. The thinking is there, sometimes it's very much there. But it keeps circling without landing anywhere. You refine instead of finishing. You revisit instead of releasing. Somewhere between the idea and the output, something stalls.",
    recognize: [
      "you have files full of things that are almost done",
      "you know what you want to make but keep finding reasons to wait",
      "you're more comfortable thinking about the work than doing it",
    ],
    looksLike: "You'll start by understanding what's actually keeping things stuck. Then you'll build the habit of small, committed moves. By the end you'll have finished something and know how to do it again.",
  },
  one_thing: {
    name: "One Thing at a Time",
    body: "You know what you want to make. That's not the problem. The problem is that every time you get close to it, something stops you. It might look like perfectionism or procrastination from the outside. From the inside it feels more like fear, of what it means to try, of what it means if it doesn't work.",
    recognize: [
      "the things that matter most to you are the ones you keep putting off",
      "you do the easy work first and save the real work for when you feel ready",
      "you feel ready less and less often",
    ],
    looksLike: "You'll start by getting honest about what's actually stopping you. Not the surface reason, the real one. Then you'll take one small step toward the thing you've been avoiding. Then another. By the end it won't feel as heavy.",
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
  const pullquoteRef = useRef<HTMLDivElement>(null);
  const [pullquoteVisible, setPullquoteVisible] = useState(false);
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

  useEffect(() => {
    if (!pullquoteRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPullquoteVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(pullquoteRef.current);
    return () => obs.disconnect();
  }, []);

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
        body { background:#f4f2ee; color:#000332; font-family:'Codec Pro',sans-serif !important; overflow-x:hidden; }
        .prompt-card { background:white; border-radius:20px; padding:32px 36px; box-shadow:0 4px 24px rgba(0,3,50,0.08); transition:all 0.3s ease; }
        .prompt-card:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,3,50,0.12); }
        .prompt-text { animation:promptReveal 0.6s ease forwards; opacity:0; }
        @keyframes promptReveal { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .prompt-input-fake { background:rgba(0,3,50,0.03); border:1px solid rgba(0,3,50,0.08); border-radius:12px; padding:16px 20px; color:rgba(0,3,50,0.25); font-size:14px; backdrop-filter:blur(4px); }
        .stat-fadein { animation: statFade 1.5s ease-out forwards; }
        @keyframes statFade { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .pullquote-fade { opacity:0; transform:translateY(16px); transition:all 0.8s ease; }
        .pullquote-fade.visible { opacity:1; transform:translateY(0); }
        .hero-cta { display:inline-flex; align-items:center; gap:14px; background:#000332; color:#FAF7F0; padding:22px 44px; border-radius:100px; font-size:16px; font-weight:700; border:none; cursor:pointer; transition:all 0.3s ease; font-family:'Codec Pro',sans-serif; }
        .hero-cta:hover { background:#FF9090; color:#000332; transform:scale(1.04); box-shadow:0 6px 24px rgba(255,144,144,0.3); }
        .hero-cta .cta-arrow { width:24px; height:24px; background:#FF9090; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; transition:background 0.3s ease; }
        .hero-cta:hover .cta-arrow { background:#000332; color:#FAF7F0; }
        .scroll-hint { animation:scrollBounce 2s ease infinite; opacity:0.4; transition:opacity 0.3s; }
        @keyframes scrollBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(6px); } }
        .headline-row { display:block; }
        .quiz-screen { animation: fadeUp 0.3s ease forwards; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .quiz-screen, .quiz-screen * { font-family:'Codec Pro',sans-serif; }
        .quiz-card { display:flex; align-items:flex-start; gap:14px; width:100%; padding:20px 24px; border:1px solid rgba(0,3,50,0.1); border-radius:16px; background:white; cursor:pointer; text-align:left; font-family:'Codec Pro',sans-serif; font-size:15px; font-weight:500; color:#000332; line-height:1.5; transition:all 0.2s ease; box-shadow:0 2px 8px rgba(0,3,50,0.06); }
        .quiz-card:hover { background:#000332; border-color:#000332; color:#f4f2ee; }
        .quiz-card.selected { background:#000332; border-color:#000332; color:#f4f2ee; }
        .quiz-card .card-num { font-size:11px; font-weight:700; color:#FF9090; min-width:20px; padding-top:3px; transition:all 0.2s ease; }
        .quiz-card:hover .card-num { color:#FF9090; }
        .quiz-card.selected .card-num { color:#FF9090; }
        .results-grid { grid-template-columns: 1fr auto 1fr; }
        @media (max-width:768px) {
          .hero-heading { font-size:1.85rem !important; line-height:1.15 !important; }
          .hero-outer { padding:40px 24px 0 24px !important; }
          .hero-grid { grid-template-columns:1fr !important; gap:24px !important; min-height:auto !important; margin-top:40px !important; }
          .hero-left { padding-left:0 !important; padding-top:20px !important; }
          .hero-right { width:100% !important; max-width:100% !important; overflow:hidden; }
          .hero-cta { width:100%; justify-content:center; }
          .stat-row-right { flex-direction:row !important; gap:12px !important; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:8px; scroll-snap-type:x mandatory; }
          .stat-row-right > div { border-left:none !important; padding-left:0 !important; min-width:140px; flex-shrink:0 !important; flex:none !important; background:transparent; border:1px solid rgba(0,3,50,0.12); border-radius:12px; padding:16px !important; scroll-snap-align:start; }
          .stat-row-right > div p:last-child { white-space:normal; word-wrap:break-word; }
          .card-row-right { flex-direction:column !important; gap:10px !important; width:100% !important; overflow:hidden; padding:0 !important; box-sizing:border-box; }
          .card-row-right > div { flex:none !important; height:auto !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; display:block !important; margin:0 !important; }
          .card-row-right > div p { white-space:normal; word-wrap:break-word; overflow-wrap:break-word; max-width:100%; }
          .pullquote-section { padding:48px 24px !important; }
          .closing-cta { padding:48px 24px !important; }
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
            style={{ background: "none", border: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(0,3,50,0.45)", cursor: "pointer", padding: 0 }}
          >
            sign in
          </button>
        </div>
      </nav>

      {/* SIGN IN MODAL */}
      {showSignIn && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,3,50,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSignIn(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#f4f2ee", borderRadius: 24, padding: "40px 44px", maxWidth: 400, width: "100%" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#000332", marginBottom: 6 }}>welcome back.</h2>
            <p style={{ fontSize: 14, color: "rgba(0,3,50,0.5)", marginBottom: 24 }}>sign in to access your track.</p>
            {signInError && <p style={{ fontSize: 13, color: "#FF9090", marginBottom: 14 }}>{signInError}</p>}
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
        <div className="hero-outer" style={{ padding: "0 48px", paddingTop: 60, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 500, height: 500, background: "radial-gradient(circle, rgba(230,246,255,0.4) 0%, transparent 70%)", borderRadius: "50%", top: -120, right: -200, pointerEvents: "none", zIndex: 0 }} />

          {/* HERO TWO-COLUMN */}
          <div className="hero-grid" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", maxWidth: 1200, margin: "0 auto", minHeight: "calc(100vh - 120px)" }}>
            {/* LEFT: Headline + CTA */}
            <div className="hero-left" style={{ paddingLeft: "4rem" }}>
              <h1 className="hero-heading" style={{ fontSize: "clamp(36px, 6.5vw, 82px)", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.02em", marginBottom: 20 }}>
                your daily prompt<br />
                for <span style={{ fontStyle: "italic" }}>creative thinking,</span><br />
                <span style={{ color: "#FF9090", whiteSpace: "nowrap" }}>in the age of AI.</span>
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(0,3,50,0.7)", maxWidth: 480, marginBottom: 36, fontWeight: 400 }}>come play. the prompts are already warm.</p>
              <button className="hero-cta" onClick={() => go(3)}>
                start your first reset
                <span className="cta-arrow">→</span>
              </button>
              <p style={{ marginTop: 20, fontSize: 13, color: "#000332", opacity: 0.5 }}>backed by behavioral science&nbsp;&nbsp;·&nbsp;&nbsp;takes 2 minutes&nbsp;&nbsp;·&nbsp;&nbsp;free to start</p>
            </div>

            {/* RIGHT: Prompt Preview Card */}
            <div className="hero-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div className="prompt-card" style={{ width: "100%", background: "#000332", border: "none" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 16 }}>today&apos;s prompt</p>
                <p className="prompt-text" style={{ fontSize: 19, color: "#FAF7F0", lineHeight: 1.55, marginBottom: 20, fontWeight: 400, animationDelay: "0.2s" }}>
                  &ldquo;write without stopping for two minutes. don&apos;t edit. don&apos;t pause. just follow the thought.&rdquo;
                </p>
                <div className="prompt-input-fake" style={{ background: "rgba(244,242,238,0.06)", border: "1px solid rgba(244,242,238,0.1)", color: "rgba(244,242,238,0.3)" }}>start here...</div>
              </div>
            </div>
          </div>

          {/* SCROLL HINT */}
          <div style={{ textAlign: "center", paddingBottom: 24 }}>
            <svg className="scroll-hint" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000332" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </div>

          {/* STATS STRIP — reframed */}
          <div ref={statRowRef} style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 0, paddingTop: 40, paddingBottom: 40, borderTop: "1px solid rgba(0,3,50,0.08)" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "2rem", fontWeight: 700, color: "#000332", lineHeight: 1.1, marginBottom: 6 }}>2 minutes</p>
              <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", lineHeight: 1.45 }}>to return to your own thinking</p>
            </div>
            <div style={{ flex: 1, paddingLeft: 24, borderLeft: "1px solid rgba(0,3,50,0.12)" }}>
              <p style={{ fontSize: "2rem", fontWeight: 700, color: "#000332", lineHeight: 1.1, marginBottom: 6 }}>1 prompt</p>
              <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", lineHeight: 1.45 }}>a different practice every day</p>
            </div>
            <div style={{ flex: 1, paddingLeft: 24, borderLeft: "1px solid rgba(0,3,50,0.12)" }}>
              <p style={{ fontSize: "2rem", fontWeight: 700, color: "#000332", lineHeight: 1.1, marginBottom: 6 }}>0 pressure</p>
              <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", lineHeight: 1.45 }}>just you, a blank page, and space to think</p>
            </div>
          </div>

          {/* PULL-QUOTE SECTION */}
          <div ref={pullquoteRef} className="pullquote-section" style={{ maxWidth: 800, margin: "0 auto", padding: "64px 0", textAlign: "center" }}>
            <p className={`pullquote-fade ${pullquoteVisible ? "visible" : ""}`} style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700, color: "#000332", lineHeight: 1.35 }}>
              The most valuable thing you bring to your work isn&apos;t your output. It&apos;s how you think.
            </p>
          </div>

          {/* FEATURE CARDS */}
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 16, paddingBottom: 48 }}>
            <div className="card-row-right" style={{ display: "flex", gap: 16, width: "100%" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000332", borderRadius: 16, padding: "28px 28px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>daily exercises</p>
                <p style={{ fontSize: 14, color: "rgba(244,242,238,0.7)", lineHeight: 1.65, marginBottom: 10 }}>morning pages · brain dumps · timed sprints · ugly first drafts · constraint prompts</p>
                <p style={{ fontSize: 13, color: "rgba(244,242,238,0.45)", lineHeight: 1.55 }}>A different practice every day. All designed to get you out of your head and onto the page.</p>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000332", borderRadius: 16, padding: "28px 28px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>why it works</p>
                <p style={{ fontSize: 14, color: "rgba(244,242,238,0.7)", lineHeight: 1.65 }}>Each practice is designed to quiet the noise, move past resistance, and return you to your own thinking. Not to teach you something. Just to create space for something to come through.</p>
              </div>
            </div>
          </div>

          {/* CLOSING CTA SECTION */}
          <div className="closing-cta" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "48px 0 80px" }}>
            <div className="prompt-card" style={{ marginBottom: 36, textAlign: "left", background: "#000332", border: "none" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 14 }}>another one</p>
              <p style={{ fontSize: 17, color: "#FAF7F0", lineHeight: 1.55, fontWeight: 400 }}>
                &ldquo;what&apos;s one idea you&apos;ve been circling but haven&apos;t said out loud yet? say it now, badly.&rdquo;
              </p>
            </div>
            <p style={{ fontSize: 17, color: "rgba(0,3,50,0.6)", lineHeight: 1.6, marginBottom: 28 }}>you don&apos;t need to be ready. you just need to start.</p>
            <button className="hero-cta" onClick={() => go(3)}>
              start your first reset
              <span className="cta-arrow">→</span>
            </button>
            <p style={{ marginTop: 20, fontSize: 13, color: "#000332", opacity: 0.5 }}>backed by behavioral science&nbsp;&nbsp;·&nbsp;&nbsp;takes 2 minutes&nbsp;&nbsp;·&nbsp;&nbsp;free to start</p>
          </div>
        </div>
      )}

      {/* SCREEN 3: Q1 (with intro header) */}
      {screen === 3 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: 14, color: "rgba(0,3,50,0.45)", lineHeight: 1.5, marginBottom: 6 }}>a few questions to understand where you are right now.</p>
          <p style={{ fontSize: 12, color: "rgba(0,3,50,0.3)", marginBottom: 32 }}>there are no right answers. just pick what feels most true.</p>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>01 / 07</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 32 }}>
            When you sit down to think or create lately, what&apos;s the closest feeling?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ1, "full", 4)} className={`quiz-card ${q1 === "full" ? "selected" : ""}`}><span className="card-num">01</span>My head is full. Too many things competing at once.</button>
            <button onClick={() => pick(setQ1, "flat", 4)} className={`quiz-card ${q1 === "flat" ? "selected" : ""}`}><span className="card-num">02</span>I feel flat. Low energy, disconnected, not much coming up.</button>
            <button onClick={() => pick(setQ1, "stuck", 4)} className={`quiz-card ${q1 === "stuck" ? "selected" : ""}`}><span className="card-num">03</span>I&apos;m stuck. Something&apos;s there but it won&apos;t move.</button>
          </div>
        </div>
      )}

      {/* SCREEN 4: Q2 (branched) */}
      {screen === 4 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>02 / 07</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 32 }}>
            {q2Question}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q2Options.map((o, i) => (
              <button key={o.val} onClick={() => pickQ2(o.val)} className={`quiz-card ${q2 === o.val ? "selected" : ""}`}><span className="card-num">{String(i + 1).padStart(2, "0")}</span>{o.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 7: Q3 */}
      {screen === 7 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>03 / 07</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 32 }}>
            Where do you feel the block most?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ3, "head", 8)} className={`quiz-card ${q3 === "head" ? "selected" : ""}`}><span className="card-num">01</span>In my head. I can&apos;t stop thinking.</button>
            <button onClick={() => pick(setQ3, "body", 8)} className={`quiz-card ${q3 === "body" ? "selected" : ""}`}><span className="card-num">02</span>In my body. I feel tense, tired, or numb.</button>
            <button onClick={() => pick(setQ3, "habits", 8)} className={`quiz-card ${q3 === "habits" ? "selected" : ""}`}><span className="card-num">03</span>In my habits. I keep defaulting to the same patterns.</button>
            <button onClick={() => pick(setQ3, "confidence", 8)} className={`quiz-card ${q3 === "confidence" ? "selected" : ""}`}><span className="card-num">04</span>In my confidence. I don&apos;t trust what comes up.</button>
          </div>
        </div>
      )}

      {/* SCREEN 8: Q4 */}
      {screen === 8 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>04 / 07</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 32 }}>
            When it comes to AI tools, which feels most true right now?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ4, "before_thinking", 9)} className={`quiz-card ${q4 === "before_thinking" ? "selected" : ""}`}><span className="card-num">01</span>I reach for them before I&apos;ve even tried thinking myself.</button>
            <button onClick={() => pick(setQ4, "losing_something", 9)} className={`quiz-card ${q4 === "losing_something" ? "selected" : ""}`}><span className="card-num">02</span>I use them but I&apos;m aware I&apos;m losing something.</button>
            <button onClick={() => pick(setQ4, "avoid_pressure", 9)} className={`quiz-card ${q4 === "avoid_pressure" ? "selected" : ""}`}><span className="card-num">03</span>I avoid them but feel the pressure to use them more.</button>
            <button onClick={() => pick(setQ4, "found_balance", 9)} className={`quiz-card ${q4 === "found_balance" ? "selected" : ""}`}><span className="card-num">04</span>I&apos;ve found a balance. This is more about getting back to myself.</button>
          </div>
        </div>
      )}

      {/* SCREEN 9: Q5 */}
      {screen === 9 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>05 / 07</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 32 }}>
            On a good creative day, what does it feel like?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ5, "deep_focus", 10)} className={`quiz-card ${q5 === "deep_focus" ? "selected" : ""}`}><span className="card-num">01</span>I go deep on one thing and lose track of time.</button>
            <button onClick={() => pick(setQ5, "connections", 10)} className={`quiz-card ${q5 === "connections" ? "selected" : ""}`}><span className="card-num">02</span>I make unexpected connections between unrelated ideas.</button>
            <button onClick={() => pick(setQ5, "expression", 10)} className={`quiz-card ${q5 === "expression" ? "selected" : ""}`}><span className="card-num">03</span>I express something I didn&apos;t know I thought until I said it out loud.</button>
            <button onClick={() => pick(setQ5, "genuinely_mine", 10)} className={`quiz-card ${q5 === "genuinely_mine" ? "selected" : ""}`}><span className="card-num">04</span>I make something and it feels genuinely mine.</button>
          </div>
        </div>
      )}

      {/* SCREEN 10: Q6 */}
      {screen === 10 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>06 / 07</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 32 }}>
            How much time do you have each day?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ6, "5min", 11)} className={`quiz-card ${q6 === "5min" ? "selected" : ""}`}><span className="card-num">01</span>5 minutes. Keep it short and focused.</button>
            <button onClick={() => pick(setQ6, "15min", 11)} className={`quiz-card ${q6 === "15min" ? "selected" : ""}`}><span className="card-num">02</span>10 to 15 minutes. I can go a bit deeper.</button>
            <button onClick={() => pick(setQ6, "30min", 11)} className={`quiz-card ${q6 === "30min" ? "selected" : ""}`}><span className="card-num">03</span>30+ minutes. I want the full experience.</button>
          </div>
        </div>
      )}

      {/* SCREEN 11: Q7 */}
      {screen === 11 && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FF9090", marginBottom: 12 }}>07 / 07</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 32 }}>
            Three weeks from now, what would feel most meaningful?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => pick(setQ7, "clear_thinking", 12)} className={`quiz-card ${q7 === "clear_thinking" ? "selected" : ""}`}><span className="card-num">01</span>Thinking more clearly without reaching for external input first.</button>
            <button onClick={() => pick(setQ7, "finishing", 12)} className={`quiz-card ${q7 === "finishing" ? "selected" : ""}`}><span className="card-num">02</span>Actually finishing something I&apos;ve been avoiding.</button>
            <button onClick={() => pick(setQ7, "energized", 12)} className={`quiz-card ${q7 === "energized" ? "selected" : ""}`}><span className="card-num">03</span>Feeling creatively energized again.</button>
            <button onClick={() => pick(setQ7, "trusting", 12)} className={`quiz-card ${q7 === "trusting" ? "selected" : ""}`}><span className="card-num">04</span>Trusting my own ideas again.</button>
          </div>
        </div>
      )}

      {/* SCREEN 12: RESULTS + ACCOUNT CREATION */}
      {screen === 12 && result && (
        <div key={fadeKey} className="quiz-screen" style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "120px 48px 80px" }}>
          <div className="results-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, maxWidth: 960, width: "100%", margin: "0 auto", alignItems: "center" }}>
            {/* LEFT: Track result */}
            <div style={{ paddingRight: 48 }}>
              <div style={{ background: "#000332", borderRadius: 16, padding: 40, border: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(circle, rgba(255,144,144,0.08) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF9090", marginBottom: 20, position: "relative" }}>your track: {result.name}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, position: "relative" }}>
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

                <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 20 }} />

                <p style={{ fontSize: 14, color: "rgba(244,242,238,0.7)", lineHeight: 1.75, marginBottom: 20, position: "relative" }}>
                  {result.body}
                </p>

                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF9090", marginBottom: 10, position: "relative" }}>you might recognize this if:</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", position: "relative" }}>
                  {result.recognize.map((r, i) => (
                    <li key={i} style={{ fontSize: 13, color: "rgba(244,242,238,0.55)", lineHeight: 1.6, paddingLeft: 14, position: "relative", marginBottom: 4 }}>
                      <span style={{ position: "absolute", left: 0, color: "rgba(244,242,238,0.25)" }}>&bull;</span>
                      {r}
                    </li>
                  ))}
                </ul>

                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF9090", marginBottom: 10, position: "relative" }}>what your track looks like:</p>
                <p style={{ fontSize: 13, color: "rgba(244,242,238,0.55)", lineHeight: 1.7, marginBottom: 20, position: "relative" }}>
                  {result.looksLike}
                </p>

                <p style={{ fontSize: 11, color: "rgba(244,242,238,0.3)", position: "relative" }}>14 days. one practice a day. free to start.</p>
              </div>
            </div>

            {/* DIVIDER */}
            <div style={{ width: 1, background: "rgba(0,3,50,0.1)", alignSelf: "stretch" }} />

            {/* RIGHT: Account creation */}
            <div style={{ paddingLeft: 48 }}>
              <h3 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#000332", marginBottom: 8 }}>
                one last thing before you begin.
              </h3>
              <p style={{ fontSize: 14, color: "rgba(0,3,50,0.5)", lineHeight: 1.6, marginBottom: 24 }}>
                create a free account to save your progress.
              </p>
              {signupError && <p style={{ fontSize: 13, color: "#FF9090", marginBottom: 14 }}>{signupError}</p>}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your email" style={{ padding: "16px 20px", border: "1.5px solid rgba(0,3,50,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#000332", outline: "none", marginBottom: 10, width: "100%" }} />
              <div style={{ position: "relative", marginBottom: 14 }}>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="create a password" style={{ padding: "16px 20px", paddingRight: 48, border: "1.5px solid rgba(0,3,50,0.15)", borderRadius: 100, background: "transparent", fontFamily: "'Codec Pro',sans-serif", fontSize: 14, color: "#000332", outline: "none", width: "100%" }} />
                <button onClick={() => setShowPassword(!showPassword)} type="button" style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(0,3,50,0.35)", fontFamily: "'Codec Pro',sans-serif" }}>
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
              <button onClick={handleSignup} disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#000332", color: "#f4f2ee", padding: "16px 32px", borderRadius: 100, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", width: "fit-content", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "creating your account..." : "create my account"}
                <span style={{ width: 20, height: 20, background: "#FF9090", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>→</span>
              </button>
              <button onClick={() => setShowSignIn(true)} style={{ background: "none", border: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 12, color: "rgba(0,3,50,0.4)", cursor: "pointer", marginTop: 16, padding: 0, textDecoration: "underline", textUnderlineOffset: 3, display: "block" }}>already have an account? sign in</button>
              <button onClick={() => go(3)} style={{ background: "none", border: "none", fontFamily: "'Codec Pro',sans-serif", fontSize: 12, color: "rgba(0,3,50,0.4)", cursor: "pointer", marginTop: 8, padding: 0, textDecoration: "underline", textUnderlineOffset: 3, display: "block" }}>want to retake the quiz?</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
