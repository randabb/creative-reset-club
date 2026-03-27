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
    <>
      <style>{`
        .program-topbar {
          display: none;
        }
        .program-iframe {
          width: 100%;
          height: 100vh;
          border: none;
          display: block;
        }
        @media (max-width: 768px) {
          .program-topbar {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 20px;
            background: #000332;
            font-family: 'Codec Pro', sans-serif;
          }
          .program-iframe {
            height: calc(100vh - 48px);
          }
        }
      `}</style>
      <nav className="program-topbar">
        <a href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "rgba(244,242,238,0.65)", textDecoration: "none" }}>
          ← Home
        </a>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "lowercase", color: "#f4f2ee" }}>
          creativeresetclub
        </span>
      </nav>
      <iframe
        srcDoc={htmlContent}
        className="program-iframe"
        title={validPrograms[slug]?.title || "Program"}
      />
    </>
  );
}
