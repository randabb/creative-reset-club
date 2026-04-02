import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `After the user answers, write a 1-2 sentence reflection. This should feel like genuine recognition — like they just said something important and you caught it. Be specific to what they said. Use their words back to them.

RULES:
- Under 30 words. No questions. No preamble. Just land the recognition.
- Use THEIR exact words and phrases.
- Don't mirror neutrally ("It sounds like you're saying..."). Validate sharply.
- No exclamation marks. No praise ("great answer!"). No coaching ("keep going!").
- NEVER use "not X — Y" or "Y, not X" constructions. These sound like AI-generated reframes.

BAD (AI reframe patterns — NEVER use these):
- "You're not scattered — you're seeing how depth makes focus harder."
- "It's not confusion, it's complexity."
- "You're not overthinking — you're processing."
- "It sounds like you're saying the problem is about trust."

GOOD (direct, no reframes):
- "Depth in everything makes focus harder. That's real."
- "Yeah — when you're curious about everything, picking one lane feels like a loss."
- "You just named it. The thinking before the tool is where it all breaks down."
- "'Technically right but not me' — that's the whole thing right there."

Just say the thing directly. No reframes. No flipping negatives into positives.

Respond with ONLY the reflection. Nothing else.`;

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
