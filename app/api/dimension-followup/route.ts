import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are the thinking coach for Primer. The user is working through a specific dimension of their thinking. Based on their previous answers within this dimension, decide what happens next.

You have four actions: clarify, expand, decide, express. Each does something different:
- clarify: cut to the core of what they said
- expand: give them angles they haven't considered
- decide: force a choice or tradeoff
- express: draft what they actually mean in clean language

Rules:
- Progress through different actions. Don't repeat the same action twice in a row.
- A dimension is usually explored in 2-3 rounds. Don't drag it out.
- If the user has surfaced a clear insight and there's nothing more to dig into, mark it as complete.
- Keep questions under 15 words. Use their language.
- Write the question like a sharp friend, not a consultant.

Respond with ONLY a JSON object:
{"status":"continue|complete","action":"clarify|expand|decide|express","question":"your question here or null","discovery":"one sentence insight from what they just said, using their words, or null"}

If status is "complete", action and question can be null but include a discovery summary for this dimension.`;

interface QA { question: string; answer: string; }

export async function POST(req: Request) {
  try {
    const { goal, dimension, dimensionQAs, allDimensions, previousActions } = await req.json();

    let userMsg = `GOAL: ${goal || "Not specified"}\n\nCURRENT DIMENSION: ${dimension || "General"}\n\n`;
    if (dimensionQAs?.length) {
      userMsg += "ANSWERS IN THIS DIMENSION SO FAR:\n";
      (dimensionQAs as QA[]).forEach((qa, i) => {
        userMsg += `Round ${i + 1}: ${qa.question}\nAnswer: ${qa.answer}\n\n`;
      });
    }
    if (previousActions) {
      userMsg += `ACTIONS ALREADY USED: ${previousActions}\n`;
    }
    if (allDimensions) {
      userMsg += `\nALL DIMENSIONS: ${allDimensions}\n`;
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
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ status: "continue", action: "expand", question: "What else is hiding here?", discovery: null });

    const parsed = JSON.parse(match[0]);
    const validActions = ["clarify", "expand", "decide", "express"];
    return NextResponse.json({
      status: parsed.status === "complete" ? "complete" : "continue",
      action: validActions.includes(parsed.action) ? parsed.action : "expand",
      question: parsed.question || null,
      discovery: parsed.discovery || null,
    });
  } catch (err) {
    console.error("[dimension-followup]", err);
    return NextResponse.json({ status: "continue", action: "expand", question: "What else is hiding here?", discovery: null });
  }
}
