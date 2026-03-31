import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are the session synthesizer for Primer. The user has completed a thinking session. Read their goal, dimensions, and all their canvas notes, then generate a synthesis.

RULES:
- Summarize what they worked through in 2-3 sentences
- Then generate a mode-specific deliverable:
  - CLARITY: A single clarified problem statement (1-2 sentences)
  - EXPANSION: 2-3 strongest angles worth pursuing (bullet points)
  - DECISION: The decision, reasoning, and accepted risk (structured)
  - EXPRESSION: A clean articulation of their position (short paragraph)
- Use their EXACT language. This is THEIR thinking synthesized, not yours.
- Keep the total synthesis under 150 words.

FORMAT — respond with ONLY a JSON object:
{
  "reflection": "2-3 sentence summary of what emerged",
  "deliverable_label": "Your clarified problem / Your strongest angles / Your decision / Your articulated position",
  "deliverable": "the actual deliverable content"
}`;

export async function POST(req: Request) {
  try {
    const { goal, mode, dimensions, allNotes } = await req.json();
    const safeMode = ["clarity", "expansion", "decision", "expression"].includes(mode) ? mode : "clarity";
    const userMsg = `MODE: ${safeMode.toUpperCase()}\nGOAL: "${goal}"\nDIMENSIONS: ${JSON.stringify(dimensions)}\nALL CANVAS NOTES:\n${allNotes}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 300, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    clearTimeout(timer);

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const jsonStr = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    const synthesis = JSON.parse(jsonStr);
    return NextResponse.json(synthesis);
  } catch (err) {
    console.error("[session-synthesis]", err);
    const labels: Record<string, string> = { clarity: "Your clarified problem", expansion: "Your strongest angles", decision: "Your decision", expression: "Your articulated position" };
    const body = await req.clone().json().catch(() => ({}));
    const mode = body.mode || "clarity";
    return NextResponse.json({
      reflection: "You worked through multiple dimensions of your goal and developed your thinking across several angles.",
      deliverable_label: labels[mode] || labels.clarity,
      deliverable: "Review your canvas notes to articulate the key takeaway.",
      fallback: true,
    });
  }
}
