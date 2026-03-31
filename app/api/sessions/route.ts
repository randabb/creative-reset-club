import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET: fetch sessions for a user, or a single session by id
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const sessionId = url.searchParams.get("id");

    if (sessionId) {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      return NextResponse.json(data);
    }

    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const { data, error } = await supabase
      .from("sessions")
      .select("id, goal, mode, created_at, updated_at, canvas_state")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add note_count from canvas_state
    const sessions = (data || []).map((s: Record<string, unknown>) => ({
      ...s,
      note_count: Array.isArray((s.canvas_state as { notes?: unknown[] })?.notes)
        ? ((s.canvas_state as { notes: unknown[] }).notes).length
        : 0,
    }));

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST: create a new session
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, goal, mode, qas, dimensions, canvas_state } = body;
    if (!userId || !goal) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        goal,
        mode: mode || "clarity",
        qas: qas || [],
        dimensions: dimensions || [],
        canvas_state: canvas_state || { notes: [], connections: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH: update canvas_state (autosave)
export async function PATCH(req: Request) {
  try {
    const { sessionId, canvas_state, synthesis } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const updateData: Record<string, unknown> = {
      canvas_state,
      updated_at: new Date().toISOString(),
    };
    if (synthesis !== undefined) updateData.synthesis = synthesis;

    const { error } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("id", sessionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
