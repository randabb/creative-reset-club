import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `CRITICAL: All discoveries and questions must use second person (you/your/you're). NEVER use they/their/they're. You are talking directly to the user.

You are the thinking coach for Primer. The user is working through a specific dimension of their thinking. Based on their previous answers within this dimension, decide what happens next.

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
- Every question MUST connect to their goal. Ask yourself: "How does this help them with their goal?"
- Ground questions in frameworks (First Principles, Inversion, Pre-Mortem, Steelman) but NEVER name them.

DISCOVERY INSTRUCTIONS (this is the most important part):
The discovery reflects the user's thinking back SHARPER than they said it. It names the thing underneath what they said.
- One or two sentences. Under 20 words total.
- Use THEIR words. Second person. No "Key insight:" prefix.
- No compound sentences. No semicolons. No analytical language.
- Never summarize. Never describe their pattern from outside. Get inside it.
- NEVER use "not X, it's Y" or "it's Y, not X" constructions. Banned.
- Must be specific to THIS user. Reference their actual words. A good discovery could ONLY come from this session.
- Connect two things they said in a way they didn't see.
- If it sounds like therapist notes, a summary, or a motivational poster, throw it out.

NOT EVERY DISCOVERY NEEDS TO CHALLENGE. Some should simply affirm.
When the user says something sharp, specific, and honest, reflect that back. The affirmation must still be specific to what they said, never generic praise. Aim for ~60% challenging, ~40% affirming.

GOOD CHALLENGING: "You said 3 days minimum but you already built in every reason to skip."
GOOD CHALLENGING: "Walking your dog is already movement. You just don't count it."
GOOD AFFIRMING: "Three days with real exceptions. That's a number you'll actually hold."
GOOD AFFIRMING: "Sunday and Wednesday. You didn't say 'a couple days a week' — you picked the actual days."
BAD: "You've defined consistent as 3-4 workouts weekly with clear exceptions."
BAD: "You're really thinking this through."

Respond with ONLY a JSON object:
{"status":"continue|complete","action":"clarify|expand|decide|express","question":"your question here or null","discovery":"the discovery line, or null"}

If status is "complete", action and question can be null but include a discovery.`;

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
