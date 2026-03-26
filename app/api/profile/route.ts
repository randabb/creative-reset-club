import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { userId, email, username, matched_program, cohort_waitlist } = await req.json();

    if (!userId || !matched_program) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      username,
      matched_program,
      cohort_waitlist: cohort_waitlist ?? false,
    });

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
