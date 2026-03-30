import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { theme, insight, actions, source_day_submission_id, userId } =
      await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase.from("expansions").insert({
      user_id: userId,
      source_day_submission_id: source_day_submission_id || null,
      theme: theme || null,
      insight: insight || null,
      actions: actions || null,
    });

    if (error) {
      console.error("Expansion save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
