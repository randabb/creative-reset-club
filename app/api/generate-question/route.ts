import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  GUIDED_THINKING_SYSTEM_PROMPT,
  FALLBACK_QUESTIONS,
} from "@/lib/prompts/guided-thinking";
import { INTELLECTUAL_LAYER } from "@/lib/prompts/intellectual-layer";
import { STATE_DETECTION_LAYER } from "@/lib/prompts";
import { logStateDetection, type StateDetectionLog } from "@/lib/log-state-detection";

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
    const { mode, capture, previousQAs, questionNumber, arcContext, followupContext } =
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

    if (followupContext) {
      userMessage += `\nIMPORTANT: This is a FOLLOW-UP session. The user already completed a full thinking session on this topic. Here is what they already said and concluded:\n\nOriginal goal: ${followupContext.originalGoal || ""}\nTheir synthesis/brief: ${followupContext.originalSynthesis || ""}\n\nDO NOT ask about anything they already covered. They've already done that thinking. Your questions should go to the NEW territory — the emotional resistance, the fear, the practical blockers, the thing that's stopping them from acting on what they already know.\n\nBad question: "What debts are you carrying?" (they already told you)\nGood question: "You know exactly what the debts are. What's the first one you keep avoiding?"\n\nThe user should feel like Primer remembers everything from last session and is now going deeper, not starting over.\n`;
    }

    userMessage += `\nGenerate question ${qNum} for ${safeMode} mode.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: GUIDED_THINKING_SYSTEM_PROMPT + "\n\n--- INTELLECTUAL LAYER ---\n\n" + INTELLECTUAL_LAYER + "\n\n--- STATE DETECTION ---\n\n" + STATE_DETECTION_LAYER + "\n\nADDITIONAL INSTRUCTION: Before generating each question, silently classify:\n- SITUATION TYPE (strategy, product, people, career, communication, operations, creative, financial, complexity)\n- THINKING CHALLENGE (assumption blindness, option paralysis, idea thinness, articulation gap, complexity overwhelm, fear of commitment, pattern blindness, stakeholder misalignment)\nThen run state detection. Then select the framework indicated by the detected state (or the 2-3 most relevant from the intellectual layer if no state matched) and generate the question.\n\nFINAL CHECK: After generating a question, check: can the user answer this with 'sure' or 'yeah good idea'? If yes, the question is a suggestion disguised as a question. Rewrite it to demand original thought from the user. Never use 'What if...' framing.\n\nRespond with ONLY a JSON object:\n{\"question\":\"your question here\",\"stateDetection\":{\"detected_state\":\"...\",\"detection_signals\":[\"...\"],\"framework_applied\":\"...\",\"confidence\":\"high|medium|low\"}}",
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    // Try to parse as JSON for state detection logging
    let question = rawText;
    let stateDetection: StateDetectionLog | null = null;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.question) question = parsed.question;
        if (parsed.stateDetection) stateDetection = parsed.stateDetection;
      }
    } catch { /* response was plain text, use as-is */ }

    if (!question) throw new Error("Empty response");

    // Log state detection to Supabase (silent, non-blocking)
    const sessionId = (await req.clone().json().catch(() => ({}))).sessionId;
    logStateDetection(sessionId, "generate-question", stateDetection);

    return NextResponse.json({ question: question.replace(/^["']|["']$/g, "") });
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
