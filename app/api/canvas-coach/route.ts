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

const FALLBACKS: Record<string, { discipline: string; title: string; text: string }> = {
  clarify: { discipline: "critical", title: "The essential sentence", text: "Write the single most important sentence from this note." },
  expand: { discipline: "creative", title: "The opposite", text: "Write the opposite of this — what would that look like?" },
  decide: { discipline: "strategic", title: "The failure scenario", text: "Write what happens if you choose this and it fails." },
  express: { discipline: "design", title: "One repeatable sentence", text: "Write this as one sentence someone could repeat back to you." },
};

const SYSTEM = `You are the AI thinking coach inside Primer's canvas. When the user selects a note and an action, generate ONE specific thinking instruction.

RULES:
1. ONE instruction only. Nothing else.
2. This instruction tells the user WHAT TO WRITE in a response note. They will replace your instruction with their own thinking.
3. Reference the user's EXACT language from their goal, the dimension, and the selected note.
4. NEVER do the thinking for them.
5. NEVER name any framework.
6. NEVER ask "What if..." questions. They are suggestions, not thinking prompts.
7. Consider what has ALREADY been written on the canvas. Don't repeat ground that's been covered.
8. Pick the single most important thing this person needs to think about RIGHT NOW for this dimension.
9. NEVER repeat an instruction that has already been given. Each instruction must explore a genuinely different angle.

LANGUAGE RULES FOR INSTRUCTIONS:
- Write like a sharp friend asking you a question at a coffee shop, not a consultant writing a deliverable
- Use short, everyday words. No jargon. No formal phrasing.
- Under 20 words. Ideally under 15.
- Start with a verb: "Write...", "Name...", "List...", "Describe...", "Pick..."
- NEVER use phrases like "the exact moment when", "the specific difference between", "the triggering moment", "the counterintuitive insight"
- NEVER use compound constructions with dashes like "what task were they trying to accomplish - what stage they're at"
- ONE simple ask per instruction. Not two things connected by a dash or comma.

BAD instructions (too formal, too long, too compound):
- "Write about the exact moment when founders realize they're wasting time going back and forth with AI"
- "Describe the specific difference between a Claude plan created from a lazy prompt vs your fuller context"
- "List the triggering moment when someone moves from accepting current AI limitations to seeking a better approach"

GOOD instructions (simple, direct, still deep):
- "When do founders first realize AI isn't getting them?"
- "What's the difference between a lazy AI prompt and a primed one?"
- "Name one person who'd pay for this tomorrow. Why them?"
- "What do people do right before they give up on an AI conversation?"
- "Write the sentence that would make someone stop scrolling."

Your instructions must be grounded in expert thinking frameworks (first principles, systems thinking, strategic thinking, design thinking, creative thinking) — but the PHRASING must be short, conversational, and simple.

Good: "Who's already frustrated with how things work there?"
Bad: "What would have to be true about their internal politics for this to get approved without a champion?"

Both come from stakeholder mapping. One sounds human, the other sounds like a textbook.

The sophistication comes from WHAT you ask, not HOW you phrase it. Under 15 words. One idea per instruction. Use "you" and "they" not abstract language. No framework names, no jargon.

The instruction must be a specific prompt that tells the user what to WRITE. It should start with a verb. If your instruction is under 8 words or doesn't tell the user what to produce, it's not specific enough. Rewrite it.

TITLE RULES:
- Response titles should be 2-4 words. Conversational. Like a label you'd scribble on a sticky note.
- BAD titles: "SPECIFIC FRUSTRATION MOMENTS", "YOUR THINKING DEPTH GAP", "CONTEXT CONTAMINATION ANALYSIS"
- GOOD titles: "The frustration", "When it breaks", "Their first reaction", "The real competitor", "Why they'd pay"

Also classify which thinking discipline this instruction draws from:
- design: empathy, reframing, user perspective, walking in someone else's shoes
- systems: connections, feedback loops, dependencies, seeing the whole picture
- strategic: tradeoffs, positioning, first principles, where to focus and why
- critical: testing assumptions, evidence, logic, opposing arguments
- creative: new combinations, breaking patterns, divergent ideas, unexpected angles

FINAL CHECK: Your instruction MUST be a complete sentence that starts with a verb and tells the user exactly what to write. Examples of GOOD instructions: 'Name three founders who would pay for this tomorrow.' / 'Write what your user does the hour before they need your product.' / 'Describe the worst AI response your target user has ever gotten.' If your instruction is under 8 words or doesn't start with a verb, YOU HAVE FAILED. Rewrite it.

FORMAT — respond with ONLY one line:
DISCIPLINE: design|systems|strategic|critical|creative | TITLE: your title | INSTRUCTION: your instruction
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

    // Parse: DISCIPLINE: x | TITLE: y | INSTRUCTION: z
    const clean = line.replace(/[`*_]/g, "").trim();
    const validDisc = ["design", "systems", "strategic", "critical", "creative"];
    let discipline = "strategic";
    let title = "";
    let instText = "";

    const parts = clean.split("|").map(p => p.trim());
    for (const part of parts) {
      if (/^DISCIPLINE:\s*/i.test(part)) {
        const d = part.replace(/^DISCIPLINE:\s*/i, "").trim().toLowerCase();
        if (validDisc.includes(d)) discipline = d;
      } else if (/^TITLE:\s*/i.test(part)) {
        title = cleanTitle(part.replace(/^TITLE:\s*/i, "").trim());
      } else if (/^INSTRUCTION:\s*/i.test(part)) {
        instText = part.replace(/^INSTRUCTION:\s*/i, "").trim();
      } else if (!title) {
        title = cleanTitle(part);
      } else if (!instText) {
        instText = part;
      }
    }
    if (!title || !instText) {
      const stripped = clean.replace(/^(DISCIPLINE|TITLE|INSTRUCTION):\s*\S+\s*\|?\s*/gi, "");
      const words = stripped.split(/\s+/);
      if (!title) title = words.slice(0, 4).join(" ");
      if (!instText) instText = stripped;
    }

    // Validation: prevent discipline name leaking into title
    if (validDisc.includes(title.toLowerCase())) {
      title = instText.split(/\s+/).slice(0, 3).join(" ");
    }
    // Validation: if instruction is too short, it's probably the title leaking — swap
    if (instText.split(/\s+/).length < 5 && title.split(/\s+/).length >= 5) {
      const tmp = instText;
      instText = title;
      title = cleanTitle(tmp);
    }
    // Strip any discipline prefix that leaked into title or instruction
    for (const d of validDisc) {
      title = title.replace(new RegExp(`^${d}\\s*[-:]?\\s*`, "i"), "");
      instText = instText.replace(new RegExp(`^${d}\\s*[-:]?\\s*`, "i"), "");
    }

    return NextResponse.json({ instruction: { discipline, title: cleanTitle(title), text: instText } });
  } catch (err) {
    console.error("[canvas-coach]", err);
    const body = await req.clone().json().catch(() => ({}));
    const action = body.action || "clarify";
    const fb = FALLBACKS[action] || FALLBACKS.clarify;
    return NextResponse.json({ instruction: fb, fallback: true });
  }
}
