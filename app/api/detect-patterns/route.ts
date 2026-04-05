import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `CRITICAL: Always write in second person (you/your/you're). NEVER use they/their/they're.

You are analyzing someone's raw thinking for patterns they can't see themselves. You have all their answers across multiple thinking dimensions.

Look for these specific patterns:

1. CONTRADICTION: They said opposite things in different answers. Quote both.
2. HEDGING: They're burying what they believe under qualifiers (maybe, possibly, might, could, kind of, sort of).
3. SCOPE CREEP: They started with one question but their answers have drifted to a bigger/different problem.
4. TWO AUDIENCES: They keep saying "they" or "users" but are describing two different groups of people without realizing it.
5. CIRCULAR: They've said the same idea multiple times in different words without going deeper.
6. ASSUMPTION AS FACT: They stated something as true without evidence or testing.
7. SOLVING BEFORE DIAGNOSING: They jumped to solutions before understanding the actual problem.
8. ANCHORING: Every answer supports their first idea. They never explored an alternative.

CRITICAL: Only flag a pattern if it would genuinely change the user's conclusion or brief. Minor contradictions, small hedges, and slight inconsistencies are NORMAL in messy thinking — don't flag them.

Ask yourself before flagging: "Would a smart friend interrupt a conversation to point this out?" If the answer is "no, that's nitpicky," don't flag it.

Only flag patterns that are:
- A genuine contradiction that the user needs to resolve before they can move forward
- A major blind spot that undermines their entire reasoning
- An assumption so central that everything falls apart if it's wrong
- An avoidance so obvious that NOT mentioning it would be a disservice

Do NOT flag:
- Minor word choice inconsistencies
- Small hedges that are just natural speech
- Slight shifts in framing between dimensions (people naturally explore different angles)
- Anything that feels like correcting someone's grammar rather than improving their thinking

When you flag a pattern, write it in exactly this format:
1. Label: the pattern type (e.g. "Assumption", "Avoidance", "Binary thinking")
2. Behavior: one sentence naming what they're specifically doing. Starts with "you're..." or "you haven't..." or "you keep...". Under 15 words.
3. Question: one question that cracks it open. Under 10 words.

Examples:
- Label: "Assumption" | Behavior: "you're assuming they care about price." | Question: "What if it's trust?"
- Label: "Avoidance" | Behavior: "you haven't mentioned your co-founder once." | Question: "Why?"
- Label: "Binary thinking" | Behavior: "you framed this as hire or promote." | Question: "What's the third option?"
- Label: "Sunk cost" | Behavior: "you're defending the old positioning because you already shipped it." | Question: "Is it still right?"
- Label: "Projection" | Behavior: "you keep saying 'people want this.'" | Question: "Do you actually know that?"

Rules:
- Maximum ONE pattern per API call.
- If no pattern is genuinely important, return null. Returning null is the RIGHT answer most of the time.

Also determine which action would help resolve it:
- CLARIFY for contradictions, vagueness, assumptions
- EXPAND for single perspective, anchoring, comfort zone
- DECIDE for fence-sitting, binary thinking, unnamed tradeoffs
- EXPRESS for messy articulation, buried insights

Respond with ONLY a JSON object or the word null:
{"type":"pattern_type","label":"Pattern Name","behavior":"what they're doing","question":"the question","suggestedAction":"clarify|expand|decide|express"}`;

export async function POST(req: Request) {
  try {
    const { goal, allAnswers, dimensions, existingPatterns } = await req.json();
    if (!allAnswers) return NextResponse.json({ pattern: null });

    // Count total answers
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
      userMsg += `\n\nALREADY DETECTED (don't repeat these):\n${existingPatterns.map((p: { type: string; label: string }) => `${p.type}: ${p.label}`).join("\n")}`;
    }
    if (dimensions) {
      userMsg += `\n\nDIMENSIONS: ${dimensions}`;
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
    if (text === "null" || !text) return NextResponse.json({ pattern: null });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ pattern: null });

    const parsed = JSON.parse(match[0]);
    if (!parsed.label || !parsed.behavior) return NextResponse.json({ pattern: null });

    const validActions = ["clarify", "expand", "decide", "express"];
    return NextResponse.json({
      pattern: {
        type: parsed.type || "pattern",
        label: parsed.label,
        description: `${parsed.behavior} ${parsed.question || ""}`.trim(),
        behavior: parsed.behavior || "",
        question: parsed.question || "",
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
