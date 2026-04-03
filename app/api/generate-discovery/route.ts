import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `CRITICAL: Always write in second person. Use "you/your/you're" — NEVER "they/their/they're". You are talking directly to the user about their own thinking.

The user just wrote a thinking response on their canvas. Summarize their key insight in ONE short line (under 15 words) that feels like a discovery. Write in second person present tense.

RULES:
- Start with a bold label that names what was discovered, followed by a colon
- Under 15 words total
- Make it feel like progress, not a summary
- Use their actual words/concepts
- ALWAYS use "you/your" — never "they/their" or generic third person

Wrong: "They're exhausted by having to repackage content"
Right: "You're exhausted by having to repackage content"

Examples:
- "Your real user: you're building for founders who think in circles"
- "The trigger: when your AI output feels technically right but not you"
- "Your biggest risk: you lose trust faster than you lose features"
- "The gap: you want a thinking tool, not just an output tool"
- "Your first move: find 5 founders you know who complain about this"

Respond with ONLY the discovery line, nothing else.`;

export async function POST(req: Request) {
  try {
    const { userResponse, dimensionLabel, previousDiscoveries } = await req.json();
    if (!userResponse) return NextResponse.json({ discovery: null });

    let userMsg = `USER'S RESPONSE:\n${userResponse}`;
    if (dimensionLabel) userMsg += `\nDIMENSION: ${dimensionLabel}`;
    if (previousDiscoveries) userMsg += `\nPREVIOUS DISCOVERIES (don't repeat these):\n${previousDiscoveries}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 50,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ discovery: text || null });
  } catch (err) {
    console.error("[generate-discovery]", err);
    return NextResponse.json({ discovery: null });
  }
}
