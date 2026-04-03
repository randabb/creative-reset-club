import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Generate exactly 3 questions for this thinking dimension. Each question should:
- Be under 15 words
- Be specific to the user's goal and what they said in guided thinking
- Feel like a question they already know the answer to but haven't said out loud
- Use simple, conversational language — no jargon
- Each question should approach the dimension from a different angle

One should be concrete (who, what, when specifically)
One should be emotional (what does it feel like, what's the fear)
One should be provocative (the uncomfortable truth version)

Return ONLY a JSON array of 3 strings.`;

interface QA { question: string; answer: string; }

export async function POST(req: Request) {
  try {
    const { goal, mode, qas, dimension, previousAnswers } = await req.json();
    if (!dimension) return NextResponse.json({ questions: ["What's the real situation here?", "What scares you about this?", "What would you do if no one was watching?"] });

    let userMsg = `GOAL: ${goal || "Not specified"}\nMODE: ${mode || "clarity"}\nDIMENSION: ${dimension}\n`;
    if (qas?.length) {
      userMsg += "\nGUIDED THINKING:\n";
      (qas as QA[]).forEach((qa, i) => { userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`; });
    }
    if (previousAnswers) {
      userMsg += `\nALREADY ANSWERED IN THIS DIMENSION:\n${previousAnswers}\n`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ questions: ["What's the real situation here?", "What scares you about this?", "What would you do if no one was watching?"] });

    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return NextResponse.json({ questions: parsed.slice(0, 3) });
    }
    return NextResponse.json({ questions: ["What's the real situation here?", "What scares you about this?", "What would you do if no one was watching?"] });
  } catch (err) {
    console.error("[mobile-stickies]", err);
    return NextResponse.json({ questions: ["What's the real situation here?", "What scares you about this?", "What would you do if no one was watching?"] });
  }
}
