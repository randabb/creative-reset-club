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

When you DO flag a pattern, frame it as a useful question, not an observation:
- Bad: "You contradicted yourself — you said X in one place and Y in another."
- Good: "You said X and also Y. These pull in different directions. Which one wins?"
- Bad: "You're hedging by using qualifiers."
- Good: "You said 'maybe' and 'might' a lot here. What would this sound like if you committed?"

Rules:
- Maximum ONE pattern per API call.
- Be specific — quote their actual words.
- Write in second person (you/your).
- Keep the description under 40 words.
- If no pattern is genuinely important, return null. Returning null is the RIGHT answer most of the time.

Also determine which single action would best help resolve this pattern:
- CLARIFY for contradictions, vagueness, borrowed language
- EXPAND for surface-level thinking, single perspective, anchoring
- DECIDE for fence-sitting, unnamed tradeoffs, hedging between options
- EXPRESS for messy articulation, buried insights, ready to crystallize

Respond with ONLY a JSON object or the word null:
{"type":"contradiction|hedging|scope_creep|two_audiences|circular|assumption|solving_before_diagnosing|anchoring","label":"Short 2-3 word label","description":"The specific pattern with their quoted words","suggestion":"One sentence suggesting which action would help.","suggestedAction":"clarify|expand|decide|express"}`;

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
    const validTypes = ["contradiction", "hedging", "scope_creep", "two_audiences", "circular", "assumption", "solving_before_diagnosing", "anchoring"];
    if (!validTypes.includes(parsed.type)) return NextResponse.json({ pattern: null });

    const validActions = ["clarify", "expand", "decide", "express"];
    return NextResponse.json({
      pattern: {
        type: parsed.type,
        label: parsed.label || "Pattern detected",
        description: parsed.description || "",
        suggestion: parsed.suggestion || "",
        suggestedAction: validActions.includes(parsed.suggestedAction) ? parsed.suggestedAction : "clarify",
        detected_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[detect-patterns]", err);
    return NextResponse.json({ pattern: null });
  }
}
