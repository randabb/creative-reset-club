import { NextResponse } from "next/server";

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
        system: "You are a thinking coach embedded in a creative practice app. The user has just written a reflection in response to a daily prompt. Your job is to generate exactly one follow-up question that pushes them to go somewhere they haven't gone yet. Rules: one question only, no preamble, no praise, no feedback, no explanation. The question should feel like it comes from a perceptive human who read what they wrote carefully. It should surface something they touched on but didn't go into, or name something they seem to be avoiding. Never ask yes or no questions. Never use the words 'reflect', 'explore', 'delve', or 'share'. Keep it under 20 words.",
        messages: [{ role: "user", content: writing }],
      }),
    });

    if (!res.ok) {
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
