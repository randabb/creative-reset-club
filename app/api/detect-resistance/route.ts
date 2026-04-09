import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `CRITICAL: Write in second person (you/your).

You just read someone's thinking synthesis. Determine if the conclusion is the kind of thing that's clear but hard to act on.

Signs of resistance-worthy conclusions:
- The brief recommends stopping, ending, or leaving something
- The brief recommends a significant change that undoes previous work
- The brief recommends a difficult conversation
- The brief recommends choosing one path that means letting go of another they care about
- The brief recommends something the user's own answers showed they're afraid of

If resistance is likely, write a single question that names the gap between knowing and doing. Under 20 words. Warm, not pushy.

Examples:
- "This is clear. But you're not ready yet. What's actually holding you back?"
- "You know the answer. What would make you brave enough to do it?"
- "The thinking is done. What are you afraid happens if you act on it?"

If the conclusion is straightforward and not emotionally loaded, return hasResistance: false.

Respond with ONLY a JSON object:
{"hasResistance":true,"resistancePrompt":"..."}
or
{"hasResistance":false,"resistancePrompt":null}`;

export async function POST(req: Request) {
  try {
    const { goal, synthesis, discoveries, patterns } = await req.json();
    if (!synthesis) return NextResponse.json({ hasResistance: false, resistancePrompt: null });

    let userMsg = `GOAL: ${goal || ""}\n\nSYNTHESIS:\n${synthesis}`;
    if (discoveries) userMsg += `\n\nDISCOVERIES:\n${discoveries}`;
    if (patterns) userMsg += `\n\nPATTERNS:\n${patterns}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 60, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ hasResistance: false, resistancePrompt: null });
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({
      hasResistance: !!parsed.hasResistance,
      resistancePrompt: parsed.resistancePrompt || null,
    });
  } catch (err) {
    console.error("[detect-resistance]", err);
    return NextResponse.json({ hasResistance: false, resistancePrompt: null });
  }
}
