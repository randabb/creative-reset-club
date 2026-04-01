import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 15;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Read the user's capture text and determine which thinking mode they need most. Respond with ONLY a JSON object:
{"mode":"clarity|expansion|decision|expression","reason":"one sentence explaining why, using their words"}

CLARITY: They need to untangle something messy, find the core issue, separate signal from noise
EXPANSION: They need new angles, their idea feels flat or obvious, they want to stretch it
DECISION: They're weighing options, stuck between choices, need to commit
EXPRESSION: They know what they think but can't articulate it, need structure for communication`;

export async function POST(req: Request) {
  try {
    const { capture } = await req.json();
    if (!capture) return NextResponse.json({ mode: "clarity", reason: "Let's start by getting clear on what you're thinking through." });

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 80, system: SYSTEM,
      messages: [{ role: "user", content: capture }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const json = JSON.parse(text.replace(/^```json?\s*/g, "").replace(/\s*```$/g, ""));
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ mode: "clarity", reason: "Let's start by getting clear on what you're thinking through." });
  }
}
