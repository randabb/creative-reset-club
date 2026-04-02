import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 15;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Read the user's capture text and determine which thinking mode they need most. Respond with ONLY a JSON object:
{"mode":"clarity|expansion|decision|expression","reason":"One sentence explaining why this mode fits, written directly to the user using 'you/your'. Example: 'You said you need ideas — let's stretch this in new directions.' NOT 'They explicitly say they need ideas.' Keep it casual and short."}

CLARITY: They're tangled, overwhelmed, or can't see what matters most. Words like: "figure out", "understand", "too many", "messy", "confused", "what matters", "sort through", "overwhelmed"

EXPANSION: They need new angles, their idea feels flat or obvious, they want to stretch it. Words like: "need new ideas", "brainstorm", "fresh angles", "what else", "creative", "explore options"

DECISION: They're choosing between options or need to commit. There's a fork in the road. Words like: "should I", "deciding between", "which one", "commit", "choose", "tradeoff", "pros and cons", "or"

EXPRESSION: They know what they think but can't say it well. They need to articulate, pitch, or communicate. Words like: "write", "messaging", "pitch", "explain", "communicate", "articulate", "present", "outbound", "campaign", "copy", "email"

IMPORTANT DISTINCTIONS:
- "I want to write messaging" = EXPRESSION (they need to articulate something)
- "I want to explore new messaging ideas" = EXPANSION (they need creative options)
- "I want to figure out my messaging strategy" = CLARITY (they're tangled)
- "I can't decide between two messaging approaches" = DECISION (they're choosing)
- "I want to create a strategy" = CLARITY (they need to untangle and figure it out)
- "I want to plan something" = CLARITY (they need to sort through what matters)

The word "write" or "articulate" strongly suggests EXPRESSION.
The word "figure out" or "understand" strongly suggests CLARITY.
The word "decide" or "choose" strongly suggests DECISION.
Only suggest EXPANSION when they explicitly need more ideas or angles.
Default to CLARITY over EXPANSION when the intent is ambiguous.`;

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
