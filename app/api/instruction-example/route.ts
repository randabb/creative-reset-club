import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `The user wants an example of what to write. Give them ONE short example using a DIFFERENT topic than theirs.

RULES:
- 1-2 sentences MAX. Under 25 words.
- Use casual, everyday language. Like you're texting a friend.
- Be concrete and specific. Real names, real situations.
- The example should make them think "oh, got it" instantly.
- NEVER use formal or consulting language.

BAD (too long, too formal):
"Perfectionist founders who spent months crafting detailed product specs but struggle with messy, iterative user acquisition because AI gives them polished frameworks when they need scrappy, experimental tactics."

GOOD (short, clear, instant understanding):
"Freelance designers who ask ChatGPT for client proposals but the tone never sounds like them."
"First-time managers who use AI for feedback scripts but they come out robotic."
"Solo consultants who get AI strategy decks that look smart but miss their client's real problem."

Respond with ONLY the example text, nothing else.`;

export async function POST(req: Request) {
  try {
    const { instruction, goal, dimensionLabel } = await req.json();
    if (!instruction) return NextResponse.json({ example: "Write 2-3 specific sentences about what you actually think, not what sounds good." });

    let userMsg = `INSTRUCTION: ${instruction}`;
    if (goal) userMsg += `\nUSER'S GOAL (use a DIFFERENT topic): ${goal}`;
    if (dimensionLabel) userMsg += `\nDIMENSION: ${dimensionLabel}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 80,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ example: text || "Write 2-3 specific sentences about what you actually think, not what sounds good." });
  } catch (err) {
    console.error("[instruction-example]", err);
    return NextResponse.json({ example: "Write 2-3 specific sentences about what you actually think, not what sounds good." });
  }
}
