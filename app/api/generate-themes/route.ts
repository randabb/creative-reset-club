import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are organizing someone's thinking sessions into themes. Each session has a goal and a mode. Group related sessions together and give each group a short, natural label.

Rules:
- Labels should sound like how the person would describe the topic: "building your app", "go-to-market strategy", "team decisions" — not corporate jargon
- 2-5 themes max. Don't over-split.
- Every session must belong to exactly one theme
- If a session doesn't fit any theme, create an "other thoughts" group
- Labels should be lowercase, casual: "thoughts on pricing", "your app idea", "figuring out the team"
- Keep labels under 5 words

Respond with ONLY a JSON array:
[{"label":"...","sessionIds":["...",""]}]`;

export async function POST(req: Request) {
  try {
    const { sessions } = await req.json();
    if (!sessions?.length || sessions.length < 3) return NextResponse.json({ themes: [] });

    const sessionList = sessions.map((s: { id: string; goal: string; mode: string }) =>
      `[${s.id}] (${s.mode}) ${s.goal}`
    ).join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: `SESSIONS:\n${sessionList}` }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ themes: [] });

    const parsed = JSON.parse(match[0]);
    const themes = parsed.filter((t: { label: string; sessionIds: string[] }) =>
      t.label && Array.isArray(t.sessionIds) && t.sessionIds.length > 0
    );

    return NextResponse.json({ themes });
  } catch (err) {
    console.error("[generate-themes]", err);
    return NextResponse.json({ themes: [] });
  }
}
