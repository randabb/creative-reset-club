"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ExpansionRoom from "@/components/ExpansionRoom";

export default function ExpansionRoomPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [transcript, setTranscript] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [userId, setUserId] = useState("");
  const [allTranscripts, setAllTranscripts] = useState<{ day_number: number; voice_note_transcript: string }[]>([]);
  const [canvasContext, setCanvasContext] = useState<unknown>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("matched_program")
        .eq("id", user.id)
        .single();

      if (!profile?.matched_program) {
        setStatus("error");
        return;
      }

      const { data: sub } = await supabase
        .from("day_submissions")
        .select("id, voice_note_transcript")
        .eq("user_id", user.id)
        .eq("program_id", profile.matched_program)
        .eq("day_number", 1)
        .maybeSingle();

      if (!sub?.voice_note_transcript) {
        setStatus("error");
        return;
      }

      // Fetch all voice transcripts for this track
      const { data: allSubs } = await supabase
        .from("day_submissions")
        .select("day_number, voice_note_transcript")
        .eq("user_id", user.id)
        .eq("program_id", profile.matched_program)
        .not("voice_note_transcript", "is", null)
        .order("day_number", { ascending: true });

      // Fetch canvas context
      const { data: canvas } = await supabase
        .from("expansion_canvas")
        .select("canvas_data")
        .eq("user_id", user.id)
        .maybeSingle();

      setTranscript(sub.voice_note_transcript);
      setSubmissionId(sub.id);
      setUserId(user.id);
      setAllTranscripts(allSubs?.filter((s) => s.voice_note_transcript) as { day_number: number; voice_note_transcript: string }[] || []);
      setCanvasContext(canvas?.canvas_data || null);
      setStatus("ready");
    };

    load();
  }, [router]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "#000332", fontSize: 16 }}>complete day 1 with a voice reflection to unlock the expansion room.</p>
        <a href="/studio" style={{ fontFamily: "'Codec Pro',sans-serif", fontSize: 14, fontWeight: 700, color: "#000332", textDecoration: "underline", textUnderlineOffset: 3 }}>← back to dashboard</a>
      </div>
    );
  }

  return <ExpansionRoom initialDiscovery={transcript} sourceSubmissionId={submissionId} userId={userId} allTranscripts={allTranscripts} canvasContext={canvasContext} />;
}
