import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";
import { STATE_DETECTION_LAYER } from "@/lib/prompts";
import { logStateDetection, type StateDetectionLog } from "@/lib/log-state-detection";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `Generate exactly ONE question for this thinking dimension.

If this is the first question: ask something concrete and specific to their goal that's easy to answer. Get them talking. It should feel like a friend asking a simple question, not a professor.

If this is a follow-up: read their previous answers in this dimension and go deeper. Reference their specific words. Ask the question their last answer is begging to be asked.

NO REPETITION ACROSS DIMENSIONS (critical):
You have access to all questions and answers from previous dimensions. Before generating a question, check if the user already answered something similar. If they did, do not ask it again. Each dimension must explore NEW territory. If the user already explained what derailed them in a previous dimension, don't ask what derailed them again in a different dimension.

Rules:
- Under 15 words
- Use their language
- One idea per question
- The follow-up should feel like "oh, that's the obvious next question" based on what they just said
- Every question MUST connect to their goal. Ask: "How does this help them with their goal?"
- Ground questions in frameworks (First Principles, Inversion, Pre-Mortem, Steelman) but NEVER name them
- NEVER ask a question that's similar to one already asked or answered in a previous dimension

` + STATE_DETECTION_LAYER + `
Respond with ONLY a JSON object:
{"question":"your question here","stateDetection":{"detected_state":"...","detection_signals":["..."],"framework_applied":"...","confidence":"high|medium|low"}}`;

interface QA { question: string; answer: string; }

export async function POST(req: Request) {
  try {
    const { goal, mode, qas, dimension, previousQuestionsAndAnswers, otherDimensionQAs } = await req.json();
    if (!dimension) return NextResponse.json({ question: "What's the real situation here?" });

    let userMsg = `GOAL: ${goal || "Not specified"}\nMODE: ${mode || "clarity"}\nDIMENSION: ${dimension}\n`;
    if (qas?.length) {
      userMsg += "\nGUIDED THINKING:\n";
      (qas as QA[]).forEach((qa, i) => { userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`; });
    }
    if (otherDimensionQAs) {
      userMsg += `\nALREADY ASKED AND ANSWERED IN OTHER DIMENSIONS (do NOT repeat any of these questions or their topics):\n${otherDimensionQAs}\n`;
    }
    if (previousQuestionsAndAnswers?.length) {
      userMsg += "\nPREVIOUS IN THIS DIMENSION:\n";
      (previousQuestionsAndAnswers as QA[]).forEach((qa, i) => {
        userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`;
      });
      userMsg += "\nGenerate the NEXT follow-up question based on their last answer.";
    } else {
      userMsg += "\nThis is the FIRST question for this dimension. Make sure it does not overlap with anything already asked in other dimensions.";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const rawText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    let question = rawText.replace(/^["']|["']$/g, "");
    let stateDetection: StateDetectionLog | null = null;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.question) question = parsed.question;
        if (parsed.stateDetection) stateDetection = parsed.stateDetection;
      }
    } catch { /* plain text response */ }

    const response = NextResponse.json({ question: question || "What's the real situation here?" });

    try { logStateDetection(undefined, "mobile-stickies", stateDetection); } catch { /* never block response */ }

    return response;
  } catch (err) {
    console.error("[mobile-stickies]", err);
    return NextResponse.json({ question: "What's the real situation here?" });
  }
}
