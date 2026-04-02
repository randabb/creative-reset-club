"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !email.includes("@")) { setError("Enter a valid email."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { error: authErr } = await supabase.auth.signUp({ email, password });
    if (authErr) {
      setError(authErr.message.includes("already") ? "Email already in use. Try signing in." : authErr.message);
      setLoading(false); return;
    }
    router.push("/onboarding");
  };

  const handleSignIn = async () => {
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setError(authErr.message); setLoading(false); return; }

    // Check onboarding status
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("onboarding_completed, default_mode")
          .eq("id", user.id)
          .maybeSingle();
        console.log("[auth] Profile check:", { profile, profileErr });
        if (profile?.onboarding_completed) {
          router.push("/studio");
          return;
        }
        // Also check if they have any sessions (may have skipped onboarding)
        const { count } = await supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (count && count > 0) {
          router.push("/studio");
          return;
        }
      } catch (err) {
        console.error("[auth] Profile check failed:", err);
      }
      router.push("/onboarding");
    } else {
      router.push("/onboarding");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", fontFamily: "'Codec Pro',sans-serif",
    }}>
      <div style={{ maxWidth: 380, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 8 }}>primer</div>
          <p style={{ fontSize: 14, color: "rgba(0,3,50,0.4)", fontWeight: 300 }}>The work before the work.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28, borderRadius: 100, background: "rgba(0,3,50,0.04)", padding: 3 }}>
          <button onClick={() => { setTab("signup"); setError(""); }} style={{
            flex: 1, padding: "10px", borderRadius: 100, border: "none",
            background: tab === "signup" ? "#fff" : "transparent",
            boxShadow: tab === "signup" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            fontSize: 13, fontWeight: 600, color: tab === "signup" ? "#000332" : "rgba(0,3,50,0.4)",
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign up</button>
          <button onClick={() => { setTab("signin"); setError(""); }} style={{
            flex: 1, padding: "10px", borderRadius: 100, border: "none",
            background: tab === "signin" ? "#fff" : "transparent",
            boxShadow: tab === "signin" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            fontSize: 13, fontWeight: 600, color: tab === "signin" ? "#000332" : "rgba(0,3,50,0.4)",
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign in</button>
        </div>

        {error && <p style={{ fontSize: 13, color: "#FF9090", marginBottom: 14, textAlign: "center" }}>{error}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: "14px 18px", border: "1.5px solid rgba(0,3,50,0.1)", borderRadius: 10, background: "#fff", fontSize: 14, color: "#000332", outline: "none", fontFamily: "inherit" }}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={e => e.key === "Enter" && (tab === "signup" ? handleSignUp() : handleSignIn())}
            style={{ padding: "14px 18px", border: "1.5px solid rgba(0,3,50,0.1)", borderRadius: 10, background: "#fff", fontSize: 14, color: "#000332", outline: "none", fontFamily: "inherit" }}
          />
          <button
            onClick={tab === "signup" ? handleSignUp : handleSignIn}
            disabled={loading}
            style={{
              padding: "14px", borderRadius: 100, border: "none",
              background: "#FF9090", color: "#000332",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", opacity: loading ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {loading ? (tab === "signup" ? "Creating account..." : "Signing in...") : (tab === "signup" ? "Create account" : "Sign in")}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "rgba(0,3,50,0.3)", textAlign: "center", marginTop: 20, fontWeight: 300 }}>
          {tab === "signup" ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => { setTab(tab === "signup" ? "signin" : "signup"); setError(""); }} style={{ background: "none", border: "none", color: "#FF9090", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            {tab === "signup" ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
