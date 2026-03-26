"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const programs = [
  {
    id: "fear",
    title: "Fear to First Move",
    subtitle: "14 days · Phase 1: Name It",
    description: "You already know what you want. This program helps you move toward it.",
    color: "#000332",
    accent: "#ff9090",
    locked: true,
  },
  {
    id: "ai",
    title: "Think Before You Build",
    subtitle: "14 days · Phase 1: Excavate",
    description: "Your best thinking, before AI gets to it.",
    color: "#000332",
    accent: "#e6f6ff",
    locked: true,
  },
  {
    id: "overwhelmed",
    title: "From Many to One",
    subtitle: "14 days · Phase 1: Empty the Head",
    description: "Too many directions. This program helps you choose one and mean it.",
    color: "#000332",
    accent: "#ff9090",
    locked: true,
  },
  {
    id: "blank",
    title: "Back to the Well",
    subtitle: "14 days · Phase 1: Diagnose",
    description: "The creativity didn't leave. This program helps you find it again.",
    color: "#000332",
    accent: "#e6f6ff",
    locked: true,
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingProgramId, setPurchasingProgramId] = useState<string | null>(null);
  const [hoveredProgramId, setHoveredProgramId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handlePurchase = async (programId: string) => {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PRICE_ID");
      return;
    }

    try {
      setPurchasingProgramId(programId);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, programId }),
      });

      if (!res.ok) {
        throw new Error(`Checkout failed: ${res.status}`);
      }

      const data: { url?: string } = await res.json();
      if (!data.url) {
        throw new Error("Missing checkout url");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setPurchasingProgramId(null);
    }
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#f4f2ee", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ fontFamily:"'Codec Pro',sans-serif", color:"rgba(0,3,50,0.4)", fontSize:14 }}>loading...</p>
    </div>
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
      `}</style>

      {/* NAV */}
      <nav style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"24px 48px", borderBottom:"1px solid rgba(0,3,50,0.08)",
        background:"#f4f2ee", position:"sticky", top:0, zIndex:100
      }}>
        <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.06em", textTransform:"lowercase", color:"#000332" }}>
          creativeresetclub
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <span style={{ fontSize:13, color:"rgba(0,3,50,0.45)" }}>{user?.email}</span>
          <button
            onClick={signOut}
            style={{
              background:"none", border:"1.5px solid rgba(0,3,50,0.15)",
              padding:"8px 18px", borderRadius:100,
              fontFamily:"'Codec Pro',sans-serif", fontSize:12,
              fontWeight:700, color:"#000332", cursor:"pointer"
            }}
          >
            sign out
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ maxWidth:900, margin:"0 auto", padding:"60px 48px 100px" }}>

        {/* HEADER */}
        <div style={{ marginBottom:24 }}>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#ff9090", marginBottom:12 }}>
            your programs
          </p>
          <h1 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:700, letterSpacing:"-0.02em", lineHeight:1.05, color:"#000332", marginBottom:12 }}>
            where do you want<br />to begin?
          </h1>
          <p style={{ fontSize:15, color:"rgba(0,3,50,0.5)", lineHeight:1.7, maxWidth:480 }}>
            each program is 14 days. one daily question, one micro-action, one framework. your thinking, before anything else.
          </p>
        </div>

        {/* BOTTOM NOTE */}
        <div style={{
          marginTop:24, marginBottom:32, padding:"28px 32px",
          background:"#e6f6ff", borderRadius:16,
          display:"flex", alignItems:"flex-start", gap:16
        }}>
          <div style={{ fontSize:20 }}>💡</div>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:"#000332", marginBottom:4 }}>
              not sure which program to start with?
            </p>
            <p style={{ fontSize:13, color:"rgba(0,3,50,0.6)", lineHeight:1.65 }}>
              go back to the homepage and take the 2-minute quiz. it'll match you to the right program based on where you actually are right now.
            </p>
            <a href="/" style={{ fontSize:13, fontWeight:700, color:"#000332", textDecoration:"underline", textUnderlineOffset:3, display:"inline-block", marginTop:8 }}>
              take the quiz →
            </a>
          </div>
        </div>

        {/* PROGRAMS GRID */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(380px, 1fr))", gap:16 }}>
          {programs.map(p => (
            <div
              key={p.id}
              style={{
                background: p.locked ? "rgba(0,3,50,0.03)" : "#000332",
                border: `1.5px solid ${p.locked ? "rgba(0,3,50,0.1)" : "#000332"}`,
                borderRadius:20, padding:"32px",
                position:"relative", overflow:"hidden",
                transition:"all 0.2s ease",
              }}
            >
              {p.locked && (
                <div style={{
                  position:"absolute", top:20, right:20,
                  background:"rgba(0,3,50,0.08)", borderRadius:100,
                  padding:"4px 12px", fontSize:10, fontWeight:700,
                  letterSpacing:"0.1em", textTransform:"uppercase",
                  color:"rgba(0,3,50,0.4)"
                }}>
                  coming soon
                </div>
              )}

              <div style={{
                width:40, height:40, borderRadius:12,
                background: p.locked ? "rgba(0,3,50,0.06)" : p.accent,
                marginBottom:20
              }} />

              <p style={{
                fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", marginBottom:8,
                color: p.locked ? "rgba(0,3,50,0.35)" : "rgba(244,242,238,0.5)"
              }}>
                {p.subtitle}
              </p>

              <h2 style={{
                fontSize:22, fontWeight:700, letterSpacing:"-0.01em",
                lineHeight:1.15, marginBottom:10,
                color: p.locked ? "#000332" : "#f4f2ee"
              }}>
                {p.title}
              </h2>

              <p style={{
                fontSize:14, lineHeight:1.65, marginBottom:24,
                color: p.locked ? "rgba(0,3,50,0.5)" : "rgba(244,242,238,0.65)"
              }}>
                {p.description}
              </p>

              <button
                type="button"
                onClick={p.locked ? () => handlePurchase(p.id) : undefined}
                disabled={p.locked ? purchasingProgramId === p.id : false}
                onMouseEnter={p.locked ? () => setHoveredProgramId(p.id) : undefined}
                onMouseLeave={p.locked ? () => setHoveredProgramId(null) : undefined}
                style={{
                  background: p.locked
                    ? hoveredProgramId === p.id
                      ? "#ff9090"
                      : "#000332"
                    : "#ff9090",
                  border: "none",
                  padding:"12px 24px", borderRadius:100,
                  fontFamily:"'Codec Pro',sans-serif", fontSize:13,
                  fontWeight:700, cursor: "pointer",
                  color: p.locked ? "#f4f2ee" : "#000332",
                  opacity: 1
                }}
              >
                {p.locked ? "unlock program — $49" : "start today →"}
              </button>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
