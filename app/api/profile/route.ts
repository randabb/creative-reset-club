import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { userId, email, username, matched_program, cohort_waitlist,
      q3_block_location, q4_ai_relationship, q5_creative_style,
      q6_time_available, q7_intention } = await req.json();

    if (!userId || !matched_program) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const profile: Record<string, unknown> = {
      id: userId,
      email,
      username,
      matched_program,
      cohort_waitlist: cohort_waitlist ?? false,
    };
    if (q3_block_location) profile.q3_block_location = q3_block_location;
    if (q4_ai_relationship) profile.q4_ai_relationship = q4_ai_relationship;
    if (q5_creative_style) profile.q5_creative_style = q5_creative_style;
    if (q6_time_available) profile.q6_time_available = q6_time_available;
    if (q7_intention) profile.q7_intention = q7_intention;

    const { error } = await supabase.from("profiles").upsert(profile);

    if (error) {
      console.error("Profile upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Profile API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
