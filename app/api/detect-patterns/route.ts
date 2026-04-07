import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Detect ONE significant thinking pattern. Only flag if genuinely important. NEVER use "Tension" as a label. NEVER quote the user's notes.

The behavior field must be SPECIFIC to this person's situation — described in YOUR words. The reader should immediately think "wow that's exactly what I'm doing."

BAD (too vague — applies to anyone):
- "you're pulling in two directions."
- "you're making an assumption about your users."
- "you keep avoiding the hard question."

GOOD (specific — only applies to THIS person's thinking):
- {"type":"contradiction","label":"Contradiction","behavior":"you want convenience but you also want to cook from scratch.","question":"Which one actually fits your life?","suggestedAction":"decide"}
- {"type":"assumption","label":"Assumption","behavior":"you're assuming people binge because of laziness, not emotion.","question":"What if it's the opposite?","suggestedAction":"clarify"}
- {"type":"avoidance","label":"Avoidance","behavior":"you've talked about food and cooking but haven't mentioned how you feel about your body.","question":"Why?","suggestedAction":"clarify"}
- {"type":"binary_thinking","label":"Binary thinking","behavior":"you framed this as either discipline or giving up.","question":"What does the middle look like?","suggestedAction":"expand"}
- {"type":"comfort_zone","label":"Comfort zone","behavior":"every solution you've listed involves cooking.","question":"What if cooking isn't the answer?","suggestedAction":"expand"}
- {"type":"sunk_cost","label":"Sunk cost","behavior":"you keep returning to meal prep because you've tried it before, not because it worked.","question":"Has it?","suggestedAction":"clarify"}
- {"type":"premature_closure","label":"Premature closure","behavior":"you decided on air fryer meals in your second answer and everything since supports that.","question":"What if it's wrong?","suggestedAction":"expand"}
- {"type":"vague_thinking","label":"Vague thinking","behavior":"you said you want to allow other things to consume your mind.","question":"What things specifically?","suggestedAction":"clarify"}
- {"type":"cognitive_surrender","label":"Cognitive surrender","behavior":"your last two answers read like summaries, not raw thinking.","question":"Say it ugly. No editing.","suggestedAction":"clarify"}

Cognitive surrender signals: answers using bullet points or frameworks unprompted, language significantly more polished than their capture text, answers that sound like summaries rather than raw thinking, sudden shift from messy/honest tone to clean/corporate tone, answers covering multiple points neatly instead of pulling on one thread. suggestedAction is always "clarify".

Rules:
- "label": 1-2 words. NEVER "Tension".
- "behavior": specific to their situation. Under 20 words. Start with "you're" / "you keep" / "you haven't" / "you want" / "every". Don't put their words in quotes.
- "question": under 10 words. The question that cracks it open.
- Maximum 3 patterns per session. Skip if you already flagged something similar.
- Returning null is correct most of the time.

Actions: CLARIFY for assumptions/contradictions. EXPAND for blind spots/comfort zone. DECIDE for binary/sunk cost. EXPRESS for vague thinking.

Return ONLY valid JSON or null:
{"type":"...","label":"...","behavior":"...","question":"...","suggestedAction":"clarify|expand|decide|express"}`;

export async function POST(req: Request) {
  try {
    const { goal, allAnswers, dimensions, existingPatterns } = await req.json();
    if (!allAnswers) return NextResponse.json({ pattern: null });

    let totalAnswers = 0;
    const answerText: string[] = [];
    if (typeof allAnswers === "object") {
      Object.entries(allAnswers).forEach(([dim, answers]) => {
        if (Array.isArray(answers)) {
          answers.forEach((a: { answer?: string } | string) => {
            const text = typeof a === "string" ? a : a.answer || "";
            if (text) { totalAnswers++; answerText.push(`[${dim}]: ${text}`); }
          });
        }
      });
    }

    if (totalAnswers < 3) return NextResponse.json({ pattern: null });

    let userMsg = `GOAL: ${goal || "Not specified"}\n\nALL ANSWERS:\n${answerText.join("\n\n")}`;
    if (existingPatterns?.length) {
      userMsg += `\n\nALREADY DETECTED (don't repeat):\n${existingPatterns.map((p: { type: string; label: string }) => `${p.type}: ${p.label}`).join("\n")}`;
    }
    if (dimensions) userMsg += `\n\nDIMENSIONS: ${dimensions}`;

    console.log("NEW PATTERN PROMPT IS ACTIVE");
    console.log("[detect-patterns] goal:", goal?.slice(0, 50), "answers:", totalAnswers);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    console.log("[detect-patterns] Raw response:", text);

    if (text === "null" || !text) return NextResponse.json({ pattern: null });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ pattern: null });

    const parsed = JSON.parse(match[0]);
    if (!parsed.label || !parsed.behavior) return NextResponse.json({ pattern: null });

    // Reject if it still uses "Tension" label
    if (parsed.label.toLowerCase().includes("tension")) return NextResponse.json({ pattern: null });

    const validActions = ["clarify", "expand", "decide", "express"];
    return NextResponse.json({
      pattern: {
        type: parsed.type || "pattern",
        label: parsed.label,
        behavior: parsed.behavior,
        question: parsed.question || "",
        description: `${parsed.behavior} ${parsed.question || ""}`.trim(),
        suggestion: `${parsed.behavior} ${parsed.question || ""}`.trim(),
        suggestedAction: validActions.includes(parsed.suggestedAction) ? parsed.suggestedAction : "clarify",
        detected_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[detect-patterns]", err);
    return NextResponse.json({ pattern: null });
  }
}
