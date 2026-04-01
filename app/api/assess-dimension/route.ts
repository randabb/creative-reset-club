import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are assessing whether a thinking dimension has been sufficiently explored.

Look at the user's goal, the current dimension, and all the notes written under this dimension. Determine:
1. Has the user explored this dimension with enough depth? (at least 2 substantive notes that go beyond surface level)
2. Is there an obvious gap in this dimension that needs one more prompt?

Also analyze the LAST note the user just wrote and determine which action would help it most:
- clarify: if it's vague, has untested assumptions, or multiple ideas tangled together
- expand: if it's clear but thin, obvious, or has unexplored angles
- decide: if it contains a choice, tradeoff, or unresolved tension
- express: if it has a good idea but needs better articulation or structure

Respond with ONLY a JSON object:
{"status": "keep_going" | "ready_to_move", "reason": "one sentence", "next_action": "clarify" | "expand" | "decide" | "express", "next_action_reason": "short reason using the user's exact words, under 20 words"}

"keep_going" means: suggest another prompt in this dimension
"ready_to_move" means: this dimension is well explored, nudge to the next one

Be honest. If they've only written surface-level notes, say keep_going. If they've genuinely developed the thinking with 2-3 substantive notes, say ready_to_move.`;

export async function POST(req: Request) {
  try {
    const { goal, currentDimension, dimensionNotes, allDimensions, mode, lastNote } = await req.json();

    let userMsg = `GOAL: ${goal || "Not specified"}\nMODE: ${mode || "clarity"}\n\nCURRENT DIMENSION: ${currentDimension || "General"}\n\nNOTES UNDER THIS DIMENSION:\n${dimensionNotes || "None yet"}\n\nALL DIMENSIONS:\n${allDimensions || "None"}`;
    if (lastNote) userMsg += `\n\nLAST NOTE WRITTEN:\n${lastNote}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ status: "keep_going", reason: "Continue developing this dimension.", next_action: "clarify", next_action_reason: "Go deeper on what you just wrote." });

    const parsed = JSON.parse(match[0]);
    const valid = ["clarify", "expand", "decide", "express"];
    return NextResponse.json({
      status: parsed.status === "ready_to_move" ? "ready_to_move" : "keep_going",
      reason: parsed.reason || "",
      next_action: valid.includes(parsed.next_action) ? parsed.next_action : "clarify",
      next_action_reason: parsed.next_action_reason || "Go deeper on what you just wrote.",
    });
  } catch (err) {
    console.error("[assess-dimension]", err);
    return NextResponse.json({ status: "keep_going", reason: "Continue developing this dimension.", next_action: "clarify", next_action_reason: "Go deeper on what you just wrote." });
  }
}
