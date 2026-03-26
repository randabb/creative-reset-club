"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = "/dashboard";
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Check your email to confirm your account.");
    }
    setLoading(false);
  };

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

      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", padding:"40px 24px"
      }}>
        <div style={{ width:"100%", maxWidth:420 }}>

          <div style={{ marginBottom:40 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"lowercase", color:"#000332", marginBottom:12 }}>
              creativeresetclub
            </p>
            <h1 style={{ fontSize:36, fontWeight:700, letterSpacing:"-0.02em", lineHeight:1.1, color:"#000332", marginBottom:8 }}>
              {isLogin ? "welcome back." : "create your account."}
            </h1>
            <p style={{ fontSize:15, color:"rgba(0,3,50,0.5)", lineHeight:1.6 }}>
              {isLogin ? "sign in to access your program." : "start your 14-day practice."}
            </p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
            <input
              type="email"
              placeholder="your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                padding:"16px 20px", border:"1.5px solid rgba(0,3,50,0.15)",
                borderRadius:100, background:"transparent",
                fontFamily:"'Codec Pro',sans-serif", fontSize:14,
                color:"#000332", outline:"none"
              }}
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                padding:"16px 20px", border:"1.5px solid rgba(0,3,50,0.15)",
                borderRadius:100, background:"transparent",
                fontFamily:"'Codec Pro',sans-serif", fontSize:14,
                color:"#000332", outline:"none"
              }}
            />
            <button
              onClick={handleAuth}
              disabled={loading}
              style={{
                background:"#000332", color:"#f4f2ee",
                border:"none", padding:"16px 28px",
                borderRadius:100, fontFamily:"'Codec Pro',sans-serif",
                fontSize:14, fontWeight:700, cursor:"pointer",
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "..." : isLogin ? "sign in" : "create account"}
            </button>
          </div>

          {message && (
            <p style={{ fontSize:13, color: message.includes("Check") ? "#7A9E7E" : "#ff9090", marginBottom:16, lineHeight:1.5 }}>
              {message}
            </p>
          )}

          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background:"none", border:"none",
              fontFamily:"'Codec Pro',sans-serif", fontSize:13,
              color:"rgba(0,3,50,0.5)", cursor:"pointer",
              textDecoration:"underline", textUnderlineOffset:3, padding:0
            }}
          >
            {isLogin ? "don't have an account? sign up" : "already have an account? sign in"}
          </button>
        </div>
      </div>
    </>
  );
}
