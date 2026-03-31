"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface QA { question: string; answer: string; }

function VoiceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const capture = searchParams.get("capture") || "";
  const mode = searchParams.get("mode") || "clarity";
  const qasRaw = searchParams.get("qas") || "[]";
  let qas: QA[] = [];
  try { qas = JSON.parse(qasRaw); } catch { qas = []; }

  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [denied, setDenied] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!capture) router.push("/session/new");
  }, [capture, router]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setDone(true);
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setDenied(true);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const reRecord = () => {
    setDone(false);
    setAudioBlob(null);
    setSeconds(0);
  };

  const proceed = () => {
    // Build params for next screen
    const params = new URLSearchParams({ capture, mode, qas: JSON.stringify(qas) });
    if (audioBlob) {
      // Store audio blob reference — for now pass a flag
      params.set("hasVoice", "true");
    }
    // Check first time (simple: use localStorage)
    const hasSeenCanvas = localStorage.getItem("primer-canvas-intro-seen");
    if (!hasSeenCanvas) {
      router.push(`/session/canvas-intro?${params.toString()}`);
    } else {
      router.push(`/session/plan?${params.toString()}`);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!capture) return null;

  return (
    <div style={{
      minHeight: "100vh", background: "#FAF7F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px 80px",
      fontFamily: "'Codec Pro', sans-serif",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#000332", letterSpacing: "-0.01em", marginBottom: 56 }}>
        primer
      </div>

      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* Prompt */}
        <h1 style={{ fontSize: 23, fontWeight: 400, fontStyle: "italic", color: "#000332", lineHeight: 1.4, marginBottom: 4, letterSpacing: "-0.01em" }}>
          Talk through what emerged.
        </h1>
        <p style={{ fontSize: 23, fontWeight: 400, fontStyle: "italic", color: "rgba(0,3,50,0.5)", lineHeight: 1.4, marginBottom: 44, letterSpacing: "-0.01em" }}>
          What&rsquo;s clearer now?
        </p>

        {/* Record button */}
        <div style={{ marginBottom: 16 }}>
          {!done ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: 80, height: 80, borderRadius: "50%",
                background: recording ? "#000332" : "#FF9090",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto",
                boxShadow: recording ? "0 0 0 0 rgba(255,144,144,0.4)" : "none",
                animation: recording ? "recPulse 2s ease-in-out infinite" : "none",
                transition: "background 0.2s",
              }}
            >
              {recording ? (
                <div style={{ width: 22, height: 22, borderRadius: 5, background: "#FF9090" }} />
              ) : (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
              )}
            </button>
          ) : (
            <button
              onClick={reRecord}
              style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(0,3,50,0.06)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto",
                fontSize: 28, color: "rgba(0,3,50,0.4)",
              }}
            >
              ↻
            </button>
          )}
        </div>

        {/* Timer / status */}
        {recording && (
          <p style={{ fontSize: 20, fontFamily: "'DM Mono', monospace", color: "#000332", fontWeight: 400, marginBottom: 16 }}>
            {formatTime(seconds)}
          </p>
        )}

        {!recording && !done && !denied && (
          <p style={{ fontSize: 13, color: "rgba(0,3,50,0.35)", fontWeight: 300, lineHeight: 1.6, marginBottom: 16, maxWidth: 320, margin: "0 auto" }}>
            Speak for as long as you need. Even 60 seconds is enough.
          </p>
        )}

        {denied && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "rgba(0,3,50,0.45)", fontWeight: 300, marginBottom: 12 }}>
              Microphone access is needed for voice reflection. You can enable it in your browser settings.
            </p>
            <button onClick={proceed} style={{
              background: "#FF9090", color: "#000332", border: "none",
              padding: "14px 32px", borderRadius: 100, fontSize: 14,
              fontWeight: 700, cursor: "pointer", fontFamily: "'Codec Pro', sans-serif",
            }}>
              Skip and continue
            </button>
          </div>
        )}

        {done && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 14, color: "#000332", fontWeight: 500, marginBottom: 24 }}>
              ✓ {formatTime(seconds)} recorded
            </p>
            <button onClick={proceed} style={{
              background: "#FF9090", color: "#000332", border: "none",
              padding: "16px 40px", borderRadius: 100, fontSize: 15,
              fontWeight: 700, cursor: "pointer", fontFamily: "'Codec Pro', sans-serif",
              width: "100%", maxWidth: 320,
            }}>
              Continue to canvas
            </button>
          </div>
        )}

        {/* Skip link */}
        {!done && !denied && (
          <button
            onClick={proceed}
            style={{
              marginTop: 32, background: "none", border: "none",
              fontSize: 13, color: "rgba(0,3,50,0.3)", cursor: "pointer",
              fontFamily: "'Codec Pro', sans-serif",
              textDecoration: "underline", textUnderlineOffset: 3,
            }}
          >
            Skip voice reflection
          </button>
        )}

        {/* Review panel */}
        {qas.length > 0 && (
          <div style={{ marginTop: 56, textAlign: "left" }}>
            <button
              onClick={() => setReviewOpen(!reviewOpen)}
              style={{
                width: "100%", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", padding: "12px 0",
                borderTop: "1px solid rgba(0,3,50,0.08)",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(0,3,50,0.35)" }}>
                Review your written answers
              </span>
              <span style={{ fontSize: 14, color: "rgba(0,3,50,0.3)", transition: "transform 0.2s", transform: reviewOpen ? "rotate(180deg)" : "" }}>
                ▾
              </span>
            </button>
            {reviewOpen && (
              <div style={{ paddingTop: 8 }}>
                {qas.map((qa, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 14, fontStyle: "italic", color: "#000332", fontWeight: 300, marginBottom: 6 }}>
                      {qa.question}
                    </p>
                    <p style={{
                      fontSize: 14, color: "#000332", lineHeight: 1.65, fontWeight: 300,
                      paddingLeft: 14, borderLeft: "2px solid #FF9090",
                    }}>
                      {qa.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes recPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,144,144,0.4); }
          50% { box-shadow: 0 0 0 16px rgba(255,144,144,0); }
        }
      `}</style>
    </div>
  );
}

export default function VoicePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Codec Pro',sans-serif", color: "rgba(0,3,50,0.4)", fontSize: 14 }}>loading...</p>
      </div>
    }>
      <VoiceInner />
    </Suspense>
  );
}
