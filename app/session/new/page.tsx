"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "clarity" | "expansion" | "decision" | "expression";

const MODE_META: Record<Mode, { icon: string; color: string; label: string }> = {
  clarity: { icon: "◎", color: "#6B8AFE", label: "Clarity" },
  expansion: { icon: "✦", color: "#FF9090", label: "Expansion" },
  decision: { icon: "⟁", color: "#7ED6A8", label: "Decision" },
  expression: { icon: "◈", color: "#C4A6FF", label: "Expression" },
};

const FIRST_SESSION_PROMPTS: Record<Mode, string> = {
  clarity: "What's the idea you keep circling back to but can't seem to pin down? The one that's been sitting in the back of your mind for weeks.",
  expansion: "What's the most exciting thing you're working on right now that still feels smaller than it should?",
  decision: "What's the decision you already know the answer to but haven't committed to yet?",
  expression: "What's the thing you believe about your work that you've never been able to say clearly enough?",
};

export default function NewSession() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [capture, setCapture] = useState("");
  const [mode, setMode] = useState<Mode>("clarity");
  const [isFirstSession, setIsFirstSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      // Fetch user's default mode
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_mode")
        .eq("id", user.id)
        .single();

      if (profile?.default_mode) {
        const validModes: Mode[] = ["clarity", "expansion", "decision", "expression"];
        if (validModes.includes(profile.default_mode)) {
          setMode(profile.default_mode as Mode);
        }
      }

      // Check if first session
      try {
        const { count } = await supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (count === 0 || count === null) setIsFirstSession(true);
      } catch {
        setIsFirstSession(true); // table may not exist yet
      }

      setLoading(false);

      // Auto-focus textarea after load
      setTimeout(() => textareaRef.current?.focus(), 100);
    };
    load();
  }, [router]);

  const handleSubmit = () => {
    if (capture.trim().length < 15) return;
    const params = new URLSearchParams({
      capture: capture.trim(),
      mode,
    });
    router.push(`/session/guided?${params.toString()}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    );
  }

  const m = MODE_META[mode];
  const canSubmit = capture.trim().length >= 15;

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px 80px",
      fontFamily: "'Codec Pro', sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        fontSize: 15, fontWeight: 700, color: "#000332",
        letterSpacing: "-0.01em", marginBottom: 64,
      }}>
        primer
      </div>

      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        {/* Prompt */}
        {isFirstSession ? (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase" as const, color: "#FF9090",
              marginBottom: 16,
            }}>
              YOUR FIRST CANVAS
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 400, fontStyle: "italic",
              color: "#000332", lineHeight: 1.45, letterSpacing: "-0.01em",
              marginBottom: 32,
            }}>
              {FIRST_SESSION_PROMPTS[mode]}
            </h1>
          </>
        ) : (
          <h1 style={{
            fontSize: 24, fontWeight: 400, fontStyle: "italic",
            color: "#000332", lineHeight: 1.35, letterSpacing: "-0.01em",
            marginBottom: 32,
          }}>
            What are you thinking through?
          </h1>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey && canSubmit) handleSubmit();
          }}
          placeholder="Start writing. Don't edit, just get it out."
          style={{
            width: "100%", minHeight: 200, padding: "24px 24px",
            border: `1.5px solid ${focused ? "#FF9090" : "rgba(0,3,50,0.1)"}`,
            borderRadius: 12, background: "#fff",
            fontFamily: "'Codec Pro', sans-serif",
            fontSize: 16, lineHeight: 1.75, color: "#000332",
            resize: "vertical", outline: "none",
            transition: "border-color 0.2s ease",
          }}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginTop: 24, width: "100%",
            padding: "16px", borderRadius: 100,
            background: canSubmit ? "#FF9090" : "rgba(0,3,50,0.06)",
            color: canSubmit ? "#000332" : "rgba(0,3,50,0.25)",
            border: "none", fontSize: 15, fontWeight: 700,
            cursor: canSubmit ? "pointer" : "default",
            fontFamily: "'Codec Pro', sans-serif",
            transition: "all 0.25s ease",
          }}
        >
          Let&rsquo;s go deeper
        </button>

        {/* Mode indicator */}
        <div style={{
          marginTop: 16, fontSize: 12,
          color: "rgba(0,3,50,0.3)", fontWeight: 300,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <span style={{ color: m.color, fontSize: 14 }}>{m.icon}</span>
          <span>{m.label} mode</span>
        </div>
      </div>
    </div>
  );
}
