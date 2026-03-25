"use client";
import { useEffect, useRef, useState } from "react";

const stageLabs: Record<string, string> = {
  idea: "have an idea",
  early: "started, feeling stuck",
  building: "building, lost direction",
  restart: "ready to pivot",
};

const stateLabs: Record<string, string> = {
  ai: "outsourcing to AI",
  overwhelmed: "overwhelmed",
  fear: "fear of committing",
  blank: "feeling blank",
};

const results: Record<string, {
  title: string;
  body: string;
  days: { t: string; d: string }[];
  uTitle: string;
  uBody: string;
}> = {
  ai: {
    title: "The ideas are there. You keep skipping past them.",
    body: "Every time you open AI before you've thought it through, you hand away the most valuable part — your actual perspective. The output feels hollow because the input was empty. These three days are about getting your thinking on the page before anything else gets to it.",
    days: [
      { t: "The Brain Dump", d: "Set a 10-minute timer. Write everything you know, think, and half-believe about your work. No editing. No structure. Just get it out." },
      { t: "The One Problem", d: "Without searching or prompting anything — write the core of what you're making or solving in a single sentence. Then write why that matters to you specifically." },
      { t: "Your Real Why", d: "Ask yourself: what would I build if no one was watching and I couldn't fail? Write for 15 minutes. Don't stop to edit." },
    ],
    uTitle: "Think Before You Build",
    uBody: "A 14-day daily practice to help you crystallise your work using your own thinking — before you open AI, a framework, or anyone else's opinion.",
  },
  overwhelmed: {
    title: "You have enough ideas. What you need is permission to choose.",
    body: "The overwhelm isn't coming from having too many ideas — it's coming from not trusting yourself to pick one. Keeping everything alive is a way of not losing anything. These three days are about finding the thread that's actually yours.",
    days: [
      { t: "The Complete Inventory", d: "Write down every idea, direction, and possibility competing for your attention. Don't filter. Don't rank. Just get everything out of your head." },
      { t: "The Energy Test", d: "For each idea — close your eyes and imagine a Tuesday morning six months from now, working on it. What do you feel? Energised or drained?" },
      { t: "The Buffett Filter", d: "If you could only pursue five things for the rest of your working life — what would they be? Then: which one?" },
    ],
    uTitle: "From Many to One",
    uBody: "A 14-day practice to move through creative overwhelm and commit to one direction — grounded in frameworks from David Allen, Julia Cameron, and Seth Godin.",
  },
  fear: {
    title: "You already know what you want.",
    body: "You've probably known for a while. What's in the way isn't confusion — it's the weight of committing to something that matters to you. These three days don't ask you to be brave. They just help you take one step without the whole path being clear.",
    days: [
      { t: "The Worst Case", d: "Write your worst case scenario in full detail. All of it. Then at the bottom, write one question: is that survivable? Sit with the answer." },
      { t: "The Evidence Audit", d: "List every piece of evidence that you are capable of doing this. Not what you hope — what you know. Don't be modest." },
      { t: "The Small Bet", d: "Do one small public thing related to your work today. A post. A message. A conversation. One thing. Notice what actually happens." },
    ],
    uTitle: "Fear to First Move",
    uBody: "A 14-day daily practice that takes you from knowing what you want to actually doing something about it — grounded in Pressfield, CBT frameworks, and Seth Godin.",
  },
  blank: {
    title: "The well isn't empty. It's just been ignored.",
    body: "Creative flatness isn't the absence of ideas — it's what happens when you've been in output mode too long without refilling. You can't think your way back to creative energy. You have to feel your way back. These three days aren't about producing anything.",
    days: [
      { t: "Back to Basics", d: "Do one thing today that has nothing to do with productivity or self-improvement. Just pleasure. Notice what you feel during and after." },
      { t: "The Attention Walk", d: "Go outside for 20 minutes with no headphones. Write down 10 things you observed that you would normally walk straight past." },
      { t: "Write Badly", d: "Write for 15 minutes about your work. Allow it to be terrible. The goal is quantity, not quality. This is how flow starts." },
    ],
    uTitle: "Back to the Well",
    uBody: "A 14-day program that rebuilds your creative rhythm so you can think clearly, generate freely, and build from a full well — not an empty one.",
  },
};

