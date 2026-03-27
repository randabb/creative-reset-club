import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const userId = formData.get("userId") as string;
    const programId = formData.get("programId") as string;
    const dayNumber = formData.get("dayNumber") as string;

    if (!audioFile || !userId || !programId || !dayNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const filePath = `${userId}/${programId}/day_${dayNumber}_${timestamp}.webm`;
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("voice-notes")
      .upload(filePath, buffer, {
        contentType: "audio/webm",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("voice-notes")
      .getPublicUrl(filePath);

    const voiceNoteUrl = urlData.publicUrl;

    // Update day_submissions with voice URL
    await supabase
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

    // Transcribe with OpenAI Whisper
    let transcript = "";
    try {
      const whisperForm = new FormData();
      whisperForm.append("file", new Blob([buffer], { type: "audio/webm" }), "recording.webm");
      whisperForm.append("model", "whisper-1");

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: whisperForm,
      });

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json();
        transcript = whisperData.text || "";

        // Save transcript to day_submissions
        await supabase
          .from("day_submissions")
          .update({ voice_note_transcript: transcript })
          .eq("user_id", userId)
          .eq("program_id", programId)
          .eq("day_number", parseInt(dayNumber));
      }
    } catch (transcribeErr) {
      console.error("Transcription error:", transcribeErr);
      // Non-fatal — voice note is still saved
    }

    return NextResponse.json({
      url: voiceNoteUrl,
      transcript: transcript || null,
    });
  } catch (err) {
    console.error("Voice API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
