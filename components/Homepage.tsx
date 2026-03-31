"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/styles/homepage.module.css";

export default function Homepage() {
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
        <Link href="/login" className={styles.navSign}>sign in</Link>
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
          <p className={styles.heroSub}>
            A guided thinking workspace for knowledge workers who want clarity, originality, and better decisions. Your ideas, developed by you, expanded by AI.
          </p>
          <Link href="/onboarding" className={styles.heroCta}>
            Start your first canvas
            <span className={styles.ctaDot}>&rarr;</span>
          </Link>
          <div className={styles.heroProofRow}>
            <span>3 full sessions free</span>
            <span className={styles.dot}>&middot;</span>
            <span>No credit card</span>
            <span className={styles.dot}>&middot;</span>
            <span>For marketers, founders, PMs, engineers, strategists, and creators</span>
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

      {/* INTRO STRIP */}
      <div className={styles.introStrip}>
        <div className={styles.introStripLead}>
          Every tool wants you to move faster.<br />
          Primer asks you to think first.
        </div>
        <div className={styles.introStripSub}>
          A 15-minute session that changes how you see the problem.
        </div>
      </div>

      {/* BENEFIT 1 */}
      <div className={styles.benefit}>
        <div>
          <div className={styles.benefitNumber}>01 &mdash; capture</div>
          <h2 className={styles.benefitTitle}>
            Get the raw idea<br /><em>out of your head.</em>
          </h2>
          <p className={styles.benefitDesc}>
            Write what you&rsquo;re thinking through. No structure, no editing. Just get the messy thought onto the screen so you can see it.
          </p>
          <div className={styles.benefitShift}>
            <span className={styles.shiftFrom}>scattered thoughts</span>
            <span className={styles.shiftArrow}>&rarr;</span>
            <span className={styles.shiftTo}>one clear starting point</span>
          </div>
        </div>
        <div className={styles.benefitAnimWrap}>
          <svg className={styles.animSvg} viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
            <circle className={styles.animCore} cx="200" cy="160" r="10" fill="#FF9090" />
            <circle className={styles.animCoreGlow} cx="200" cy="160" r="10" fill="none" stroke="#FF9090" strokeWidth="1" opacity="0.3" />
            <circle cx="200" cy="160" r="58" fill="none" stroke="rgba(0,3,50,0.08)" strokeWidth="1" />
            <circle cx="200" cy="160" r="100" fill="none" stroke="rgba(0,3,50,0.05)" strokeWidth="1" strokeDasharray="4 6" />
            <circle className={`${styles.thought} ${styles.t1}`} cx="60" cy="40" r="5" fill="#FF9090" opacity="0.7" />
            <circle className={`${styles.thought} ${styles.t2}`} cx="340" cy="60" r="4" fill="#FF9090" opacity="0.55" />
            <circle className={`${styles.thought} ${styles.t3}`} cx="30" cy="200" r="6" fill="#FFB8B8" opacity="0.6" />
            <circle className={`${styles.thought} ${styles.t4}`} cx="360" cy="220" r="4" fill="#FF9090" opacity="0.5" />
            <circle className={`${styles.thought} ${styles.t5}`} cx="180" cy="20" r="5" fill="#FFB8B8" opacity="0.65" />
            <circle className={`${styles.thought} ${styles.t6}`} cx="310" cy="290" r="4" fill="#FF9090" opacity="0.5" />
            <circle className={`${styles.thought} ${styles.t7}`} cx="80" cy="280" r="5" fill="#FFB8B8" opacity="0.55" />
            <line className={`${styles.trail} ${styles.tr1}`} x1="60" y1="40" x2="200" y2="160" stroke="#FF9090" strokeWidth="1" opacity="0" strokeDasharray="3 5" />
            <line className={`${styles.trail} ${styles.tr2}`} x1="340" y1="60" x2="200" y2="160" stroke="#FF9090" strokeWidth="1" opacity="0" strokeDasharray="3 5" />
            <line className={`${styles.trail} ${styles.tr3}`} x1="30" y1="200" x2="200" y2="160" stroke="#FFB8B8" strokeWidth="1" opacity="0" strokeDasharray="3 5" />
            <line className={`${styles.trail} ${styles.tr4}`} x1="360" y1="220" x2="200" y2="160" stroke="#FF9090" strokeWidth="1" opacity="0" strokeDasharray="3 5" />
            <line className={`${styles.trail} ${styles.tr5}`} x1="180" y1="20" x2="200" y2="160" stroke="#FFB8B8" strokeWidth="1" opacity="0" strokeDasharray="3 5" />
          </svg>
        </div>
      </div>

      {/* BENEFIT 2 */}
      <div className={styles.benefit}>
        <div className={styles.benefitTextFlipped}>
          <div className={styles.benefitNumber}>02 &mdash; guided thinking</div>
          <h2 className={styles.benefitTitle}>
            Four questions that<br /><em>take you deeper.</em>
          </h2>
          <p className={styles.benefitDesc}>
            Each question is adapted to your specific situation, grounded in expert thinking frameworks. You&rsquo;ll think things you didn&rsquo;t know you were thinking.
          </p>
          <div className={styles.benefitShift}>
            <span className={styles.shiftFrom}>surface-level ideas</span>
            <span className={styles.shiftArrow}>&rarr;</span>
            <span className={styles.shiftTo}>thinking with depth</span>
          </div>
        </div>
        <div className={`${styles.benefitAnimWrap} ${styles.benefitAnimFlipped}`}>
          <svg className={styles.animSvg} viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
            <line className={`${styles.noiseLine} ${styles.nl1}`} x1="40" y1="80" x2="360" y2="95" stroke="#000332" strokeWidth="1.5" opacity="0.12" />
            <line className={`${styles.noiseLine} ${styles.nl2}`} x1="40" y1="105" x2="360" y2="88" stroke="#000332" strokeWidth="1" opacity="0.09" />
            <line className={`${styles.noiseLine} ${styles.nl3}`} x1="40" y1="125" x2="360" y2="140" stroke="#FF9090" strokeWidth="1.5" opacity="0.15" />
            <line className={`${styles.noiseLine} ${styles.nl4}`} x1="40" y1="148" x2="360" y2="132" stroke="#000332" strokeWidth="1" opacity="0.08" />
            <line className={`${styles.noiseLine} ${styles.nl5}`} x1="40" y1="168" x2="360" y2="178" stroke="#000332" strokeWidth="1.5" opacity="0.1" />
            <line className={`${styles.noiseLine} ${styles.nl6}`} x1="40" y1="192" x2="360" y2="180" stroke="#FFB8B8" strokeWidth="1" opacity="0.12" />
            <line className={`${styles.noiseLine} ${styles.nl7}`} x1="40" y1="212" x2="360" y2="225" stroke="#000332" strokeWidth="1.5" opacity="0.08" />
            <line className={`${styles.noiseLine} ${styles.nl8}`} x1="40" y1="232" x2="360" y2="218" stroke="#000332" strokeWidth="1" opacity="0.07" />
            <line className={styles.calmLine} x1="40" y1="160" x2="360" y2="160" stroke="#FF9090" strokeWidth="2.5" opacity="0" strokeLinecap="round" />
            <circle className={styles.calmDot} cx="360" cy="160" r="5" fill="#FF9090" opacity="0" />
          </svg>
        </div>
      </div>

      {/* BENEFIT 3 */}
      <div className={styles.benefit}>
        <div>
          <div className={styles.benefitNumber}>03 &mdash; the canvas</div>
          <h2 className={styles.benefitTitle}>
            See your thinking.<br /><em>Move it around. Expand it.</em>
          </h2>
          <p className={styles.benefitDesc}>
            Your ideas appear as moveable notes on a spatial canvas. Connect them, cluster them, then ask AI to clarify, expand, decide, or express your thinking further.
          </p>
          <div className={styles.benefitShift}>
            <span className={styles.shiftFrom}>ideas stuck in your head</span>
            <span className={styles.shiftArrow}>&rarr;</span>
            <span className={styles.shiftTo}>a visual map you can use</span>
          </div>
        </div>
        <div className={styles.benefitAnimWrap}>
          <svg className={styles.animSvg} viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
            <path
              className={styles.formingPath}
              d="M 60 160 C 90 80, 150 60, 200 100 C 250 140, 280 200, 320 180 C 350 165, 360 155, 370 150"
              fill="none" stroke="#FF9090" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray="400" strokeDashoffset="400"
            />
            <circle className={styles.pathDot} cx="60" cy="160" r="6" fill="#FF9090" opacity="0.9" />
            <path
              d="M 60 160 C 90 80, 150 60, 200 100 C 250 140, 280 200, 320 180 C 350 165, 360 155, 370 150"
              fill="none" stroke="rgba(0,3,50,0.06)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="5 6"
            />
            <circle cx="200" cy="100" r="3" fill="#FFB8B8" opacity="0" className={`${styles.formDot} ${styles.fd1}`} />
            <circle cx="260" cy="162" r="3" fill="#FFB8B8" opacity="0" className={`${styles.formDot} ${styles.fd2}`} />
            <circle cx="320" cy="180" r="3" fill="#FF9090" opacity="0" className={`${styles.formDot} ${styles.fd3}`} />
          </svg>
        </div>
      </div>

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
          The most valuable thing you bring to your work is <strong>how you think.</strong><br />
          Primer is where that thinking starts.
        </p>
      </div>

      {/* PRICING */}
      <div className={styles.pricingSection}>
        <h2 className={styles.pricingHeading}>Pricing</h2>
        <p className={styles.pricingSub}>Try it. If it makes you think better, keep going.</p>
        <div className={styles.pricingGrid}>
          {/* Free */}
          <div className={styles.priceCard}>
            <div className={styles.priceLabel}>Free</div>
            <div className={styles.priceAmount}>$0</div>
            <div className={styles.pricePeriod}>&nbsp;</div>
            <ul className={styles.priceFeatures}>
              <li className={styles.priceFeature}>3 full sessions</li>
              <li className={styles.priceFeature}>All four thinking modes</li>
              <li className={styles.priceFeature}>Canvas with AI thought partner</li>
              <li className={styles.priceFeature}>Voice reflection</li>
              <li className={styles.priceFeature}>Complete experience, nothing held back</li>
            </ul>
            <Link href="/onboarding" className={styles.priceBtnOutline}>Try 3 sessions</Link>
          </div>
          {/* Starter */}
          <div className={`${styles.priceCard} ${styles.priceCardPrimary}`}>
            <div className={`${styles.priceLabel} ${styles.priceLabelPrimary}`}>Starter</div>
            <div className={`${styles.priceAmount} ${styles.priceAmountPrimary}`}>$15</div>
            <div className={`${styles.pricePeriod} ${styles.pricePeriodPrimary}`}>/month</div>
            <ul className={styles.priceFeatures}>
              <li className={`${styles.priceFeature} ${styles.priceFeaturePrimary}`}>Unlimited sessions</li>
              <li className={`${styles.priceFeature} ${styles.priceFeaturePrimary}`}>One active thinking arc</li>
              <li className={`${styles.priceFeature} ${styles.priceFeaturePrimary}`}>Full session history</li>
              <li className={`${styles.priceFeature} ${styles.priceFeaturePrimary}`}>Canvas export</li>
              <li className={`${styles.priceFeature} ${styles.priceFeaturePrimary}`}>$120/year (save $60)</li>
            </ul>
            <button className={styles.priceBtnFilled}>Start thinking</button>
          </div>
          {/* Pro */}
          <div className={styles.priceCard}>
            <div className={styles.priceLabel}>Pro</div>
            <div className={styles.priceAmount}>$25</div>
            <div className={styles.pricePeriod}>/month</div>
            <ul className={styles.priceFeatures}>
              <li className={styles.priceFeature}>Everything in Starter</li>
              <li className={styles.priceFeature}>Multiple simultaneous arcs</li>
              <li className={styles.priceFeature}>Cross-arc pattern insights</li>
              <li className={styles.priceFeature}>Priority AI</li>
              <li className={styles.priceFeature}>$200/year (save $100)</li>
            </ul>
            <button className={styles.priceBtnOutline}>Get started</button>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className={styles.bottomCta}>
        <p className={styles.bottomCtaText}>
          Your first three sessions are free. Just you, your ideas, and a space to develop them.
        </p>
        <Link href="/onboarding" className={styles.bottomBtn}>
          Open your studio
          <span className={styles.ctaDot}>&rarr;</span>
        </Link>
      </div>
    </>
  );
}
