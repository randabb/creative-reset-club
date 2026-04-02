"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ModeRedirect() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const capture = sp.get("capture") || "";
    const mode = sp.get("mode") || "clarity";
    const params = new URLSearchParams({ capture, mode });
    router.replace(`/session/guided?${params.toString()}`);
  }, [router, sp]);
  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>Redirecting...</p>
    </div>
  );
}

export default function ModePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#FAF7F0" }} />}>
      <ModeRedirect />
    </Suspense>
  );
}
