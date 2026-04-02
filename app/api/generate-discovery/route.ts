import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `The user just wrote a thinking response on their canvas. Summarize their key insight in ONE short line (under 15 words) that feels like a discovery. Write it in second person present tense, like they just realized something.

RULES:
- Start with a bold label that names what was discovered, followed by a colon
- Under 15 words total
- Make it feel like progress, not a summary
- Use their actual words/concepts

Examples:
- "Your real user: solo founders who think in multiple directions"
- "The trigger: when AI output feels technically right but not them"
- "Biggest risk: lag kills trust faster than missing features"
- "The gap: people want thinking tools, not just output tools"
- "First move: find 5 founders who already complain about this"

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
