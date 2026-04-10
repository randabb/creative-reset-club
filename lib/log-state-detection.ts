import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface StateDetectionLog {
  detected_state: string;
  detection_signals: string[];
  framework_applied: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Logs state detection results to the session's analysis field in Supabase.
 * Silent — never surfaces to the user. Flags low-confidence unrecognized states for review.
 */
export async function logStateDetection(
  sessionId: string | undefined,
  source: string,
  detection: StateDetectionLog | null,
) {
  if (!sessionId || !detection) return;

  const logEntry = {
    source,
    timestamp: new Date().toISOString(),
    ...detection,
    flagged_for_review: detection.confidence === "low" && detection.detected_state === "unrecognized",
  };

  console.log(`[state-detection] ${source}:`, logEntry);

  try {
    // Fetch existing state_detection_logs
    const { data: session } = await supabase
      .from("sessions")
      .select("canvas_state")
      .eq("id", sessionId)
      .maybeSingle();

    const canvasState = (session?.canvas_state as Record<string, unknown>) || {};
    const existingLogs = Array.isArray(canvasState.state_detection_logs) ? canvasState.state_detection_logs : [];

    await supabase
      .from("sessions")
      .update({
        canvas_state: {
          ...canvasState,
          state_detection_logs: [...existingLogs, logEntry],
        },
      })
      .eq("id", sessionId);
  } catch (err) {
    console.error("[state-detection] Log failed:", err);
  }
}
