"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import styles from "@/styles/homepage.module.css";
import { supabase } from "@/lib/supabase";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const fadeUp = (visible: boolean, delay = 0) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? "translateY(0)" : "translateY(40px)",
  transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
});

const BODY_FONT = "'Codec Pro', var(--font-jakarta), 'Plus Jakarta Sans', -apple-system, sans-serif";
const MONO_FONT = "var(--font-mono), 'DM Mono', monospace";

const LABEL = (color = "#FF9090"): React.CSSProperties => ({
  fontFamily: MONO_FONT, fontSize: 11, fontWeight: 700,
  letterSpacing: "0.2em", textTransform: "uppercase", color, marginBottom: 16,
});

// ─── SECTION 1: THE PROBLEM ───
function ProblemSection() {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} style={{ background: "#FAF7F0", padding: "100px 24px 80px", fontFamily: BODY_FONT }}>
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...fadeUp(visible), ...LABEL() }}>THE PROBLEM</div>
        <h2 style={{ ...fadeUp(visible, 0.1), fontFamily: "Georgia, serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, color: "#000332", lineHeight: 1.2, marginBottom: 28 }}>
          Speed without clarity is just expensive guessing.
        </h2>
        <p style={{ ...fadeUp(visible, 0.2), fontSize: 18, color: "#666", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 36px" }}>
          Before you&rsquo;ve untangled the mess. Before you&rsquo;ve seen the angles you&rsquo;re missing. Before you&rsquo;ve actually decided. Before you can say it in one sentence. You act anyway &mdash; and spend weeks fixing what 15 minutes of thinking would have prevented.
        </p>
        <p style={{ ...fadeUp(visible, 0.35), fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#000332", lineHeight: 1.5 }}>
          You haven&rsquo;t figured out what you believe yet. Everything downstream is guessing.
        </p>
      </div>
    </div>
  );
}

// ─── SECTION 2: HOW IT WORKS ───
function HowItWorks() {
  const { ref, visible } = useInView();
  const cards = [
    { num: "01", title: "Dump it", color: "#FF9090", desc: "Type what\u2019s on your mind. No structure needed. Just get the messy thought out so you can see it.", before: "scattered thoughts", after: "a clear starting point" },
    { num: "02", title: "Go deeper", color: "#6B8AFE", desc: "Primer asks you two sharp questions grounded in expert thinking frameworks. Each one goes one layer deeper than the last.", before: "surface-level ideas", after: "root-level clarity" },
    { num: "03", title: "Explore dimensions", color: "#7ED6A8", desc: "Your thinking splits into 4 dimensions. You work through each one with questions that clarify, expand, decide, and express.", before: "everything tangled together", after: "each angle explored" },
    { num: "04", title: "Get your brief", color: "#C4A6FF", desc: "Primer assembles your thinking into a brief. Your words, organized. Blind spots flagged. Assumptions named. Ready to act on.", before: "messy notes", after: "conviction" },
  ];
  return (
    <div ref={ref} style={{ background: "#000332", padding: "100px 24px", fontFamily: BODY_FONT }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...fadeUp(visible), ...LABEL() }}>HOW IT WORKS</div>
        <h2 style={{ ...fadeUp(visible, 0.1), fontFamily: "Georgia, serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: "#FAF7F0", lineHeight: 1.2, marginBottom: 48 }}>
          15 minutes. Four steps. You walk out certain.
        </h2>
        <div className="hiw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              ...fadeUp(visible, 0.2 + i * 0.15),
              background: "rgba(250,247,240,0.04)", borderRadius: 16,
              borderTop: `3px solid ${c.color}`, padding: "24px 20px",
              textAlign: "left",
            }}>
              <div style={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 700, color: c.color, marginBottom: 8 }}>{c.num}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#FAF7F0", marginBottom: 10 }}>{c.title}</div>
              <p style={{ fontSize: 14, color: "rgba(250,247,240,0.55)", lineHeight: 1.65, marginBottom: 20 }}>{c.desc}</p>
              <div style={{ fontFamily: MONO_FONT, fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "rgba(250,247,240,0.35)" }}>{c.before}</span>
                <span style={{ color: c.color, fontWeight: 700 }}>&rarr;</span>
                <span style={{ color: "#FAF7F0", fontWeight: 600 }}>{c.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 3: WHAT YOU GET ───
function WhatYouGet() {
  const { ref, visible } = useInView();
  const sections = [
    { color: "#FF9090", heading: "The real problem", content: "You\u2019re not competing on features. You\u2019re competing on whether they trust you to understand their world." },
    { color: "#6B8AFE", heading: "Where you actually are", content: "You haven\u2019t figured out what you believe yet. Everything downstream is guessing.", bold: true },
    { color: "#7ED6A8", heading: "What was clouding it", content: "You kept comparing yourself to tools that solve a different problem." },
    { color: "#C4A6FF", heading: "The move", content: "Write the landing page for the person who just spent 45 minutes going in circles with AI." },
  ];
  return (
    <div ref={ref} style={{ background: "#FAF7F0", padding: "100px 24px", fontFamily: BODY_FONT }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...fadeUp(visible), ...LABEL() }}>WHAT YOU GET</div>
        <h2 style={{ ...fadeUp(visible, 0.1), fontFamily: "Georgia, serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: "#000332", lineHeight: 1.2, marginBottom: 10 }}>
          A brief that&rsquo;s entirely yours.
        </h2>
        <p style={{ ...fadeUp(visible, 0.15), fontSize: 16, color: "#888", marginBottom: 40 }}>
          Every word came from you. Primer assembled the mosaic.
        </p>
        <div style={{ ...fadeUp(visible, 0.25), background: "#000332", borderRadius: 20, padding: "36px 32px", textAlign: "left", maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#FF9090", marginBottom: 20 }}>YOUR BRIEF</div>
          {sections.map((s, i) => (
            <div key={i} style={{
              ...fadeUp(visible, 0.35 + i * 0.15),
              borderLeft: `3px solid ${s.color}`, paddingLeft: 14, marginBottom: 18,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#FAF7F0", marginBottom: 3 }}>{s.heading}</div>
              <div style={{ fontSize: 14, color: "rgba(250,247,240,0.65)", lineHeight: 1.6, fontWeight: s.bold ? 700 : 400, ...(s.bold ? { color: "#FAF7F0" } : {}) }}>{s.content}</div>
            </div>
          ))}
          <div style={{
            ...fadeUp(visible, 0.95),
            borderLeft: "3px dashed rgba(250,247,240,0.2)", paddingLeft: 14, marginTop: 24,
          }}>
            <div style={{ fontFamily: MONO_FONT, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "rgba(250,247,240,0.35)", marginBottom: 4 }}>PATTERN DETECTED</div>
            <div style={{ fontSize: 13, color: "rgba(250,247,240,0.5)", lineHeight: 1.55 }}>
              <strong style={{ color: "rgba(250,247,240,0.7)" }}>Assumption:</strong> you&rsquo;re assuming founders compare tools before buying. What if they don&rsquo;t shop &mdash; they just grab whatever&rsquo;s in front of them?
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 4: BLIND SPOTS ───
function BlindSpots() {
  const { ref, visible } = useInView();
  const patterns = [
    { label: "Contradiction", desc: "You said two things that can\u2019t both be true." },
    { label: "Sunk cost", desc: "You\u2019re defending a decision because of what you invested, not because it\u2019s right." },
    { label: "Avoidance", desc: "There\u2019s something relevant you keep steering away from." },
    { label: "Premature closure", desc: "You landed on your answer in the first minute. Everything since supports it." },
    { label: "Projection", desc: "You keep saying \u2018people want\u2019 when you mean \u2018I want.\u2019" },
    { label: "Binary thinking", desc: "You framed it as A or B. There are at least four options." },
  ];
  return (
    <div ref={ref} style={{ background: "rgba(0,3,50,0.03)", padding: "100px 24px", fontFamily: BODY_FONT }}>
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...fadeUp(visible), ...LABEL() }}>YOUR BLIND SPOTS, SURFACED</div>
        <h2 style={{ ...fadeUp(visible, 0.1), fontFamily: "Georgia, serif", fontSize: "clamp(24px,4vw,38px)", fontWeight: 700, color: "#000332", lineHeight: 1.2, marginBottom: 10 }}>
          Primer catches what your brain can&rsquo;t.
        </h2>
        <p style={{ ...fadeUp(visible, 0.15), fontSize: 16, color: "#888", marginBottom: 40 }}>
          21 cognitive patterns detected in real time. Things like:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {patterns.map((p, i) => (
            <div key={i} style={{
              ...fadeUp(visible, 0.2 + i * 0.1),
              background: "#fff", borderRadius: 12,
              borderLeft: "3px dashed #000332", padding: "20px 24px",
              textAlign: "left",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 5: THEN TAKE IT TO AI ───
function TakeToAI() {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} style={{ background: "#FAF7F0", padding: "100px 24px", fontFamily: BODY_FONT }}>
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...fadeUp(visible), ...LABEL() }}>THEN WHAT</div>
        <h2 style={{ ...fadeUp(visible, 0.1), fontFamily: "Georgia, serif", fontSize: "clamp(24px,4vw,38px)", fontWeight: 700, color: "#000332", lineHeight: 1.2, marginBottom: 16 }}>
          Copy your brief into any AI chat.
        </h2>
        <p style={{ ...fadeUp(visible, 0.15), fontSize: 16, color: "#888", lineHeight: 1.7, maxWidth: 640, margin: "0 auto 40px" }}>
          Your brief becomes the perfect prompt. Primer figures out the right deliverable &mdash; a strategy doc, a decision framework, an action plan &mdash; and formats it so any AI gives you exactly what you need. No back-and-forth. No rewording. One paste, one enter, done.
        </p>
        <div style={{ ...fadeUp(visible, 0.25), background: "#000332", borderRadius: 16, padding: "28px 28px", textAlign: "left", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "#FF9090", marginBottom: 16 }}>YOUR AI PROMPT (AUTO-GENERATED)</div>
          <p style={{ fontFamily: MONO_FONT, fontSize: 12, color: "rgba(250,247,240,0.35)", lineHeight: 1.7, marginBottom: 10 }}>
            Here&rsquo;s my thinking on &ldquo;how to position my product.&rdquo; I used Primer to work through this...
          </p>
          <p style={{ fontFamily: MONO_FONT, fontSize: 12, color: "rgba(250,247,240,0.35)", lineHeight: 1.7, marginBottom: 16 }}>
            My brief: [your synthesis]
          </p>
          <p style={{
            ...fadeUp(visible, 0.55),
            fontFamily: MONO_FONT, fontSize: 13, color: "#FAF7F0", fontWeight: 700, lineHeight: 1.7,
            textShadow: visible ? "0 0 20px rgba(255,144,144,0.15)" : "none",
          }}>
            Now help me act on this: Create a one-page positioning document with target audience, core problem, unique value prop, key messaging, and 3 tagline options.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 6: WHO IT'S FOR ───
function WhoItsFor() {
  const { ref, visible } = useInView();
  const personas = [
    { title: "Founders", color: "#FF9090", quotes: "Should I pivot or double down? I need to figure out my positioning. I can\u2019t explain my product in one line." },
    { title: "Strategists & PMs", color: "#6B8AFE", quotes: "I need to present this to leadership. I\u2019m stuck between two approaches. My thinking is messy and I need to organize it." },
    { title: "Creators & consultants", color: "#7ED6A8", quotes: "I have ideas but I can\u2019t articulate them. I know what I think but I can\u2019t write it down. I need structure, not AI writing for me." },
  ];
  return (
    <div ref={ref} style={{ background: "#000332", padding: "100px 24px", fontFamily: BODY_FONT }}>
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ ...fadeUp(visible), fontFamily: "Georgia, serif", fontSize: "clamp(24px,4vw,38px)", fontWeight: 700, color: "#FAF7F0", lineHeight: 1.2, marginBottom: 48 }}>
          People who think for a living.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          {personas.map((p, i) => (
            <div key={i} style={{
              ...fadeUp(visible, 0.15 + i * 0.15),
              background: "rgba(250,247,240,0.04)", borderRadius: 16,
              borderTop: `3px solid ${p.color}`, padding: "28px 24px",
              textAlign: "left",
            }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: p.color, marginBottom: 12 }}>{p.title}</div>
              <p style={{ fontSize: 14, color: "rgba(250,247,240,0.5)", lineHeight: 1.7, fontStyle: "italic" }}>{p.quotes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 7: THE LINE ───
function TheLine() {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} style={{ background: "#FAF7F0", padding: "120px 24px", textAlign: "center", fontFamily: BODY_FONT }}>
      <p style={{ ...fadeUp(visible), fontFamily: "Georgia, serif", fontSize: "clamp(22px,3.5vw,32px)", color: "#000332", lineHeight: 1.5, marginBottom: 8 }}>
        Most people use AI to think for them.
      </p>
      <p style={{ ...fadeUp(visible, 0.3), fontFamily: "Georgia, serif", fontSize: "clamp(22px,3.5vw,32px)", color: "#888", lineHeight: 1.5, marginBottom: 8 }}>
        The best use it after they&rsquo;ve done the thinking.
      </p>
      <p style={{
        ...fadeUp(visible, 0.6),
        fontFamily: "Georgia, serif", fontSize: "clamp(18px,2.5vw,24px)", color: "#FF9090", lineHeight: 1.5,
        animation: visible ? "coralGlow 3s ease-in-out 1.4s infinite" : "none",
      }}>
        Primer is where that happens.
      </p>
    </div>
  );
}

// ─── SECTION 8: FINAL CTA ───
function FinalCTA() {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} style={{ background: "#000332", padding: "100px 24px 80px", textAlign: "center", fontFamily: BODY_FONT }}>
      <h2 style={{ ...fadeUp(visible), fontFamily: "Georgia, serif", fontSize: "clamp(28px,4.5vw,44px)", fontWeight: 700, color: "#FAF7F0", lineHeight: 1.2, marginBottom: 14 }}>
        15 minutes. One clear thought.
      </h2>
      <p style={{ ...fadeUp(visible, 0.1), fontSize: 16, color: "rgba(250,247,240,0.45)", marginBottom: 32 }}>
        Free during early access. You&rsquo;re one of the first.
      </p>
      <div style={fadeUp(visible, 0.3)}>
        <Link href="/auth" style={{
          display: "inline-block", background: "#FF9090", color: "#000332",
          fontFamily: BODY_FONT, fontSize: 16, fontWeight: 700,
          padding: "16px 40px", borderRadius: 32, textDecoration: "none",
          transform: visible ? "scale(1)" : "scale(0.95)",
          transition: "transform 0.6s ease 0.3s, opacity 0.8s ease 0.3s",
          opacity: visible ? 1 : 0,
        }}>
          Start thinking &rarr;
        </Link>
      </div>
      <div style={{ ...fadeUp(visible, 0.5), display: "flex", justifyContent: "center", gap: 8, marginTop: 28 }}>
        {["#FF9090", "#6B8AFE", "#7ED6A8", "#C4A6FF"].map((c, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}60` }} />
        ))}
      </div>
      <p style={{ ...fadeUp(visible, 0.6), fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 14, color: "rgba(250,247,240,0.2)", marginTop: 28 }}>
        primer &mdash; the work before the work.
      </p>
    </div>
  );
}

// ─── MAIN HOMEPAGE ───
export default function Homepage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setLoggedIn(true); });
  }, []);

  useEffect(() => {
    const nav = document.getElementById("nav");
    const handleScroll = () => {
      nav?.classList.toggle(
        styles.scrolled,
        window.scrollY > window.innerHeight * 0.8
      );
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const cycleWords = ["clearly", "deeply", "originally", "boldly"];
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIdx((i) => (i + 1) % cycleWords.length);
        setWordVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* NAV */}
      <nav className={styles.nav} id="nav">
        <div className={styles.navLogo}>primer</div>
        {loggedIn ? (
          <Link href="/studio" className={styles.navSign}>studio</Link>
        ) : (
          <Link href="/auth" className={styles.navSign}>sign in</Link>
        )}
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.mesh}></div>
        <div className={styles.grain}></div>
        <div className={styles.particles}>
          <div className={styles.p}></div>
          <div className={styles.p}></div>
          <div className={styles.p}></div>
          <div className={styles.p}></div>
          <div className={styles.p}></div>
        </div>
        <div className={styles.heroDivider}></div>

        {/* LEFT: copy */}
        <div className={styles.heroLeft}>
          <h1 className={styles.heroHeadline}>
            Think{" "}
            <em
              className={styles.hlCoral}
              style={{
                display: "inline-block",
                minWidth: "4.5ch",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                opacity: wordVisible ? 1 : 0,
                transform: wordVisible ? "translateY(0)" : "translateY(-8px)",
              }}
            >
              {cycleWords[wordIdx]}
            </em>
            <br />
            before you prompt.
          </h1>
          <p className={styles.heroSub} style={{ fontSize: 16, opacity: 0.7, marginBottom: 8 }}>
            Before you write the strategy doc, make the decision, or open Claude, use Primer to think it through properly.
          </p>
          <p className={styles.heroSub} style={{ fontSize: 14, opacity: 0.45, marginBottom: 28 }}>
            Expert thinking frameworks. Questions that adapt to you. A canvas where your ideas take shape.
          </p>
          <Link href="/auth" className={styles.heroCta}>
            Start thinking
            <span className={styles.ctaDot}>&rarr;</span>
          </Link>
          <div className={styles.heroProofRow}>
            <span>Used by founders, marketers, and operators working through real decisions</span>
          </div>
        </div>

        {/* RIGHT: orbital animation */}
        <div className={styles.heroRight}>
          <div className={styles.orbitalSystem}>
            <div className={`${styles.ring} ${styles.ring1}`}></div>
            <div className={`${styles.ring} ${styles.ring2}`}></div>
            <div className={`${styles.ring} ${styles.ring3}`}></div>
            <div className={styles.core}>
              <div className={styles.coreAura}></div>
              <div className={styles.coreGlow}></div>
              <div className={styles.coreInner}></div>
            </div>
            <div className={styles.orbWm}>
              <div className={styles.owWord}>primer.</div>
            </div>

            {/* Node 1: Capture */}
            <div className={`${styles.node} ${styles.n1}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim}>
                  <div className={styles.ethHeadWrap}>
                    <div className={styles.ethPuff}></div>
                    <div className={styles.ethPuff}></div>
                    <div className={styles.ethPuff}></div>
                    <div className={styles.ethPuff}></div>
                    <div className={styles.ethSkull}></div>
                  </div>
                </div>
                <div className={styles.nodeLabel}>Capture</div>
              </div>
            </div>

            {/* Node 2: Clarify */}
            <div className={`${styles.node} ${styles.n2}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim}>
                  <div className={styles.sparkWrap}>
                    <div className={styles.sparkLine}></div>
                    <div className={styles.sparkLine}></div>
                    <div className={styles.sparkLine}></div>
                    <div className={styles.sparkDot}></div>
                  </div>
                </div>
                <div className={styles.nodeLabel}>Clarify</div>
              </div>
            </div>

            {/* Node 3: Expand */}
            <div className={`${styles.node} ${styles.n3}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim}>
                  <div className={styles.bloomWrap}>
                    <div className={styles.bloomPetal}></div>
                    <div className={styles.bloomPetal}></div>
                    <div className={styles.bloomPetal}></div>
                    <div className={styles.bloomPetal}></div>
                    <div className={styles.bloomCore}></div>
                  </div>
                </div>
                <div className={styles.nodeLabel}>Expand</div>
              </div>
            </div>

            {/* Node 4: Decide */}
            <div className={`${styles.node} ${styles.n4}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim}>
                  <div className={styles.otatWrap}>
                    <div className={styles.otatItem}><div className={styles.otatC}></div></div>
                    <div className={styles.otatItem}><div className={styles.otatS}></div></div>
                    <div className={styles.otatItem}><div className={styles.otatL}></div></div>
                  </div>
                </div>
                <div className={styles.nodeLabel}>Decide</div>
              </div>
            </div>

            {/* Node 5: Express */}
            <div className={`${styles.node} ${styles.n5}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim}>
                  <div className={styles.refillWrap}>
                    <div className={styles.refillDrip}></div>
                    <div className={styles.refillGlass}>
                      <div className={styles.refillLiq}>
                        <div className={styles.refillRip}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.nodeLabel}>Express</div>
              </div>
            </div>

            {/* Node 6: Canvas */}
            <div className={`${styles.node} ${styles.n6}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim} style={{ position: "relative" }}>
                  <div className={styles.miyShape}></div>
                  <div className={styles.miyDot}></div>
                </div>
                <div className={styles.nodeLabel}>Canvas</div>
              </div>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div className={styles.scrollHint}>
          <div className={styles.scrollHintLine}></div>
        </div>

        {/* cream curve transition */}
        <svg className={styles.heroCurve} viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60 Q720 0 1440 60 L1440 60 L0 60Z" fill="#FAF7F0" />
        </svg>
      </section>

      {/* ─── NEW SECTIONS ─── */}
      <ProblemSection />
      <HowItWorks />
      <WhatYouGet />
      <BlindSpots />
      <TakeToAI />
      <WhoItsFor />
      <TheLine />
      <FinalCTA />

      <style>{`
        @keyframes coralGlow {
          0%, 100% { text-shadow: 0 0 0 rgba(255,144,144,0); }
          50% { text-shadow: 0 0 20px rgba(255,144,144,0.3); }
        }
        @media (max-width: 900px) {
          .hiw-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .hiw-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
