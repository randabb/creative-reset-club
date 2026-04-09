import { NextResponse } from "next/server";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { writing } = await req.json();

    if (!writing || typeof writing !== "string" || writing.trim().length === 0) {
      return NextResponse.json({ error: "No writing provided" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        system: PRIMER_CHARACTER + "The user has just written a reflection. Read it carefully. Your job is to generate exactly one follow-up question that responds directly and specifically to what they wrote — not a generic question about creativity or feelings. The question should name something specific from their writing, surface a tension they touched on but didn't examine, or push on an assumption they seem to be making. Rules: one question only, no preamble, no praise, no feedback, no explanation. Never ask yes or no questions. Never use the words 'reflect', 'explore', 'delve', 'share', or 'feel'. Never ask about the body or physical sensations. Keep it under 20 words. If the question could apply to anyone who didn't write this specific piece, it's not good enough — rewrite it.",
        messages: [{ role: "user", content: writing }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[generate-keep-going] Anthropic API error:", res.status, errBody);
      return NextResponse.json({ error: "API call failed" }, { status: 502 });
    }

    const data = await res.json();
    const question = data.content?.[0]?.text?.trim() || "";

    if (!question) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
