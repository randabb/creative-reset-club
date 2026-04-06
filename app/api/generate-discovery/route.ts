import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `The user just wrote a thinking response. Distill the one realization that matters into a single sentence.

RULES:
- One sentence. Under 20 words. No compound sentences.
- Use THEIR words. Not your analysis of their words.
- Second person only (you/your). Never they/their.
- No "Key insight:" prefix. No labels. Just the line.
- Should feel like a realization, not a summary.
- Should make them pause and think "yeah, that's it."
- No therapy-speak. No analytical language. No jargon.

BAD: "Key insight: Your weight struggle centers on emotional eating patterns that disrupt consistent habits rather than knowledge gaps about what to do."
GOOD: "Stress is the trigger. Not hunger."

BAD: "Your real challenge is articulating your differentiation in a crowded market of similar solutions."
GOOD: "You can't say what makes you different in one sentence."

BAD: "The core tension lies between wanting creative control and needing to delegate execution."
GOOD: "You want to let go but you don't trust anyone to hold it."

Respond with ONLY the discovery line. Nothing else.`;

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
