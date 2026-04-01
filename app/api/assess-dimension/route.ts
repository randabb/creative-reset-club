import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are assessing whether a thinking dimension has been sufficiently explored.

RULES:
- After 2 substantive responses (more than a few words each), the dimension is READY TO MOVE. Don't ask for more.
- After 3 responses of ANY kind, ALWAYS return ready_to_move. No exceptions.
- The goal is BREADTH across dimensions, not infinite depth in one. The user has 4-5 dimensions to explore.
- "keep_going" should ONLY be returned if the user has written 0-1 responses in this dimension.
- Be biased toward moving forward. Progress feels good. Getting stuck feels bad.

Also analyze the LAST note the user just wrote and determine which action would help it most:
- clarify: vague, untested assumptions, tangled ideas
- expand: clear but thin, needs new angles
- decide: contains a choice or tension
- express: good idea but poorly articulated

Respond with ONLY a JSON object:
{"status": "keep_going" | "ready_to_move", "reason": "one sentence", "next_action": "clarify" | "expand" | "decide" | "express", "next_action_reason": "short reason using the user's words, under 20 words"}`;

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
