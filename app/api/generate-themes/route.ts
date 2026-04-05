import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You group thinking sessions into themes by TOPIC. You MUST return at least 2 themes — never put everything in one group.

Rules:
- Group by what the sessions are ABOUT (topic/subject), never by how they were processed
- Never use words like "clarity", "expansion", "decision", "expression" in labels
- Labels: lowercase, casual, under 5 words. Examples: "career moves", "product positioning", "health and habits"
- Every session must belong to exactly one theme
- Minimum 2 themes, maximum 5
- If sessions are diverse, find the best 2-3 clusters and put outliers in "everything else"

Return ONLY a raw JSON array, no markdown, no backticks, no explanation:
[{"label":"...","sessionIds":["id1","id2"]}]`;

async function generateThemes(sessionList: string): Promise<{ label: string; sessionIds: string[] }[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: sessionList }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
  // Strip markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return [];

  const parsed = JSON.parse(match[0]);
  return parsed.filter((t: { label: string; sessionIds: string[] }) =>
    t.label && Array.isArray(t.sessionIds) && t.sessionIds.length > 0
  );
}

export async function POST(req: Request) {
  try {
    const { sessions } = await req.json();
    if (!sessions?.length || sessions.length < 3) return NextResponse.json({ themes: [] });

    // Filter out sessions with empty goals
    const valid = sessions.filter((s: { id: string; goal: string }) => s.goal && s.goal.trim() && s.goal !== "Untitled canvas");

    if (valid.length < 3) return NextResponse.json({ themes: [] });

    const sessionList = valid.map((s: { id: string; goal: string; synthesis_snippet?: string }, i: number) => {
      const snippet = s.synthesis_snippet ? ` — ${s.synthesis_snippet}` : "";
      return `${i + 1}. [${s.id}] "${s.goal}"${snippet}`;
    }).join("\n");

    const prompt = `Here are ${valid.length} thinking sessions. Group them into 2-5 themes by topic:\n\n${sessionList}`;

    // First attempt
    let themes = await generateThemes(prompt);

    // Retry if only 1 theme returned (the whole point is clustering)
    if (themes.length < 2) {
      console.log("[generate-themes] Only got", themes.length, "themes, retrying");
      themes = await generateThemes(prompt + "\n\nIMPORTANT: You MUST return at least 2 different themes. Split these sessions into meaningful topic clusters.");
    }

    return NextResponse.json({ themes });
  } catch (err) {
    console.error("[generate-themes]", err);
    return NextResponse.json({ themes: [] });
  }
}
