import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Detect ONE significant thinking pattern in the user's notes. Only flag if it's genuinely important.

Pattern types: assumption, avoidance, blind_spot, vague_thinking, binary_thinking, confirmation_bias, projection, identity_protective, moving_goalposts, sunk_cost, emotional_reasoning, premature_closure, false_consensus, catastrophizing, authority_anchoring, scope_deflection, reverse_rationalization, comfort_zone, proxy_problem, contradiction

FORMAT RULES — FOLLOW EXACTLY:
- "label": 1-2 word name like "Assumption" or "Binary thinking" — NEVER use "Tension" or "Tension spotted"
- "behavior": what they're DOING, not what they SAID. NEVER quote their notes. Under 15 words. Start with "you're..." or "you keep..." or "you haven't..."
- "question": one question under 10 words that cracks it open

GOOD:
{"label": "Assumption", "behavior": "you're assuming park availability is the only constraint.", "question": "What if it's actually schedules?"}
{"label": "Avoidance", "behavior": "you haven't considered what happens if it rains.", "question": "Then what?"}
{"label": "Comfort zone", "behavior": "every answer leads back to content strategy.", "question": "What about sales?"}
{"label": "Projection", "behavior": "you keep saying people want this.", "question": "Do you actually know that?"}

BAD — NEVER DO THIS:
{"label": "Tension", "behavior": "you said 'none' and also 'any conflict with holidays'", ...}
{"label": "Tension spotted", ...}
Any behavior that quotes the user's actual words in quotation marks.

NEVER quote the user's words in the behavior field. Name the behavior pattern, don't repeat their words.

Only flag if a smart friend would interrupt to point it out. Minor inconsistencies are normal — don't flag them. Returning null is the RIGHT answer most of the time.

Also pick which action resolves it:
- CLARIFY for assumptions, vagueness, contradictions
- EXPAND for blind spots, comfort zone, confirmation bias
- DECIDE for binary thinking, fence-sitting, sunk cost
- EXPRESS for vague thinking, premature closure

Return ONLY valid JSON or the word null:
{"type":"pattern_type","label":"Short Name","behavior":"what they're doing","question":"question under 10 words","suggestedAction":"clarify|expand|decide|express"}`;

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
