import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ADMIN_EMAIL = "rand.aboudi@gmail.com";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    // Verify admin
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", userId)
      .maybeSingle();

    // Check via auth table for email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (authUser?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all sessions with full data
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch all profiles for user names
    const userIds = [...new Set((sessions || []).map((s: Record<string, unknown>) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: { id: string; name: string }) => {
      profileMap[p.id] = p.name || "Unknown";
    });

    // Count unique users
    const uniqueUsers = new Set(userIds).size;

    // Today's sessions
    const today = new Date().toISOString().split("T")[0];
    const todaySessions = (sessions || []).filter((s: Record<string, unknown>) =>
      (s.created_at as string)?.startsWith(today)
    ).length;

    // Average notes
    let totalNotes = 0;
    let synthCount = 0;
    const enriched = (sessions || []).map((s: Record<string, unknown>) => {
      const cs = s.canvas_state as Record<string, unknown> | null;
      const notes = Array.isArray(cs?.notes) ? cs.notes as unknown[] : [];
      const discoveries = Array.isArray(cs?.discoveries) ? cs.discoveries as unknown[] : [];
      const patterns = Array.isArray(cs?.patterns) ? cs.patterns as unknown[] : [];
      totalNotes += notes.length;
      if (s.synthesis) synthCount++;
      return {
        id: s.id,
        user_id: s.user_id,
        user_name: profileMap[s.user_id as string] || "Unknown",
        goal: s.goal || "",
        mode: s.mode || "clarity",
        qas: s.qas || [],
        dimensions: s.dimensions || [],
        canvas_state: s.canvas_state,
        synthesis: s.synthesis,
        confidence_score: s.confidence_score,
        created_at: s.created_at,
        updated_at: s.updated_at,
        note_count: notes.length,
        discovery_count: discoveries.length,
        pattern_count: patterns.length,
        has_synthesis: !!s.synthesis,
      };
    });

    return NextResponse.json({
      sessions: enriched,
      stats: {
        totalSessions: enriched.length,
        totalUsers: uniqueUsers,
        todaySessions,
        avgNotes: enriched.length > 0 ? Math.round(totalNotes / enriched.length) : 0,
        synthRate: enriched.length > 0 ? Math.round((synthCount / enriched.length) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("[admin]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
