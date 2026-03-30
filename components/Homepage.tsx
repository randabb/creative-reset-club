"use client";

import { useEffect } from "react";
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

  return (
    <>
      {/* NAV */}
      <nav className={styles.nav} id="nav">
        <div className={styles.navLogo}>creativeresetclub</div>
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
            your daily<br className={styles.brDesktop} />{" "}practice<br />
            for <em>creative<br className={styles.brDesktop} />{" "}thinking,</em><br />
            <span className={styles.hlCoral}>in the age of AI.</span>
          </h1>
          <p className={styles.heroSub}>
            come play. you already know how to do this.
          </p>
          <Link href="/onboarding" className={styles.heroCta}>
            start your first reset
            <span className={styles.ctaDot}>&rarr;</span>
          </Link>
          <div className={styles.heroProofRow}>
            <span>backed by behavioral science</span>
            <span className={styles.dot}>&middot;</span>
            <span>takes 2 minutes</span>
            <span className={styles.dot}>&middot;</span>
            <span>free to start</span>
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
              <div className={styles.owWord}>reset.</div>
            </div>

            {/* Node 1: Empty the Head */}
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
                <div className={styles.nodeLabel}>Empty<br />the Head</div>
              </div>
            </div>

            {/* Node 2: Reignite */}
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
                <div className={styles.nodeLabel}>Reignite</div>
              </div>
            </div>

            {/* Node 3: Move It Forward */}
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
                <div className={styles.nodeLabel}>Move It<br />Forward</div>
              </div>
            </div>

            {/* Node 4: One Thing at a Time */}
            <div className={`${styles.node} ${styles.n4}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim}>
                  <div className={styles.otatWrap}>
                    <div className={styles.otatItem}><div className={styles.otatC}></div></div>
                    <div className={styles.otatItem}><div className={styles.otatS}></div></div>
                    <div className={styles.otatItem}><div className={styles.otatL}></div></div>
                  </div>
                </div>
                <div className={styles.nodeLabel}>One Thing<br />at a Time</div>
              </div>
            </div>

            {/* Node 5: Refill */}
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
                <div className={styles.nodeLabel}>Refill</div>
              </div>
            </div>

            {/* Node 6: Make It Yours */}
            <div className={`${styles.node} ${styles.n6}`}>
              <div className={styles.nodeBody}>
                <div className={styles.nodeAnim} style={{ position: "relative" }}>
                  <div className={styles.miyShape}></div>
                  <div className={styles.miyDot}></div>
                </div>
                <div className={styles.nodeLabel}>Make It<br />Yours</div>
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
          Creativity flows when the conditions are right.<br />
          This is a daily practice for creating those conditions.
        </div>
        <div className={styles.introStripSub}>
          A structured daily practice that restores your access to creative flow. A few minutes a day, guided and grounded, until thinking feels easy again.
        </div>
      </div>

      {/* BENEFIT 1 */}
      <div className={styles.benefit}>
        <div>
          <div className={styles.benefitNumber}>01 &mdash; the core shift</div>
          <h2 className={styles.benefitTitle}>
            Your ideas,<br /><em>arriving on their own.</em>
          </h2>
          <p className={styles.benefitDesc}>
            When generating from within becomes a daily habit, the pull toward external input naturally loosens. You hold thoughts longer, decisions feel more grounded, and your thinking starts to feel recognisably yours again.
          </p>
          <div className={styles.benefitShift}>
            <span className={styles.shiftFrom}>react, search, generate, tweak</span>
            <span className={styles.shiftArrow}>&rarr;</span>
            <span className={styles.shiftTo}>notice, think, feel, express</span>
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
          <div className={styles.benefitNumber}>02 &mdash; the felt shift</div>
          <h2 className={styles.benefitTitle}>
            Quieter mind.<br /><em>Sharper focus.</em>
          </h2>
          <p className={styles.benefitDesc}>
            A few minutes of intentional practice rebuilds your capacity to stay with a single thought, fully. Until the noise settles, ideas start to feel whole and connected, and something real can come through.
          </p>
          <div className={styles.benefitShift}>
            <span className={styles.shiftFrom}>scattered, overstimulated</span>
            <span className={styles.shiftArrow}>&rarr;</span>
            <span className={styles.shiftTo}>grounded, focused, in it</span>
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
          <div className={styles.benefitNumber}>03 &mdash; the identity shift</div>
          <h2 className={styles.benefitTitle}>
            Your voice,<br /><em>fully alive.</em>
          </h2>
          <p className={styles.benefitDesc}>
            Each practice is designed to get things moving before the inner editor shows up. Over time, a natural ease builds before sharing. Expression starts to sound fully, recognisably you &mdash; and ideas feel original and worth following.
          </p>
          <div className={styles.benefitShift}>
            <span className={styles.shiftFrom}>waiting to feel confident</span>
            <span className={styles.shiftArrow}>&rarr;</span>
            <span className={styles.shiftTo}>moving while it&rsquo;s still forming</span>
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

      {/* QUOTE BREAK */}
      <div className={styles.quoteBreak}>
        <p className={styles.quoteBreakText}>
          The most valuable thing you bring to your work<br />
          is <strong>how you think.</strong>
        </p>
      </div>

      {/* BOTTOM CTA */}
      <div className={styles.bottomCta}>
        <p className={styles.bottomCtaText}>
          you don&rsquo;t need to be ready. you just need to start.
        </p>
        <Link href="/onboarding" className={styles.bottomBtn}>
          start your first reset
          <span className={styles.ctaDot}>&rarr;</span>
        </Link>
        <div className={styles.bottomMeta}>
          <span>backed by behavioral science</span>
          <span className={styles.dot}>&middot;</span>
          <span>takes 2 minutes</span>
          <span className={styles.dot}>&middot;</span>
          <span>free to start</span>
        </div>
      </div>
    </>
  );
}
