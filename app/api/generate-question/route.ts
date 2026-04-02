import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  GUIDED_THINKING_SYSTEM_PROMPT,
  FALLBACK_QUESTIONS,
} from "@/lib/prompts/guided-thinking";
import { INTELLECTUAL_LAYER } from "@/lib/prompts/intellectual-layer";

export const maxDuration = 30;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface PreviousQA {
  question: string;
  answer: string;
}

export async function POST(req: Request) {
  try {
    const { mode, capture, previousQAs, questionNumber, arcContext } =
      await req.json();

    if (!capture || !mode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validModes = ["clarity", "expansion", "decision", "expression"];
    const safeMode = validModes.includes(mode) ? mode : "clarity";
    const qNum = Math.min(Math.max(questionNumber || 1, 1), 2);

    // Build the user message with full context
    let userMessage = `THINKING MODE: ${safeMode.toUpperCase()}\nQUESTION NUMBER: ${qNum} of 2\n\n`;
    userMessage += `INITIAL CAPTURE:\n${capture}\n`;

    if (previousQAs && previousQAs.length > 0) {
      userMessage += "\nPREVIOUS QUESTIONS AND ANSWERS IN THIS SESSION:\n";
      previousQAs.forEach((qa: PreviousQA, i: number) => {
        userMessage += `\nQ${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n`;
      });
    }

    if (arcContext) {
      userMessage += `\nARC CONTEXT (previous sessions):\n${arcContext}\n`;
    }

    userMessage += `\nGenerate question ${qNum} for ${safeMode} mode.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: GUIDED_THINKING_SYSTEM_PROMPT + "\n\n--- INTELLECTUAL LAYER ---\n\n" + INTELLECTUAL_LAYER + "\n\nADDITIONAL INSTRUCTION: Before generating each question, silently classify:\n- SITUATION TYPE (strategy, product, people, career, communication, operations, creative, financial, complexity)\n- THINKING CHALLENGE (assumption blindness, option paralysis, idea thinness, articulation gap, complexity overwhelm, fear of commitment, pattern blindness, stakeholder misalignment)\nThen select the 2-3 most relevant frameworks from the intellectual layer and generate the question drawing from those specific framework question patterns. Adapt the patterns to use the user's exact language.\n\nFINAL CHECK: After generating a question, check: can the user answer this with 'sure' or 'yeah good idea'? If yes, the question is a suggestion disguised as a question. Rewrite it to demand original thought from the user. Never use 'What if...' framing.\n\nDo NOT output the classification. Only output the single question.",
      messages: [{ role: "user", content: userMessage }],
    });

    const question =
      message.content[0]?.type === "text"
        ? message.content[0].text.trim()
        : "";

    if (!question) {
      throw new Error("Empty response");
    }

    return NextResponse.json({ question });
  } catch (err) {
    console.error("[generate-question] Error:", err);

    // Return a mode-appropriate fallback question
    let mode = "clarity";
    let qNum = 1;
    try {
      const body = await req.clone().json();
      mode = body.mode || "clarity";
      qNum = Math.min(Math.max(body.questionNumber || 1, 1), 2);
    } catch {
      // use defaults
    }
    const validModes = ["clarity", "expansion", "decision", "expression"];
    const safeMode = validModes.includes(mode) ? mode : "clarity";
    const fallbacks = FALLBACK_QUESTIONS[safeMode] || FALLBACK_QUESTIONS.clarity;
    const fallback = fallbacks[qNum - 1] || fallbacks[0];

    return NextResponse.json({ question: fallback, fallback: true });
  }
}
