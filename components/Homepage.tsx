"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import styles from "@/styles/homepage.module.css";
import { supabase } from "@/lib/supabase";

function useInView(threshold = 0.2) {
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
  transform: visible ? "translateY(0)" : "translateY(16px)",
  transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
});

function CanvasVisual() {
  const { ref, visible } = useInView();
  const dims = ["Who you're really for", "The gap only you fill", "Why now matters", "The one-line pitch"];
  const thinkingNotes = [
    { label: "YOUR SEED", text: "Founders who are sick of tools that think for them instead of helping them think", sym: "◎", color: "#6B8AFE", x: 16, y: 210 },
    { label: "YOUR SHIFT", text: "The real competition isn't other tools — it's the blank page and going in circles", sym: "✦", color: "#FF9090", x: 210, y: 220 },
    { label: "YOUR ROOT", text: "People don't need more AI outputs. They need to know what to ask for.", sym: "⟁", color: "#7ED6A8", x: 410, y: 215 },
  ];
  const aiNotes = [
    { label: "CLARIFY ↓", text: "List 3 people who tried other tools and gave up. Why?", color: "#6B8AFE", x: 30, y: 330 },
    { label: "EXPAND ↓", text: "Write what your user says to a friend the day after using this", color: "#FF9090", x: 230, y: 340 },
  ];
  return (
    <div ref={ref} style={{ background: "#FAF7F0", padding: "60px 24px 40px", textAlign: "center" }}>
      <h2 style={{ ...fadeUp(visible), fontFamily: "'Codec Pro',sans-serif", fontSize: "clamp(22px,3vw,28px)", fontWeight: 400, fontStyle: "italic", color: "#000332", marginBottom: 10 }}>
        See what a session looks like
      </h2>
      <p style={{ ...fadeUp(visible, 0.1), fontSize: 15, color: "rgba(0,3,50,0.45)", fontWeight: 300, marginBottom: 40 }}>
        From messy thought to structured thinking in 15 minutes.
      </p>
      <div style={{ ...fadeUp(visible, 0.2), maxWidth: 750, margin: "0 auto", background: "#F5F2ED", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden", position: "relative", height: 440, fontFamily: "'Codec Pro',sans-serif" }}>
        {/* Mini toolbar */}
        <div style={{ ...fadeUp(visible, 0.3), position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 5, display: "flex", alignItems: "center", gap: 4, background: "#fff", borderRadius: 100, padding: "5px 10px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", fontSize: 11, color: "#000332", fontWeight: 600 }}>
          <span style={{ padding: "0 6px" }}>+ Note</span>
          <span style={{ padding: "0 6px" }}>Connect</span>
          <span style={{ width: 1, height: 14, background: "rgba(0,3,50,0.1)", margin: "0 2px" }} />
          <span style={{ color: "#6B8AFE", fontSize: 13 }}>◎</span>
          <span style={{ color: "#FF9090", fontSize: 13 }}>✦</span>
          <span style={{ color: "#7ED6A8", fontSize: 13 }}>⟁</span>
          <span style={{ color: "#C4A6FF", fontSize: 13 }}>◈</span>
        </div>
        <div style={{ ...fadeUp(visible, 0.3), position: "absolute", top: 12, right: 12, zIndex: 5, background: "#FF9090", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "#000332" }}>
          Ready to go? &rarr;
        </div>
        {/* Goal note */}
        <div style={{ ...fadeUp(visible, 0.35), position: "absolute", top: 50, left: 16, width: 170, background: "rgba(0,3,50,0.05)", border: "1px solid rgba(0,3,50,0.1)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: "#000332", marginBottom: 3, opacity: 0.6 }}>YOUR GOAL</div>
          <div style={{ fontSize: 11, color: "#000332", lineHeight: 1.45, fontWeight: 400 }}>how do I position my product in a crowded market</div>
        </div>
        {/* Dimension headers */}
        {dims.map((d, i) => (
          <div key={i} style={{ ...fadeUp(visible, 0.4 + i * 0.08), position: "absolute", top: 130, left: 16 + i * 182, width: 165, background: "#000332", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: "#FF9090", marginBottom: 2 }}>DIMENSION {i + 1}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#FAF7F0", lineHeight: 1.3 }}>{d}</div>
          </div>
        ))}
        {/* Thinking notes */}
        {thinkingNotes.map((n, i) => (
          <div key={i} style={{ ...fadeUp(visible, 0.65 + i * 0.1), position: "absolute", top: n.y, left: n.x, width: 175, background: "rgba(255,144,144,0.04)", border: "1px solid rgba(255,144,144,0.15)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: "#FF9090", opacity: 0.7 }}>{n.label}</div>
              <span style={{ fontSize: 12, color: n.color, opacity: 0.6 }}>{n.sym}</span>
            </div>
            <div style={{ fontSize: 11, color: "#000332", lineHeight: 1.45, fontWeight: 300 }}>{n.text}</div>
          </div>
        ))}
        {/* AI instruction notes */}
        {aiNotes.map((n, i) => (
          <div key={i} style={{ ...fadeUp(visible, 0.9 + i * 0.1), position: "absolute", top: n.y, left: n.x, width: 175, background: `${n.color}08`, border: `1px solid ${n.color}30`, borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: "#FF9090", marginBottom: 3 }}>YOUR TURN</div>
            <div style={{ fontSize: 11, color: "#000332", lineHeight: 1.45, fontFamily: "Georgia,serif", fontStyle: "italic", opacity: 0.75 }}>{n.text}</div>
          </div>
        ))}
        {/* SVG arrows */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
          {/* goal → dim 1 */}
          <path d="M 100 105 Q 80 120 90 130" fill="none" stroke="rgba(0,3,50,0.08)" strokeWidth="1" />
          {/* dim → thinking notes */}
          <path d="M 90 175 Q 90 195 95 210" fill="none" stroke="rgba(0,3,50,0.08)" strokeWidth="1" />
          <path d="M 290 175 Q 290 200 295 220" fill="none" stroke="rgba(0,3,50,0.08)" strokeWidth="1" />
          <path d="M 490 175 Q 490 198 490 215" fill="none" stroke="rgba(0,3,50,0.08)" strokeWidth="1" />
          {/* thinking → AI notes */}
          <path d="M 95 280 Q 80 310 95 330" fill="none" stroke="#6B8AFE" strokeWidth="1" opacity="0.25" />
          <path d="M 300 290 Q 290 320 300 340" fill="none" stroke="#FF9090" strokeWidth="1" opacity="0.25" />
        </svg>
      </div>
    </div>
  );
}

function OutcomePreview() {
  const { ref, visible } = useInView();
  const cards = [
    {
      icon: "◎", label: "Clarity", color: "#6B8AFE", tag: "YOUR CLARITY BRIEF",
      sections: [
        { h: "The real problem", t: "You're not competing on features. You're competing on whether they trust you to understand their world." },
        { h: "What was clouding it", t: "You kept comparing yourself to tools that solve a different problem." },
        { h: "The move", t: "Write the landing page for the person who just spent 45 minutes going in circles with AI." },
      ],
    },
    {
      icon: "✦", label: "Expansion", color: "#FF9090", tag: "YOUR STRONGEST DIRECTIONS",
      sections: [
        { h: "Direction 1: The pre-meeting primer", t: "Position it as the 15 minutes before every important meeting." },
        { h: "Direction 2: The AI prep layer", t: "The step before ChatGPT. People prime their thinking so their prompts are 10x better." },
        { h: "The one to start with", t: "Direction 2. More specific, easier to demonstrate, and closer to the real value." },
      ],
    },
    {
      icon: "⟁", label: "Decision", color: "#7ED6A8", tag: "YOUR DECISION BRIEF",
      sections: [
        { h: "The decision", t: "Launch with solo founders first, not teams." },
        { h: "Why this and not that", t: "Solo founders feel the pain more acutely. They don't have a team to bounce ideas off." },
        { h: "The risk you're accepting", t: "Slower revenue growth. But the product-market signal will be clearer." },
        { h: "First move by Friday", t: "Write 5 DMs to solo founders you know." },
      ],
    },
    {
      icon: "◈", label: "Expression", color: "#C4A6FF", tag: "YOUR ARTICULATED POSITION",
      sections: [
        { h: "The statement", t: "Every AI tool gives you answers. Primer makes you think first. In 15 minutes, you'll go from scattered thoughts to something you can act on." },
        { h: "The headline version", t: "Think clearly before you prompt." },
        { h: "The objection they should expect", t: "'I can just think on my own.' You can. But when's the last time you sat with an idea for 15 minutes without reaching for a tool?" },
      ],
    },
  ];
  return (
    <div ref={ref} style={{ background: "#FAF7F0", padding: "40px 24px 40px" }}>
      <h2 style={{ ...fadeUp(visible), fontFamily: "'Codec Pro',sans-serif", fontSize: "clamp(22px,3vw,26px)", fontWeight: 700, fontStyle: "italic", color: "#000332", textAlign: "center", marginBottom: 40, letterSpacing: "-0.01em" }}>
        In 15 minutes, you&rsquo;ll walk out with:
      </h2>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {cards.map((c, ci) => (
          <div key={ci} style={{
            ...fadeUp(visible, 0.1 + ci * 0.1),
            background: "#fff", borderRadius: 14, padding: "24px 24px",
            transition: "transform 0.2s, box-shadow 0.2s, opacity 0.5s, transform 0.5s",
            cursor: "default",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = visible ? "translateY(0)" : "translateY(16px)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18, color: c.color }}>{c.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#000332" }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: c.color, marginBottom: 14 }}>{c.tag}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {c.sections.map((s, si) => (
                <div key={si} style={{ borderLeft: `3px solid ${c.color}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#000332", marginBottom: 2 }}>{s.h}</div>
                  <div style={{ fontSize: 13, color: "rgba(0,3,50,0.55)", fontWeight: 300, lineHeight: 1.55 }}>{s.t}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            Start your first canvas
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
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkBurst}></div>
                    <div className={styles.sparkCoreNode}></div>
                  </div>
                </div>
                <div className={styles.nodeLabel}>Clarify</div>
              </div>
            </div>

            {/* Node 3: Expand */}
            <div className={`${styles.node} ${styles.n3}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim}>
                  <div className={styles.mifWrap}>
                    <div className={styles.mifLine}></div>
                    <svg className={styles.mifSvg} width="20" height="16" viewBox="0 0 20 16" fill="none">
                      <path d="M0 8H14M14 8L7 1M14 8L7 15" stroke="#E8C97A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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

      {/* CREAM PAGE PARTICLES */}
      <div className={styles.creamParticles}>
        <div className={styles.cp}></div>
        <div className={styles.cp}></div>
        <div className={styles.cp}></div>
        <div className={styles.cp}></div>
        <div className={styles.cp}></div>
        <div className={styles.cp}></div>
        <div className={styles.cp}></div>
      </div>

      {/* CANVAS VISUAL SECTION */}
      <CanvasVisual />

      {/* OUTCOME PREVIEW SECTION */}
      <OutcomePreview />

      {/* THINKING MODES */}
      <div className={styles.modesSection}>
        <div className={styles.modesEyebrow}>How it works</div>
        <h2 className={styles.modesHeading}>Four thinking modes</h2>
        <p className={styles.modesSub}>Every session adapts to what your thinking actually needs</p>
        <div className={styles.modesGrid}>
          <div className={styles.modeCard} style={{ borderColor: "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6B8AFE")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}>
            <span className={styles.modeIcon} style={{ color: "#6B8AFE" }}>◎</span>
            <div className={styles.modeTitle}>Clarity</div>
            <p className={styles.modeDesc}>Untangle messy thinking. Separate signal from noise. Find the core thread.</p>
          </div>
          <div className={styles.modeCard} style={{ borderColor: "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#FF9090")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}>
            <span className={styles.modeIcon} style={{ color: "#FF9090" }}>✦</span>
            <div className={styles.modeTitle}>Expansion</div>
            <p className={styles.modeDesc}>Stretch an idea in unexpected directions. Find angles you&rsquo;d never reach alone.</p>
          </div>
          <div className={styles.modeCard} style={{ borderColor: "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7ED6A8")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}>
            <span className={styles.modeIcon} style={{ color: "#7ED6A8" }}>⟁</span>
            <div className={styles.modeTitle}>Decision</div>
            <p className={styles.modeDesc}>Work through choices with rigor. Stress-test options. Commit with confidence.</p>
          </div>
          <div className={styles.modeCard} style={{ borderColor: "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C4A6FF")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}>
            <span className={styles.modeIcon} style={{ color: "#C4A6FF" }}>◈</span>
            <div className={styles.modeTitle}>Expression</div>
            <p className={styles.modeDesc}>Articulate what you know but can&rsquo;t yet say. Structure your thinking for others.</p>
          </div>
        </div>
      </div>

      {/* QUOTE BREAK */}
      <div className={styles.quoteBreak}>
        <p className={styles.quoteBreakText}>
          Most people use AI to think for them.<br />
          The best use it after they&rsquo;ve done the thinking.<br />
          <strong style={{ color: "#FF9090" }}>Primer is where that happens.</strong>
        </p>
      </div>

      {/* BOTTOM CTA */}
      <div className={styles.bottomCta}>
        <p className={styles.bottomCtaText}>
          Your ideas, developed by you, expanded by AI.
        </p>
        <Link href="/auth" className={styles.bottomBtn}>
          Open your studio
          <span className={styles.ctaDot}>&rarr;</span>
        </Link>
      </div>
    </>
  );
}
