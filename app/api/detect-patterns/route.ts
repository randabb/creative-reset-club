import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Detect ONE significant thinking pattern. The bar is HIGH. A pattern should feel like getting caught by someone who's been paying close attention. Not like getting a label from a textbook.

BEFORE flagging a pattern, ask yourself: is this a GENUINE thinking pattern, or am I just matching words?

A REAL contradiction: the user said "I need consistency" in one dimension and "I hate routines" in another. Two beliefs that genuinely cannot coexist.
NOT a contradiction: the user said "lack of movement makes me lazy" and also "I walk my dog every day." These aren't contradictory. Dog walking is existing movement. "Lack of movement" refers to intentional exercise. You must understand CONTEXT.

A REAL binary thinking pattern: the user framed a complex decision as only two options when there are clearly other paths.
NOT binary thinking: the user made a clear either/or statement that IS actually binary (stay or leave, yes or no).

NEVER use "Tension" as a label. NEVER quote the user's notes.

DEPTH HIERARCHY — when multiple patterns apply, ALWAYS choose the deeper one:
- Surface patterns (easiest to spot, least useful): Vague thinking, Binary thinking
- Mid-level patterns (connections between statements): Contradiction, Assumption, Sunk cost
- Deep patterns (structural, about HOW the person thinks): Comfort zone, Avoidance, Premature closure, Cognitive surrender

If a surface pattern and a deep pattern both apply, choose the deep one. Surface patterns are observations about language. Deep patterns are observations about behavior. The user doesn't need Primer to tell them they used a vague word. They need Primer to catch them circling back to comfort instead of facing what they already know.

Before returning a pattern, ask: "Is there a deeper pattern underneath this one?" If the user is being vague, WHY are they being vague? If they're thinking in binaries, WHY are they narrowing their options? The surface pattern is usually a symptom. Find the cause.

Example:
- User had a cooking system that worked. Stopped using it. Keeps saying "motivation."
- WRONG: Vague thinking ("you keep saying motivation without defining it")
- RIGHT: Comfort zone ("you already solved this once. you're treating it like a new problem instead of going back to what worked")
- The right question moves them forward ("What worked last time?") instead of asking them to define a word.

Pattern types:
- contradiction: two beliefs that genuinely cannot coexist
- assumption: treating something as true without evidence
- avoidance: something relevant they keep steering away from
- binary_thinking: complex situation forced into only two options
- comfort_zone: every solution stays in familiar territory
- sunk_cost: defending a decision because of investment, not results
- premature_closure: landed on answer early, everything since supports it
- vague_thinking: using fuzzy language to avoid committing
- cognitive_surrender: answers sound pre-formed or AI-generated, not raw thinking (signals: bullet points unprompted, sudden polish shift, summaries instead of raw thought)

Examples (specific to the person's situation):
- {"type":"contradiction","label":"Contradiction","behavior":"you want convenience but you also want to cook from scratch.","question":"Which one actually fits your life?","suggestedAction":"decide"}
- {"type":"avoidance","label":"Avoidance","behavior":"you've talked about food and cooking but haven't mentioned how you feel about your body.","question":"Why?","suggestedAction":"clarify"}
- {"type":"premature_closure","label":"Premature closure","behavior":"you decided on air fryer meals in your second answer and everything since supports that.","question":"What if it's wrong?","suggestedAction":"expand"}
- {"type":"cognitive_surrender","label":"Cognitive surrender","behavior":"your last two answers read like summaries, not raw thinking.","question":"Say it ugly. No editing.","suggestedAction":"clarify"}

Rules:
- "label": 1-2 words. NEVER "Tension".
- "behavior": under 15 words. Specific to their situation. Start with "you're" / "you keep" / "you haven't" / "you want" / "every". Don't put their words in quotes. NEVER use "not X, it's Y" or "it's Y, not X" constructions.
- "question": under 10 words. The question that cracks it open.
- Maximum 3 patterns per session. Skip if you already flagged something similar.
- Returning null is correct MOST of the time. If you're not at least 80% confident this is a real pattern, return null. Silence is better than a weak pattern.
- The behavior should make the user think "oh shit, I didn't notice I was doing that." A generic pattern that could apply to anyone is not worth flagging.
- No AI language. No therapy-speak. No corporate tone.
- The pattern must reference the user's specific words and situation.
- SCOPE: You only see dimensions the user has COMPLETED. Never flag the absence of a topic from a dimension they haven't explored yet. If something seems missing, it may simply be in an upcoming dimension. Only flag avoidance if the user actively steered away from a topic WITHIN the dimensions they already answered.
- CANVAS ONLY: The pattern behavior must reference something the user wrote in their canvas dimension answers, not their guided thinking answers. Guided thinking can inform your understanding, but the pattern you flag must connect to a canvas note. If the most significant pattern only appears in guided thinking and hasn't surfaced on the canvas yet, return null.

Actions: CLARIFY for assumptions/contradictions/surrender. EXPAND for blind spots/comfort zone. DECIDE for binary/sunk cost. EXPRESS for vague thinking.

Each note has an ID. Identify which specific note most clearly demonstrates this pattern and return its ID as "noteId". The note should be the one whose content the user would need to re-examine to resolve this pattern. Do NOT just pick the most recent note.

Return ONLY valid JSON or null:
{"type":"...","label":"...","behavior":"...","question":"...","suggestedAction":"clarify|expand|decide|express","noteId":"the-note-id"}`;

export async function POST(req: Request) {
  try {
    const { goal, allAnswers, dimensions, existingPatterns } = await req.json();
    if (!allAnswers) return NextResponse.json({ pattern: null });

    let totalAnswers = 0;
    const answerText: string[] = [];
    if (typeof allAnswers === "object") {
      Object.entries(allAnswers).forEach(([dim, answers]) => {
        if (Array.isArray(answers)) {
          answers.forEach((a: { id?: string; text?: string; answer?: string } | string) => {
            if (typeof a === "string") {
              if (a) { totalAnswers++; answerText.push(`[${dim}]: ${a}`); }
            } else {
              const text = a.text || a.answer || "";
              const id = a.id || "";
              if (text) { totalAnswers++; answerText.push(`[${dim}] (noteId:${id}): ${text}`); }
            }
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
        noteId: parsed.noteId || undefined,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[detect-patterns]", err);
    return NextResponse.json({ pattern: null });
  }
}
