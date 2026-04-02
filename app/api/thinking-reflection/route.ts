import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `The user just answered a thinking question. Give them ONE sentence (under 12 words) that mirrors back what they just revealed about their own thinking.

RULES:
- Use THEIR words, not yours
- Point out what shifted, what surfaced, or what's now clearer
- Be warm but not cheerful. No exclamation marks.
- Don't praise them ("great answer!"). Don't coach them ("keep going!"). Don't say "most people skip this."
- Just name what happened in their thinking.
- Sound like a thoughtful friend who just heard what they said and noticed something in it.

EXAMPLES:
- "So the real problem isn't the content — it's knowing who it's for."
- "You already know the answer. You just haven't committed to it."
- "That's the part you keep avoiding. Worth sitting with."
- "The way you said that — 'technically right but not me' — that's the whole thing."
- "You went from five ideas to one. That's the move."

Respond with ONLY the reflection sentence. Nothing else.`;

const SYSTEM_FINAL = `The user just answered their FINAL thinking question (question 4 of 4). Name the thread that connects everything they said across all four answers. Make it feel like arrival, not a summary. Under 12 words. Use their words.

EXAMPLES:
- "There it is. That's what this is actually about."
- "Four answers and you landed on something real."
- "You started scattered. Now you know exactly where to aim."

Respond with ONLY the reflection sentence. Nothing else.`;

export async function POST(req: Request) {
  try {
    const { questionNumber, userAnswer, capture, previousQAs } = await req.json();
    if (!userAnswer) return NextResponse.json({ reflection: null });

    const isFinal = questionNumber >= 4;
    let userMsg = `USER'S GOAL: ${capture || "Not specified"}\n\nLATEST ANSWER (Q${questionNumber}):\n${userAnswer}`;
    if (previousQAs && previousQAs.length > 0) {
      userMsg += "\n\nALL ANSWERS SO FAR:\n";
      previousQAs.forEach((qa: { question: string; answer: string }, i: number) => {
        userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n\n`;
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 40,
      system: isFinal ? SYSTEM_FINAL : SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ reflection: text || null });
  } catch (err) {
    console.error("[thinking-reflection]", err);
    return NextResponse.json({ reflection: null });
  }
}
