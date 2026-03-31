import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ACTION_CONTEXT: Record<string, string> = {
  clarify: "Help them cut to the core. Draw invisibly from First Principles, Socratic method, Five Whys, MECE.",
  expand: "Help them stretch and find new angles. Draw invisibly from Lateral Thinking, SCAMPER, Six Thinking Hats, Analogical Thinking.",
  decide: "Help them evaluate and commit. Draw invisibly from Pre-Mortem, Inversion, Second-Order Thinking.",
  express: "Help them articulate clearly. Draw invisibly from Minto Pyramid, SCQA, Steelmanning.",
};

const FALLBACKS: Record<string, string[]> = {
  clarify: ["Write the single most important sentence from this note.", "Name what you'd cut if you could only keep one idea.", "Rewrite this as if explaining to someone with zero context."],
  expand: ["Write the opposite of this — what would that look like?", "Who outside your field would find this interesting, and why?", "What's the version of this that's ten times bigger?"],
  decide: ["Write what happens if you choose this and it fails.", "Name the one thing that would make you confident in this choice.", "What are you actually optimizing for here?"],
  express: ["Write this as one sentence someone could repeat back to you.", "What's the tension you're introducing that your audience doesn't expect?", "Say the uncomfortable version of this out loud."],
};

const SYSTEM = `You are the AI thinking coach inside Primer's canvas. When the user selects a note and an action, you generate 2-3 SPECIFIC THINKING INSTRUCTIONS that branch out from that note.

CRITICAL RULES:
1. Generate exactly 2-3 instructions. Each is a separate sticky note that branches off the selected note.
2. Each instruction tells the user WHAT TO WRITE in that note. They replace your instruction with their own thinking.
3. Reference the user's EXACT language from their goal and the selected note.
4. Keep each instruction under 20 words.
5. NEVER do the thinking for them. Give them a specific prompt to fill in.
6. NEVER name any framework.

Respond with ONLY the instructions, one per line, nothing else.`;

export async function POST(req: Request) {
  try {
    const { action, goal, selectedNoteText, allNotesText } = await req.json();
    if (!selectedNoteText || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const ctx = ACTION_CONTEXT[action] || ACTION_CONTEXT.clarify;
    const userMsg = `ACTION: ${action.toUpperCase()}\n${ctx}\n\nUSER'S GOAL:\n${goal || "Not specified"}\n\nSELECTED NOTE:\n${selectedNoteText}\n\nALL NOTES ON CANVAS:\n${allNotesText || selectedNoteText}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const instructions = text.split("\n").map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter((l: string) => l.length > 0).slice(0, 3);

    if (instructions.length === 0) throw new Error("Empty");

    return NextResponse.json({ instructions });
  } catch (err) {
    console.error("[canvas-coach]", err);
    const body = await req.clone().json().catch(() => ({}));
    const action = body.action || "clarify";
    const fb = FALLBACKS[action] || FALLBACKS.clarify;
    return NextResponse.json({ instructions: fb, fallback: true });
  }
}
