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

Rules:
- Only flag a pattern if you're confident it's real. Don't force it.
- Maximum ONE pattern per API call. Don't overwhelm.
- Be specific — quote their actual words from two different answers.
- Write in second person (you/your).
- The tone is a friend who noticed something, not a teacher correcting you. Direct but warm.
- Keep the pattern description under 40 words.
- If no pattern is detected, return null.

Respond with ONLY a JSON object or the word null:
{"type":"contradiction|hedging|scope_creep|two_audiences|circular|assumption|solving_before_diagnosing|anchoring","label":"Short 2-3 word label","description":"The specific pattern with their quoted words","suggestion":"One sentence suggesting which action would help."}`;

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

    return NextResponse.json({
      pattern: {
        type: parsed.type,
        label: parsed.label || "Pattern detected",
        description: parsed.description || "",
        suggestion: parsed.suggestion || "",
        detected_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[detect-patterns]", err);
    return NextResponse.json({ pattern: null });
  }
}
