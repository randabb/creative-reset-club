import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `CRITICAL: Write in second person (you/your).

The user just wrote on their thinking canvas. Read what they wrote and decide: does this note need further thinking, or is it sharp enough to stand on its own?

If it DOES need further thinking, pick exactly ONE action:

Suggest CLARIFY when:
- The note is vague — uses words like "stuff", "things", "it" without defining them
- Multiple ideas are crammed together that need separating
- It contradicts something they said earlier
- They're using borrowed language instead of their own words

Suggest EXPAND when:
- The answer is too surface-level — they answered but didn't go deep
- They landed on the first obvious answer without exploring alternatives
- It's a single perspective and there's clearly another angle

Suggest DECIDE when:
- The note contains "or", "but", "on the other hand" — they're on a fence
- They listed options without choosing
- They expressed a preference but hedged it

Suggest EXPRESS when:
- The thinking is good but messy and unstructured
- They've gone deep enough to articulate something clean now
- Something sharp is buried in rambling that needs extracting

Suggest NOTHING when:
- The note is already sharp and clear
- It's short and punchy — doesn't need more
- They're still early — let them dump before pushing

Respond with ONLY a JSON object:
{"suggest":true,"action":"clarify|expand|decide|express","reason":"one sentence"}
or
{"suggest":false,"action":null,"reason":null}`;

export async function POST(req: Request) {
  try {
    const { goal, noteText, dimensionLabel } = await req.json();
    if (!noteText || noteText.length < 10) return NextResponse.json({ suggest: false, action: null, reason: null });

    let userMsg = `GOAL: ${goal || ""}\nDIMENSION: ${dimensionLabel || ""}\n\nNOTE:\n${noteText}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 60,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ suggest: false, action: null, reason: null });

    const parsed = JSON.parse(match[0]);
    const valid = ["clarify", "expand", "decide", "express"];
    if (parsed.suggest && valid.includes(parsed.action)) {
      return NextResponse.json({ suggest: true, action: parsed.action, reason: parsed.reason || "" });
    }
    return NextResponse.json({ suggest: false, action: null, reason: null });
  } catch (err) {
    console.error("[suggest-note-action]", err);
    return NextResponse.json({ suggest: false, action: null, reason: null });
  }
}
