import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `The user doesn't understand a thinking instruction and wants an example of what a good response looks like.

Write ONE short example response (2-3 sentences max) that shows what kind of thinking the instruction is asking for.

RULES:
- Use a DIFFERENT topic than the user's goal so they don't just copy it
- Make it concrete and specific
- The example should make the user think "oh, THAT'S what they're asking for"
- Keep it under 40 words

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
