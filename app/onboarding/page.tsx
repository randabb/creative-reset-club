"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Onboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Redirect already-onboarded users
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.onboarding_completed) router.push("/studio");
    };
    check();
  }, [router]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          name: name.trim() || null,
          onboarding_completed: true,
        }, { onConflict: "id" });
      }
    } catch { /* continue */ }
    router.push("/studio");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 24 }}>
          primer
        </div>

        {/* Pulsing core */}
        <div style={{ position: "relative", width: 52, height: 52, margin: "0 auto 36px" }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#FF9090", position: "absolute", top: 18, left: 18, animation: "obPulse 3s ease-in-out infinite" }} />
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,144,144,0.3)", position: "absolute", top: 10, left: 10, animation: "obRing 3s ease-in-out infinite" }} />
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1px solid rgba(255,144,144,0.15)", position: "absolute", top: 0, left: 0, animation: "obRing 3s ease-in-out infinite 0.5s" }} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 400, fontStyle: "italic", color: "#000332", letterSpacing: "-0.01em", marginBottom: 12 }}>
          Welcome to your studio.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(0,3,50,0.5)", fontWeight: 300, lineHeight: 1.65, maxWidth: 400, margin: "0 auto 36px" }}>
          Primer is where your thinking starts. Capture what&rsquo;s on your mind, and we&rsquo;ll help you develop it.
        </p>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="What should we call you?"
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "14px 18px",
            border: "1.5px solid rgba(0,3,50,0.1)", borderRadius: 10,
            background: "#fff", fontSize: 15, color: "#000332",
            outline: "none", fontFamily: "inherit", textAlign: "center",
            marginBottom: 20,
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: "100%", padding: "16px", borderRadius: 100,
            background: "#FF9090", color: "#000332", border: "none",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Setting up..." : "Enter your studio"}
        </button>
      </div>

      <style>{`
        @keyframes obPulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.15); opacity:0.8; } }
        @keyframes obRing { 0%,100% { transform:scale(1); opacity:0.3; } 50% { transform:scale(1.15); opacity:0; } }
      `}</style>
    </div>
  );
}
