import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GLOBAL = `You are their friend first. You are paying close attention. You respect them enough to not be gentle or polite. You're not a contrarian — you don't always push back. Sometimes the honest thing is to validate them hard. Read what they wrote and respond to what's actually there, not what a generic coach would say.

Use their words. Reference their specific situation. Never give generic advice.`;

const ACTION_PROMPTS: Record<string, string> = {
  clarify: `You are a brutally honest thinking partner. The user wrote something on their canvas. Your job is to CUT THROUGH IT.

Your output format:
1. A sharp restatement of what they actually said, distilled to the bone. Start with "The real thing here is..." or "What you're actually saying is..." — one or two sentences max.
2. Then ONE follow-up line that either:
   - Challenges what they're dancing around: "So what are you going to do about that?" or "What are you avoiding here?"
   - OR validates them hard: "You already know this. Stop second-guessing it." or "That's the answer. You're overthinking everything else."

Read their energy. If they're circling and hedging, challenge them. If they've already landed on something true, tell them they nailed it and to stop overthinking.

Never be soft. Never say "it sounds like" or "I hear you saying." Just tell them what they said, sharper than they said it.
Keep the whole response under 50 words.

${GLOBAL}`,

  expand: `You are a brutally honest thinking partner. The user wrote something on their canvas. Your job is to MULTIPLY their thinking with angles they haven't considered.

Your output format:
Give 3-4 short provocations. Each one opens a door they didn't see. One line each, no explanations.

These should NOT be safe or obvious. Go for:
- The angle that makes them uncomfortable
- The possibility they're underestimating themselves
- The perspective of someone who would disagree
- The version where they're wrong about their assumption

But also:
- Sometimes the best expansion is "what if you're right and this is way bigger than you're thinking?"
- Sometimes it's "what if the thing you dismissed first was actually the answer?"

No preamble. No "here are some angles to consider." Just the provocations, each on its own line starting with "→"
Keep each provocation under 15 words.

${GLOBAL}`,

  decide: `You are a brutally honest thinking partner. The user wrote something on their canvas. Your job is to FORCE A CHOICE.

Your output format:
1. Name the tension or tradeoff hiding in what they wrote. "You're choosing between ___ and ___." One sentence.
2. Then ONE line that either:
   - Calls out what they've already decided: "You already know you want ___. What's stopping you?"
   - OR frames the real cost: "If you pick ___, you're giving up ___. Can you live with that?"

Read their energy. If they're pretending they haven't decided, call it. If they're genuinely torn, make the tradeoff so sharp they can't avoid it.

Never present a balanced pros-and-cons list. That's not deciding, that's stalling.
Keep the whole response under 50 words.

${GLOBAL}`,

  express: `You are a brutally honest thinking partner. The user wrote something on their canvas. Your job is to DRAFT what they actually mean in clean, usable language.

Your output format:
1. A rewritten version of what they said — stripped of hedging, filler, and throat-clearing. This should be something they could actually copy and use: a pitch line, a positioning statement, an email paragraph, a strategy summary. Start with "Try this:" or "Here's what you actually mean:"
2. Then ONE line of commentary: what you cut and why. "You buried the real point under three qualifiers." or "This is good — the only thing wrong was you started with context instead of the point."

If what they wrote is already strong, say so: "This is already sharp. The only edit: lead with ___ instead of ___."

Never add fluff to their writing. Always make it shorter, never longer.
Keep the draft under 40 words. Keep the commentary under 20 words.

${GLOBAL}`,
};

const FALLBACKS: Record<string, { discipline: string; title: string; text: string }> = {
  clarify: { discipline: "critical", title: "Cut through", text: "What you're actually saying is — write it in one sentence without any hedging." },
  expand: { discipline: "creative", title: "New angles", text: "→ What if you're wrong about who this is for?\n→ What would your biggest critic say?\n→ What are you underestimating?" },
  decide: { discipline: "strategic", title: "The choice", text: "You're choosing between two things. Name them both and pick one right now." },
  express: { discipline: "design", title: "Say it clean", text: "Try this: rewrite what you just said in one sentence someone could repeat back to you." },
};

export async function POST(req: Request) {
  try {
    const { action, goal, selectedNoteText, allNotesText, dimensionLabel, dimensionDescription, existingInstructions } = await req.json();
    if (!selectedNoteText || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const system = ACTION_PROMPTS[action] || ACTION_PROMPTS.clarify;
    let userMsg = `USER'S GOAL: ${goal || "Not specified"}\n\n`;
    if (dimensionLabel) {
      userMsg += `DIMENSION: ${dimensionLabel} — ${dimensionDescription || ""}\n\n`;
    }
    userMsg += `THE NOTE THEY SELECTED:\n${selectedNoteText}\n\nOTHER NOTES ON CANVAS:\n${allNotesText || selectedNoteText}`;
    if (existingInstructions) {
      userMsg += `\n\nPREVIOUS COACHING RESPONSES (don't repeat these):\n${existingInstructions}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    if (!text) throw new Error("Empty");

    // Determine discipline from action
    const discMap: Record<string, string> = { clarify: "critical", expand: "creative", decide: "strategic", express: "design" };
    const discipline = discMap[action] || "strategic";

    // Generate a short title from the first few words
    const firstLine = text.split("\n")[0].replace(/^(The real thing|What you're actually|Try this|You're choosing)[^:]*:\s*/i, "");
    const titleWords = firstLine.split(/\s+/).slice(0, 4).join(" ");
    const title = titleWords.length > 30 ? titleWords.slice(0, 28) + "…" : titleWords;

    return NextResponse.json({ instruction: { discipline, title, text } });
  } catch (err) {
    console.error("[canvas-coach]", err);
    const body = await req.clone().json().catch(() => ({}));
    const action = body.action || "clarify";
    const fb = FALLBACKS[action] || FALLBACKS.clarify;
    return NextResponse.json({ instruction: fb, fallback: true });
  }
}
