import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Look at this note text and determine which single action would help it most right now:
- clarify: vague, has assumptions, tangled ideas
- expand: clear but thin, obvious, needs new angles
- decide: contains a choice or tension
- express: good idea but poorly articulated

Respond with ONLY: {"action": "clarify|expand|decide|express", "reason": "one sentence using the user's words, under 20 words"}`;

export async function POST(req: Request) {
  try {
    const { noteText, goal, dimensionLabel } = await req.json();
    if (!noteText) return NextResponse.json({ action: "clarify", reason: "Start by cutting to the core of this." });

    let userMsg = `NOTE: ${noteText}`;
    if (goal) userMsg += `\nGOAL: ${goal}`;
    if (dimensionLabel) userMsg += `\nDIMENSION: ${dimensionLabel}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 80,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ action: "clarify", reason: "Start by cutting to the core of this." });

    const parsed = JSON.parse(match[0]);
    const valid = ["clarify", "expand", "decide", "express"];
    return NextResponse.json({
      action: valid.includes(parsed.action) ? parsed.action : "clarify",
      reason: parsed.reason || "Start by cutting to the core of this.",
    });
  } catch (err) {
    console.error("[suggest-action]", err);
    return NextResponse.json({ action: "clarify", reason: "Start by cutting to the core of this." });
  }
}