export default function Home() {
  const [screen, setScreen] = useState(1);
  const [userStage, setUserStage] = useState("");
  const [userState, setUserState] = useState("");
  const [email, setEmail] = useState("");
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

  const go = (n: number) => {
    setScreen(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickStage = (val: string) => {
    setUserStage(val);
    setTimeout(() => go(3), 280);
  };

  const pickState = (val: string) => {
    setUserState(val);
    setTimeout(() => go(4), 280);
  };

  const submit = () => {
    if (!email || !email.includes("@")) return;
    go(5);
  };

  const r = results[userState];

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
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"28px 48px", position:"fixed", top:0, left:0, right:0,
        zIndex:100, background:"linear-gradient(to bottom, #f4f2ee 60%, transparent)"
      }}>
        <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.06em", textTransform:"lowercase" }}>
          creativeresetclub
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              width:7, height:7, borderRadius:"50%",
              background: i < screen ? "#000332" : i === screen ? "#ff9090" : "rgba(0,3,50,0.15)",
              transform: i === screen ? "scale(1.4)" : "scale(1)",
              transition:"all 0.3s"
            }} />
          ))}
        </div>
      </nav>

      {/* SCREEN 1: HERO */}
      {screen === 1 && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", padding:"120px 48px 80px", position:"relative", overflow:"hidden" }}>
          <div style={{
            position:"absolute", width:600, height:600,
            background:"radial-gradient(circle, #e6f6ff 0%, transparent 70%)",
            borderRadius:"50%", top:-100, right:-150, pointerEvents:"none",
            animation:"drift 8s ease-in-out infinite alternate"
          }} />
          <style>{`@keyframes drift { from { transform:translate(0,0) scale(1); } to { transform:translate(-20px,20px) scale(1.05); } }`}</style>

          <div style={{ maxWidth:640 }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              background:"#000332", color:"#f4f2ee",
              padding:"8px 16px", borderRadius:100,
              fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
              marginBottom:36
            }}>
              <div style={{ width:6, height:6, background:"#ff9090", borderRadius:"50", animation:"blink 2s ease infinite" }} />
              think before you build
            </div>
            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

            <h1 style={{
              fontSize:"clamp(44px,7vw,84px)", fontWeight:700,
              lineHeight:1.0, letterSpacing:"-0.02em", marginBottom:24
            }}>
              AI can&apos;t give you<br />
              clarity you haven&apos;t<br />
              found{" "}
              <span style={{ color:"#ff9090" }}>yourself.</span>
            </h1>

            <p style={{ fontSize:17, lineHeight:1.7, color:"rgba(0,3,50,0.55)", maxWidth:480, marginBottom:48, fontWeight:400 }}>
              This is where you find it. A daily thinking practice for creatives and builders — before the prompts, before the noise, before anyone else&apos;s opinion.
            </p>

            <button
              onClick={() => go(2)}
              style={{
                display:"inline-flex", alignItems:"center", gap:12,
                background:"#000332", color:"#f4f2ee",
                padding:"18px 36px", borderRadius:100,
                fontSize:15, fontWeight:700, border:"none", cursor:"none",
                transition:"all 0.25s"
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background="#ff9090"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background="#000332"; }}
            >
              find your path
              <span style={{ width:20, height:20, background:"#ff9090", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>→</span>
            </button>

            <p style={{ marginTop:20, fontSize:12, color:"rgba(0,3,50,0.4)" }}>takes 2 minutes · free to start</p>
          </div>
        </div>
      )}

      {/* SCREEN 2: STAGE */}
      {screen === 2 && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", padding:"120px 48px 80px" }}>
          <button onClick={() => go(1)} style={{ background:"none", border:"none", cursor:"none", fontSize:13, color:"rgba(0,3,50,0.45)", marginBottom:48, display:"flex", alignItems:"center", gap:8, padding:0 }}>← back</button>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#ff9090", marginBottom:16 }}>01 / 02</p>
          <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:700, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:12, maxWidth:560 }}>
            Where are you with your work right now?
          </h2>
          <p style={{ fontSize:15, color:"rgba(0,3,50,0.5)", marginBottom:40 }}>Pick the one that&apos;s most honest.</p>

          <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:580 }}>
            {[
              { val:"idea", label:"I have an idea — maybe a few — but haven't started", sub:"it's still living in my head and that's part of the problem" },
              { val:"early", label:"I've started but something isn't clicking", sub:"the momentum is gone and I'm not sure why" },
              { val:"building", label:"I'm building but I've lost the thread", sub:"busy but quietly unsure I'm making the right thing" },
              { val:"restart", label:"I need to start over or change direction", sub:"the old thing isn't working and I know it" },
            ].map((c, i) => (
              <button
                key={c.val}
                onClick={() => pickStage(c.val)}
                style={{
                  display:"flex", alignItems:"flex-start", gap:16,
                  padding:"20px 24px", border:"1.5px solid rgba(0,3,50,0.12)",
                  borderRadius:16, background: userStage === c.val ? "#000332" : "transparent",
                  cursor:"none", textAlign:"left", transition:"all 0.22s"
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#000332"; (e.currentTarget as HTMLElement).style.color="#f4f2ee"; }}
                onMouseLeave={e => { if(userStage !== c.val){ (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color="#000332"; } }}
              >
                <span style={{ fontSize:11, fontWeight:700, color: userStage === c.val ? "rgba(244,242,238,0.4)" : "rgba(0,3,50,0.25)", minWidth:20, paddingTop:2 }}>0{i+1}</span>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color: userStage === c.val ? "#f4f2ee" : "#000332", marginBottom:3 }}>{c.label}</div>
                  <div style={{ fontSize:13, color: userStage === c.val ? "rgba(244,242,238,0.55)" : "rgba(0,3,50,0.5)", fontWeight:400 }}>{c.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 3: STATE */}
      {screen === 3 && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", padding:"120px 48px 80px" }}>
          <button onClick={() => go(2)} style={{ background:"none", border:"none", cursor:"none", fontSize:13, color:"rgba(0,3,50,0.45)", marginBottom:48, display:"flex", alignItems:"center", gap:8, padding:0 }}>← back</button>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#ff9090", marginBottom:16 }}>02 / 02</p>
          <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:700, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:12, maxWidth:560 }}>
            What does it actually feel like right now?
          </h2>
          <p style={{ fontSize:15, color:"rgba(0,3,50,0.5)", marginBottom:40 }}>The one that makes you go — yeah, that&apos;s it.</p>

          <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:580 }}>
            {[
              { val:"ai", label:"I ask AI before I've figured out what I think", sub:"the answers feel close but hollow — and I keep going back anyway" },
              { val:"overwhelmed", label:"I have too many directions and can't commit to one", sub:"everything feels urgent or nothing does" },
              { val:"fear", label:"I know what I want but I can't make myself move", sub:"it's not confusion — it's something closer to fear" },
              { val:"blank", label:"My thinking feels flat and uninspired", sub:"like the creative part of my brain has gone quiet" },
            ].map((c, i) => (
              <button
                key={c.val}
                onClick={() => pickState(c.val)}
                style={{
                  display:"flex", alignItems:"flex-start", gap:16,
                  padding:"20px 24px", border:"1.5px solid rgba(0,3,50,0.12)",
                  borderRadius:16, background: userState === c.val ? "#000332" : "transparent",
                  cursor:"none", textAlign:"left", transition:"all 0.22s"
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#000332"; }}
                onMouseLeave={e => { if(userState !== c.val){ (e.currentTarget as HTMLElement).style.background="transparent"; } }}
              >
                <span style={{ fontSize:11, fontWeight:700, color:"rgba(0,3,50,0.25)", minWidth:20, paddingTop:2 }}>0{i+1}</span>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color: userState === c.val ? "#f4f2ee" : "#000332", marginBottom:3 }}>{c.label}</div>
                  <div style={{ fontSize:13, color: userState === c.val ? "rgba(244,242,238,0.55)" : "rgba(0,3,50,0.5)", fontWeight:400 }}>{c.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 4: RESULT */}
      {screen === 4 && r && (
        <div style={{ padding:"100px 48px 80px" }}>
          <div style={{ maxWidth:620, margin:"0 auto" }}>
            <button onClick={() => go(3)} style={{ background:"none", border:"none", cursor:"none", fontSize:13, color:"rgba(0,3,50,0.45)", marginBottom:32, display:"flex", alignItems:"center", gap:8, padding:0 }}>← back</button>

            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:32 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", padding:"7px 14px", borderRadius:100, border:"1.5px solid rgba(0,3,50,0.2)", color:"#000332" }}>{stageLabs[userStage]}</span>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", padding:"7px 14px", borderRadius:100, background:"#000332", color:"#f4f2ee" }}>{stateLabs[userState]}</span>
            </div>

            <div style={{ background:"#000332", borderRadius:24, padding:40, marginBottom:28, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, background:"radial-gradient(circle, rgba(255,144,144,0.2) 0%, transparent 70%)", borderRadius:"50%" }} />
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#ff9090", marginBottom:14, position:"relative" }}>your path</p>
              <h2 style={{ fontSize:"clamp(20px,3vw,28px)", fontWeight:700, color:"#f4f2ee", lineHeight:1.2, marginBottom:14, position:"relative" }}>{r.title}</h2>
              <p style={{ fontSize:14, lineHeight:1.75, color:"rgba(244,242,238,0.7)", position:"relative" }}>{r.body}</p>

              <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(244,242,238,0.4)", margin:"28px 0 16px", position:"relative" }}>your free 3-day challenge</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, position:"relative" }}>
                {r.days.map((d, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"14px 16px", borderRadius:12, background:"rgba(244,242,238,0.05)", border:"1px solid rgba(244,242,238,0.08)" }}>
                    <div style={{ fontSize:22, fontWeight:700, color:"#ff9090", lineHeight:1, minWidth:24 }}>{i+1}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#f4f2ee", marginBottom:2 }}>{d.t}</div>
                      <div style={{ fontSize:12, color:"rgba(244,242,238,0.5)", lineHeight:1.5 }}>{d.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:24 }}>
              <h3 style={{ fontSize:24, fontWeight:700, letterSpacing:"-0.01em", marginBottom:6, lineHeight:1.2 }}>
                drop your email.<br />day 1 is{" "}
                <span style={{ color:"#ff9090" }}>waiting.</span>
              </h3>
              <p style={{ fontSize:14, color:"rgba(0,3,50,0.5)", marginBottom:20, lineHeight:1.6 }}>One exercise. Your inbox. Today. No course portal, no fluff.</p>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your email"
                  style={{ flex:1, minWidth:200, padding:"16px 20px", border:"1.5px solid rgba(0,3,50,0.15)", borderRadius:100, background:"transparent", fontFamily:"'Codec Pro',sans-serif", fontSize:14, color:"#000332", outline:"none", cursor:"text" }}
                />
                <button
                  onClick={submit}
                  style={{ background:"#000332", color:"#f4f2ee", border:"none", padding:"16px 28px", borderRadius:100, fontFamily:"'Codec Pro',sans-serif", fontSize:14, fontWeight:700, cursor:"none", whiteSpace:"nowrap" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background="#ff9090"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background="#000332"; }}
                >
                  send me day 1
                </button>
              </div>
              <p style={{ fontSize:11, color:"rgba(0,3,50,0.35)", marginTop:10 }}>no spam. unsubscribe anytime.</p>
            </div>

            <div style={{ border:"1.5px solid rgba(0,3,50,0.12)", borderRadius:20, padding:"28px 32px", position:"relative" }}>
              <div style={{ position:"absolute", top:-13, left:24, background:"#ff9090", color:"white", fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", padding:"5px 14px", borderRadius:100 }}>full program</div>
              <h3 style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.01em", marginBottom:6 }}>{r.uTitle}</h3>
              <p style={{ fontSize:13, color:"rgba(0,3,50,0.5)", marginBottom:14 }}>14-day daily practice — <strong style={{ fontSize:22, color:"#000332" }}>$49</strong></p>
              <p style={{ fontSize:14, lineHeight:1.65, color:"rgba(0,3,50,0.5)", marginBottom:20 }}>{r.uBody}</p>
              <button style={{ background:"transparent", color:"#000332", border:"1.5px solid rgba(0,3,50,0.2)", padding:"13px 24px", borderRadius:100, fontFamily:"'Codec Pro',sans-serif", fontSize:13, fontWeight:700, cursor:"none", marginRight:12 }}>join the waitlist</button>
              <button onClick={() => { const el = document.querySelector('input[type="email"]') as HTMLInputElement; el?.focus(); }} style={{ background:"none", border:"none", fontFamily:"'Codec Pro',sans-serif", fontSize:13, color:"rgba(0,3,50,0.4)", cursor:"none", textDecoration:"underline", textUnderlineOffset:3 }}>free challenge first</button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 5: SUCCESS */}
      {screen === 5 && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", padding:"120px 48px 80px" }}>
          <div style={{ maxWidth:560 }}>
            <div style={{ width:52, height:52, background:"#000332", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#ff9090", fontSize:22, marginBottom:28 }}>✓</div>
            <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:700, letterSpacing:"-0.02em", lineHeight:1.05, marginBottom:16 }}>
              day 1 is on its<br />way.{" "}
              <span style={{ color:"#ff9090" }}>check your inbox.</span>
            </h2>
            <p style={{ fontSize:16, lineHeight:1.7, color:"rgba(0,3,50,0.55)", marginBottom:36 }}>
              While you wait — open a blank doc or grab a piece of paper. Write this at the top and let it sit:
            </p>
            <div style={{ background:"#e6f6ff", borderRadius:16, padding:"24px 28px", marginBottom:32, borderLeft:"3px solid #ff9090" }}>
              <p style={{ fontSize:19, fontWeight:700, color:"#000332", lineHeight:1.4 }}>
                &ldquo;what do I actually think about this — before anyone else tells me?&rdquo;
              </p>
            </div>
            <p style={{ fontSize:14, color:"rgba(0,3,50,0.55)", lineHeight:1.7, marginBottom:28 }}>
              Don&apos;t answer it yet. The fact that you&apos;re asking it is already the work.
            </p>
            <a
              href="https://instagram.com/creativeresetclub"
              target="_blank"
              rel="noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:10, background:"#000332", color:"#f4f2ee", padding:"16px 28px", borderRadius:100, fontSize:14, fontWeight:700, textDecoration:"none" }}
            >
              follow along on instagram →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
