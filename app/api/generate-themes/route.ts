import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Group these thinking sessions into 2-5 themes based on what they're ABOUT, not how they were processed. Look at the goals and synthesis content.

Rules:
- Group by topic/subject matter, NOT by mode (never use "clarity sessions" or "decision sessions" as a theme)
- Labels should feel human and casual, not corporate: "career decisions", "product positioning", "health and habits"
- Labels should be lowercase, under 5 words
- A session can only belong to one theme
- If a session doesn't fit any theme, create an "everything else" theme
- 2-5 themes max

Respond with ONLY a JSON array:
[{"label":"...","sessionIds":["...",""]}]`;

export async function POST(req: Request) {
  try {
    const { sessions } = await req.json();
    if (!sessions?.length || sessions.length < 3) return NextResponse.json({ themes: [] });

    const sessionList = sessions.map((s: { id: string; goal: string; synthesis_snippet?: string }) => {
      const snippet = s.synthesis_snippet ? ` — ${s.synthesis_snippet}` : "";
      return `[${s.id}] ${s.goal}${snippet}`;
    }).join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: `Sessions:\n${sessionList}` }],
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
