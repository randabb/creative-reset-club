import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { transcript, direction, thread } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const userMessage = `Transcript: ${transcript}\n\nThread to focus on: ${thread || direction || "what they discovered"}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: `You are a creative thinking coach helping someone work through a personal discovery they made during a reflection exercise.

Your job is to generate exactly 3 action items that are:
1. Directly grounded in the specific words and ideas from their transcript — reference what they actually said
2. Each one uses the canvas as the workspace — reference specific canvas tools (sticky note, text tool, draw tool, arrows) as part of the action itself
3. Concrete and immediate — not vague ("think about it") but specific ("write X on a sticky note and place it...")
4. Grounded in creative practice research — draw on ideas from flow state, attention, resistance, or identity without being academic

Return ONLY a JSON array with exactly 3 objects, each with:
- "timeframe": one of "first move", "this week", "the practice"
- "text": the action step (2-3 sentences max, specific and canvas-directed)

No preamble, no explanation, just the JSON array.`,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[expansion/actions] Anthropic error:", res.status, errBody);
      return NextResponse.json({ error: "API call failed" }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "";

    if (!text) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    // Parse JSON from response — handle potential markdown code blocks
    let actions;
    try {
      const jsonStr = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
      actions = JSON.parse(jsonStr);
    } catch {
      console.error("[expansion/actions] Failed to parse JSON:", text);
      return NextResponse.json({ error: "Invalid response format" }, { status: 502 });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: "Invalid actions format" }, { status: 502 });
    }

    return NextResponse.json({ actions });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
