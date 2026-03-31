"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push("/studio");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{ maxWidth: 380, width: "100%" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#000332",
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}
        >
          welcome back.
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(0,3,50,0.5)",
            marginBottom: 28,
          }}
        >
          sign in to access your track.
        </p>
        {error && (
          <p style={{ fontSize: 13, color: "#FF6B6B", marginBottom: 14 }}>
            {error}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your email"
            style={{
              padding: "16px 20px",
              border: "1.5px solid rgba(0,3,50,0.12)",
              borderRadius: 100,
              background: "transparent",
              fontSize: 14,
              color: "#000332",
              outline: "none",
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            style={{
              padding: "16px 20px",
              border: "1.5px solid rgba(0,3,50,0.12)",
              borderRadius: 100,
              background: "transparent",
              fontSize: 14,
              color: "#000332",
              outline: "none",
            }}
          />
          <button
            onClick={handleSignIn}
            disabled={loading}
            style={{
              background: "#000332",
              color: "#FAF7F0",
              border: "none",
              padding: "16px 28px",
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "signing in..." : "sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
