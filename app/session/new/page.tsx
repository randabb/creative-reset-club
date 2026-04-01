"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewSession() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [capture, setCapture] = useState("");
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    };
    load();
  }, [router]);

  const handleSubmit = () => {
    if (capture.trim().length < 15) return;
    const params = new URLSearchParams({ capture: capture.trim() });
    router.push(`/session/mode?${params.toString()}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    );
  }

  const canSubmit = capture.trim().length >= 15;

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px 80px", fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 64 }}>
        primer
      </div>

      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, fontStyle: "italic", color: "#000332", lineHeight: 1.35, letterSpacing: "-0.01em", marginBottom: 32 }}>
          What&rsquo;s on your mind?
        </h1>

        <textarea
          ref={textareaRef}
          value={capture}
          onChange={e => setCapture(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey && canSubmit) handleSubmit(); }}
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

        {/* Example prompts */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ fontSize: 12, color: "rgba(0,3,50,0.25)", fontStyle: "italic", fontWeight: 300 }}>
            &ldquo;I need to figure out how to position my product...&rdquo;
          </p>
          <p style={{ fontSize: 12, color: "rgba(0,3,50,0.25)", fontStyle: "italic", fontWeight: 300 }}>
            &ldquo;I can&rsquo;t decide whether to hire or promote internally...&rdquo;
          </p>
          <p style={{ fontSize: 12, color: "rgba(0,3,50,0.25)", fontStyle: "italic", fontWeight: 300 }}>
            &ldquo;I have this idea but I can&rsquo;t explain why it matters...&rdquo;
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginTop: 24, width: "100%", padding: "16px", borderRadius: 100,
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
      </div>
    </div>
  );
}
