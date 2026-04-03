import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Generate exactly ONE question for this thinking dimension.

If this is the first question: ask something concrete and specific to their goal that's easy to answer. Get them talking.

If this is a follow-up: read their previous answers in this dimension and go deeper. Reference their specific words. Ask the question their last answer is begging to be asked.

Rules:
- Under 15 words
- Use their language
- One idea per question
- The follow-up should feel like "oh, that's the obvious next question" based on what they just said

Return ONLY the question as a string, no JSON, no quotes.`;

interface QA { question: string; answer: string; }

export async function POST(req: Request) {
  try {
    const { goal, mode, qas, dimension, previousQuestionsAndAnswers } = await req.json();
    if (!dimension) return NextResponse.json({ question: "What's the real situation here?" });

    let userMsg = `GOAL: ${goal || "Not specified"}\nMODE: ${mode || "clarity"}\nDIMENSION: ${dimension}\n`;
    if (qas?.length) {
      userMsg += "\nGUIDED THINKING:\n";
      (qas as QA[]).forEach((qa, i) => { userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`; });
    }
    if (previousQuestionsAndAnswers?.length) {
      userMsg += "\nPREVIOUS IN THIS DIMENSION:\n";
      (previousQuestionsAndAnswers as QA[]).forEach((qa, i) => {
        userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`;
      });
      userMsg += "\nGenerate the NEXT follow-up question based on their last answer.";
    } else {
      userMsg += "\nThis is the FIRST question for this dimension.";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 40,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim().replace(/^["']|["']$/g, "") : "";
    return NextResponse.json({ question: text || "What's the real situation here?" });
  } catch (err) {
    console.error("[mobile-stickies]", err);
    return NextResponse.json({ question: "What's the real situation here?" });
  }
}
