import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `You are the thinking coach for Primer. The user has a goal and 4-5 dimensions to think through. For each dimension, suggest which thinking action would be most useful to start with, and write a first question.

Actions:
- clarify: When this dimension is tangled or has hidden assumptions to surface
- expand: When this dimension needs new angles or creative possibilities
- decide: When this dimension involves a choice or tradeoff to resolve
- express: When this dimension needs to be articulated or communicated clearly

For each dimension, respond with:
- action: one of clarify/expand/decide/express
- question: A specific first question (under 15 words) that references the user's goal. Use their language. Start with a verb.

Your questions must be grounded in expert thinking frameworks — but the PHRASING must be short, conversational, and simple.

Good: "Who's already frustrated with how things work there?"
Bad: "What would have to be true about their internal politics for this to get approved?"

Under 15 words. One idea per question. Use "you" and "they" not abstract language. No framework names, no jargon.

CRITICAL: Every question MUST connect to the user's goal. Ask yourself: "How does this help them?" Ground in frameworks (First Principles, Inversion, Pre-Mortem) but never name them.

Respond with ONLY a JSON array:
[{"dimension":"dimension label","action":"clarify","question":"your question here"}]`;

interface QA { question: string; answer: string; }

export async function POST(req: Request) {
  try {
    const { goal, dimensions, qas } = await req.json();
    if (!dimensions?.length) return NextResponse.json({ suggestions: [] });

    let userMsg = `GOAL: ${goal || "Not specified"}\n\nDIMENSIONS:\n`;
    dimensions.forEach((d: { label: string; description: string }, i: number) => {
      userMsg += `${i + 1}. ${d.label} — ${d.description}\n`;
    });
    if (qas?.length) {
      userMsg += "\nGUIDED THINKING ANSWERS:\n";
      (qas as QA[]).forEach((qa, i) => {
        userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n\n`;
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ suggestions: [] });

    const parsed = JSON.parse(match[0]);
    const validActions = ["clarify", "expand", "decide", "express"];
    const suggestions = parsed
      .filter((s: { dimension: string; action: string; question: string }) => s.dimension && validActions.includes(s.action) && s.question)
      .map((s: { dimension: string; action: string; question: string }) => ({
        dimension: s.dimension,
        action: s.action,
        question: s.question,
      }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[suggest-dimension-actions]", err);
    return NextResponse.json({ suggestions: [] });
  }
}
