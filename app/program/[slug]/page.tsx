"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const validPrograms: Record<string, { title: string; file: string }> = {
  fear: { title: "Fear to First Move", file: "/programs/fear.html" },
  ai: { title: "Think Before You Build", file: "/programs/ai.html" },
  overwhelmed: { title: "From Many to One", file: "/programs/overwhelmed.html" },
  blank: { title: "Back to the Well", file: "/programs/blank.html" },
};

export default function ProgramPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [status, setStatus] = useState<"loading" | "authorized" | "not-found">("loading");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!validPrograms[slug]) {
        setStatus("not-found");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch(validPrograms[slug].file);
        const html = await res.text();
        setHtmlContent(html);
        setStatus("authorized");
      } catch {
        setStatus("not-found");
      }
    };

    checkAccess();
  }, [slug, router]);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: "100vh", background: "#f4f2ee",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>
          loading...
        </p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div style={{
        minHeight: "100vh", background: "#f4f2ee",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16
      }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "#000332", fontSize: 18 }}>
          program not found.
        </p>
        <a href="/dashboard" style={{
          fontFamily: "'Codec Pro',sans-serif", fontSize: 14, fontWeight: 700,
          color: "#000332", textDecoration: "underline", textUnderlineOffset: 3
        }}>
          ← back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Hamburger button */}
      <button
        onClick={() => setMenuOpen(true)}
        style={{
          position: "fixed", top: 0, left: 0, zIndex: 100,
          background: "#000332", color: "#f4f2ee",
          border: "none", borderRadius: 8,
          padding: "14px 16px", margin: 12,
          fontSize: 18, cursor: "pointer",
          lineHeight: 1, fontFamily: "'Codec Pro',sans-serif",
        }}
      >
        ☰
      </button>

      {/* Drawer backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,3,50,0.5)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Drawer panel */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 280, zIndex: 301,
        background: "#000332",
        display: "flex", flexDirection: "column",
        padding: "32px 0",
        transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease",
        fontFamily: "'Codec Pro',sans-serif",
      }}>
        <div style={{ padding: "0 28px", marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "lowercase", color: "#f4f2ee" }}>
            creativeresetclub
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            style={{ background: "none", border: "none", color: "rgba(244,242,238,0.5)", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "0 16px" }}>
          <a
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            style={{
              display: "block", padding: "10px 12px",
              borderRadius: 10, textDecoration: "none",
              fontSize: 13, fontWeight: 700, color: "rgba(244,242,238,0.65)",
            }}
          >
            ← Home
          </a>
        </div>
      </aside>

      <iframe
        srcDoc={htmlContent}
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
          display: "block",
        }}
        title={validPrograms[slug]?.title || "Program"}
      />
    </div>
  );
}
