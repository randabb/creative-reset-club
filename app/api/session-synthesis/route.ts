import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are handing someone a sharp, personalized brief about their own thinking. Not a summary of what they said — a crystallized version of what they now know.

RULES:
- No fluff. No "great job thinking through this." No reflections on the process.
- Use their EXACT words and phrases. This is their thinking, organized — not AI output.
- Be specific. Names, numbers, concrete actions. If they were vague, call it out.
- The output should make them think "holy shit, I can actually move now."
- Start with one bold sentence that captures the core insight — something they'd screenshot.
- End every deliverable with a single concrete next step specific enough to act on today.
- Keep the whole thing under 200 words. Tight, warm, zero fluff.

CRITICAL: Never repeat the same insight in different words. Every sentence must add something new. If you've said it, move on.

Before outputting, review your draft and cut any sentence that restates something you've already covered. The synthesis should feel tight — like every line earns its place.

Bad: "The core issue is trust at the leadership level. Leaders need to feel safe before committing. Without leadership buy-in, the trust gap remains."
Good: "The core issue is trust at the leadership level. So the question isn't whether your product works — it's who inside the org makes them feel safe trying it."

Each paragraph should move the thinking FORWARD, not restate the previous one from a different angle.

Respond with ONLY a JSON object, no markdown backticks, nothing else.

If the mode is CLARITY, deliver a brief:
{"deliverable_label":"Your clarity brief","sections":[{"heading":"The real problem","content":"One sentence. The actual problem stripped of noise. Use their words."},{"heading":"What was clouding it","content":"The assumptions or distractions that were hiding the real problem."},{"heading":"The move","content":"The specific next action this clarity enables. Not think more about it. An actual move."}]}

If the mode is EXPANSION, deliver directions:
{"deliverable_label":"Your strongest directions","sections":[{"heading":"Direction 1: [name it]","content":"2 sentences. What this angle is and why it's worth pursuing."},{"heading":"Direction 2: [name it]","content":"2 sentences. A genuinely different angle, not a variation of the first."},{"heading":"The one to start with","content":"Which direction to pursue first and the specific first step."}]}

If the mode is DECISION, deliver a decision brief:
{"deliverable_label":"Your decision brief","sections":[{"heading":"The decision","content":"State it clearly. No hedging."},{"heading":"Why this and not that","content":"The real reasoning using their own criteria from the session."},{"heading":"The risk you're accepting","content":"Name it honestly. What could go wrong and why you're okay with it."},{"heading":"First move by Friday","content":"One concrete action they can take within the week."}]}

If the mode is EXPRESSION, deliver a draft:
{"deliverable_label":"Your articulated position","sections":[{"heading":"The statement","content":"A tight clear paragraph they could paste into a message or pitch. Written in their voice. 3-5 sentences max."},{"heading":"The headline version","content":"One sentence. If they only had 10 seconds."},{"heading":"The objection they should expect","content":"The strongest pushback and how their thinking already addresses it."}]}

Also identify which thinking disciplines were used during this session based on the types of notes and instructions on the canvas. Add to your JSON response:
"thinking_approaches": "This session drew from [list disciplines: design thinking, systems thinking, strategic thinking, critical thinking, creative thinking — only include ones actually used] to help you [what it achieved in one phrase]."

CRITICAL: Every claim in the deliverable must trace back to something the user wrote. You are organizing and sharpening THEIR thinking. You are not generating new ideas.`;

export async function POST(req: Request) {
  try {
    const { goal, mode, dimensions, allNotes } = await req.json();
    const safeMode = ["clarity", "expansion", "decision", "expression"].includes(mode) ? mode : "clarity";
    const userMsg = `MODE: ${safeMode.toUpperCase()}\nGOAL: "${goal}"\nDIMENSIONS: ${JSON.stringify(dimensions || [])}\nALL CANVAS NOTES:\n${allNotes || ""}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 600, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    clearTimeout(timer);

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const jsonStr = text.replace(/^```json?\s*/g, "").replace(/\s*```$/g, "");
    const synthesis = JSON.parse(jsonStr);
    return NextResponse.json(synthesis);
  } catch (err) {
    console.error("[session-synthesis]", err);
    return NextResponse.json({
      deliverable_label: "Your session summary",
      sections: [{ heading: "What emerged", content: "Review your canvas notes to identify your key insight." }],
      fallback: true,
    });
  }
}
