import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `CRITICAL: Always write in second person. Use "you/your/you're" — NEVER "they/their/they're". You are talking directly to the user about their own thinking.

Wrong: "They're exhausted by having to repackage content"
Right: "You're exhausted by having to repackage content"

The user just answered a thinking question. Generate a single discovery — a sharp, crystallized insight from what they wrote. This should feel like their own thinking reflected back to them, clearer than they said it.

Rules:
- One sentence, max 20 words
- Use their words and language
- It should feel like a realization, not a summary
- No "You said..." or "It seems like..." — just state the insight directly
- It should make them think "holy shit, yeah"
- ALWAYS use you/your — never they/their or generic third person

Return ONLY the discovery text as a string, no quotes, no JSON.`;

export async function POST(req: Request) {
  try {
    const { goal, dimension, question, answer, previousDiscoveries } = await req.json();
    if (!answer) return NextResponse.json({ discovery: "" });

    let userMsg = `GOAL: ${goal || ""}\nDIMENSION: ${dimension || ""}\nQUESTION: ${question || ""}\nANSWER: ${answer}`;
    if (previousDiscoveries) userMsg += `\n\nPREVIOUS DISCOVERIES (don't repeat):\n${previousDiscoveries}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 50, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim().replace(/^["']|["']$/g, "") : "";
    return NextResponse.json({ discovery: text || "" });
  } catch (err) {
    console.error("[mobile-discovery]", err);
    return NextResponse.json({ discovery: "" });
  }
}
