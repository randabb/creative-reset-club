import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    console.log("Voice API: OpenAI key present:", !!process.env.OPENAI_API_KEY);

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const userId = formData.get("userId") as string;
    const programId = formData.get("programId") as string;
    const dayNumber = formData.get("dayNumber") as string;
    const transcribeOnly = formData.get("transcribeOnly") as string;

    if (!userId || !programId || !dayNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let voiceNoteUrl = "";
    let buffer: Buffer | null = null;

    // If transcribeOnly, fetch existing audio from storage
    if (transcribeOnly === "true") {
      const existingUrl = formData.get("voiceUrl") as string;
      voiceNoteUrl = existingUrl || "";
      if (!voiceNoteUrl) {
        return NextResponse.json({ error: "No voice URL for retry" }, { status: 400 });
      }
      // Download the audio from Supabase for re-transcription
      try {
        const audioRes = await fetch(voiceNoteUrl);
        if (audioRes.ok) {
          const ab = await audioRes.arrayBuffer();
          buffer = Buffer.from(ab);
          console.log("Voice API: Re-downloaded audio, size:", buffer.length);
        }
      } catch (dlErr) {
        console.error("Voice API: Failed to download existing audio:", dlErr);
        return NextResponse.json({ error: "Could not download audio for retry" }, { status: 500 });
      }
    } else {
      // Normal upload flow
      if (!audioFile) {
        return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
      }

      const timestamp = Date.now();
      const filePath = `${userId}/${programId}/day_${dayNumber}_${timestamp}.webm`;
      const arrayBuffer = await audioFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      console.log("Voice API: Audio file size:", buffer.length, "bytes");

      if (buffer.length === 0) {
        console.error("Voice API: Audio file is empty");
        return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("voice-notes")
        .upload(filePath, buffer, {
          contentType: "audio/webm",
          upsert: true,
        });

      if (uploadError) {
        console.error("Voice API: Upload error:", uploadError);
        return NextResponse.json({ error: "Upload failed", uploaded: false }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from("voice-notes")
        .getPublicUrl(filePath);

      voiceNoteUrl = urlData.publicUrl;
      console.log("Voice API: Upload success, URL:", voiceNoteUrl);

      // Save URL to day_submissions immediately (before transcription)
      const { error: upsertError } = await supabase
        .from("day_submissions")
        .upsert(
          {
            user_id: userId,
            program_id: programId,
            day_number: parseInt(dayNumber),
            voice_note_url: voiceNoteUrl,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "user_id,program_id,day_number" },
        );

      if (upsertError) {
        console.error("Voice API: day_submissions upsert error:", upsertError);
      }
    }

    // Transcribe with OpenAI Whisper (with 55s timeout)
    let transcript = "";
    if (buffer && buffer.length > 0) {
      try {
        console.log("Voice API: Starting Whisper transcription...");
        const whisperForm = new FormData();
        whisperForm.append("file", new Blob([new Uint8Array(buffer)], { type: "audio/webm" }), "recording.webm");
        whisperForm.append("model", "whisper-1");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: whisperForm,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (whisperRes.ok) {
          const whisperData = await whisperRes.json();
          transcript = whisperData.text || "";
          console.log("Voice API: Transcription success, length:", transcript.length);

          await supabase
            .from("day_submissions")
            .update({ voice_note_transcript: transcript })
            .eq("user_id", userId)
            .eq("program_id", programId)
            .eq("day_number", parseInt(dayNumber));
        } else {
          const errText = await whisperRes.text();
          console.error("Voice API: Whisper API error:", whisperRes.status, errText);
        }
      } catch (transcribeErr) {
        if (transcribeErr instanceof Error && transcribeErr.name === "AbortError") {
          console.error("Voice API: Whisper transcription timed out after 55s");
        } else {
          console.error("Voice API: Transcription error:", transcribeErr);
        }
      }
    }

    return NextResponse.json({
      url: voiceNoteUrl,
      transcript: transcript || null,
      uploaded: true,
    });
  } catch (err) {
    console.error("Voice API: Unhandled error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
