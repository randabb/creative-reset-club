import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { INTELLECTUAL_LAYER } from "@/lib/prompts/intellectual-layer";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ACTION_CONTEXT: Record<string, string> = {
  clarify: "Help them cut to the core. Draw invisibly from First Principles, Socratic method, Five Whys, MECE.",
  expand: "Help them stretch and find new angles. Draw invisibly from Lateral Thinking, SCAMPER, Six Thinking Hats, Analogical Thinking.",
  decide: "Help them evaluate and commit. Draw invisibly from Pre-Mortem, Inversion, Second-Order Thinking.",
  express: "Help them articulate clearly. Draw invisibly from Minto Pyramid, SCQA, Steelmanning.",
};

const FALLBACKS: Record<string, { title: string; text: string }> = {
  clarify: { title: "The essential sentence", text: "Write the single most important sentence from this note." },
  expand: { title: "The opposite", text: "Write the opposite of this — what would that look like?" },
  decide: { title: "The failure scenario", text: "Write what happens if you choose this and it fails." },
  express: { title: "One repeatable sentence", text: "Write this as one sentence someone could repeat back to you." },
};

const SYSTEM = `You are the AI thinking coach inside Primer's canvas. When the user selects a note and an action, generate ONE specific thinking instruction.

RULES:
1. ONE instruction only. Nothing else.
2. This instruction tells the user WHAT TO WRITE in a response note. They will replace your instruction with their own thinking.
3. Reference the user's EXACT language from their goal, the dimension, and the selected note.
4. Keep the instruction under 25 words. Be specific, not generic.
5. NEVER do the thinking for them.
6. NEVER name any framework.
7. NEVER ask "What if..." questions. They are suggestions, not thinking prompts.
8. Consider what has ALREADY been written on the canvas. Don't repeat ground that's been covered.
9. Pick the single most important thing this person needs to think about RIGHT NOW for this dimension.
10. NEVER repeat an instruction that has already been given. Each instruction must explore a genuinely different angle. Check the list of existing instructions and make sure yours is distinct.

Also generate a short response title (2-5 words) that names what the user will write.

FORMAT — respond with ONLY one line:
TITLE: Your actual title here | INSTRUCTION: Your actual instruction here
Do NOT include placeholder text. Write real, specific content.`;

export async function POST(req: Request) {
  try {
    const { action, goal, selectedNoteText, allNotesText, dimensionLabel, dimensionDescription, existingInstructions } = await req.json();
    if (!selectedNoteText || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const ctx = ACTION_CONTEXT[action] || ACTION_CONTEXT.clarify;
    let userMsg = `ACTION: ${action.toUpperCase()}\n${ctx}\n\nUSER'S GOAL:\n${goal || "Not specified"}\n\n`;
    if (dimensionLabel) {
      userMsg += `CURRENT DIMENSION: ${dimensionLabel} — ${dimensionDescription || ""}\n\nKeep the instruction anchored to this specific dimension.\n\n`;
    }
    userMsg += `SELECTED NOTE:\n${selectedNoteText}\n\nNOTES ALREADY ON CANVAS:\n${allNotesText || selectedNoteText}`;
    if (existingInstructions) {
      userMsg += `\n\nINSTRUCTIONS ALREADY GIVEN (do NOT repeat any of these):\n${existingInstructions}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: SYSTEM + "\n\n--- INTELLECTUAL LAYER ---\n\n" + INTELLECTUAL_LAYER + "\n\nUse the intellectual layer to generate a more specific, framework-grounded thinking instruction.",
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const line = text.split("\n").map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim()).find((l: string) => l.length > 0);

    if (!line) throw new Error("Empty");

    // Clean title: keep only part before colon, max 5 words
    const cleanTitle = (t: string) => {
      let s = t.includes(":") ? t.split(":")[0].trim() : t;
      const words = s.split(/\s+/);
      if (words.length > 5) s = words.slice(0, 4).join(" ");
      return s;
    };

    // Parse the single line
    const clean = line.replace(/[`*_]/g, "").trim();
    let instruction: { title: string; text: string };

    if (clean.includes(" | ")) {
      const parts = clean.split(" | ");
      const title = parts[0].replace(/^TITLE:\s*/i, "").trim();
      const inst = parts.slice(1).join(" | ").replace(/^INSTRUCTION:\s*/i, "").trim();
      instruction = title && inst ? { title: cleanTitle(title), text: inst } : { title: cleanTitle(clean.slice(0, 30)), text: clean };
    } else if (clean.includes("|")) {
      const parts = clean.split("|");
      const title = parts[0].replace(/^TITLE:\s*/i, "").trim();
      const inst = parts.slice(1).join("|").trim();
      instruction = title && inst ? { title: cleanTitle(title), text: inst } : { title: cleanTitle(clean.slice(0, 30)), text: clean };
    } else {
      const stripped = clean.replace(/^TITLE:\s*/i, "").replace(/^INSTRUCTION:\s*/i, "");
      const words = stripped.split(/\s+/);
      instruction = { title: words.slice(0, 4).join(" "), text: stripped };
    }

    return NextResponse.json({ instruction });
  } catch (err) {
    console.error("[canvas-coach]", err);
    const body = await req.clone().json().catch(() => ({}));
    const action = body.action || "clarify";
    const fb = FALLBACKS[action] || FALLBACKS.clarify;
    return NextResponse.json({ instruction: fb, fallback: true });
  }
}
