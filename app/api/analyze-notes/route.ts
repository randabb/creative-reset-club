import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are analyzing a canvas of thinking notes. For each note, determine which thinking action would help it most right now:
- clarify: the note is vague, messy, has multiple ideas tangled together, or has untested assumptions
- expand: the note is clear but thin, obvious, or has unexplored angles
- decide: the note contains a choice, tradeoff, or unresolved tension
- express: the note has a good idea but it's poorly articulated or unstructured

Analyze EVERY note provided. Each note needs exactly one suggestion. Assign the action that would help it most right now. Every note in the input must appear in the output.

Respond with ONLY a JSON array, one entry per note:
[{"id":"note-id","action":"clarify"},{"id":"note-id","action":"expand"}]`;

interface NoteInput {
  id: string;
  text: string;
  label?: string;
}

export async function POST(req: Request) {
  try {
    const { goal, notes } = await req.json();
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const noteList = (notes as NoteInput[])
      .map((n) => `[${n.id}] ${n.label ? `(${n.label}) ` : ""}${n.text}`)
      .join("\n");

    const userMsg = `GOAL: ${goal || "Not specified"}\n\nNOTES:\n${noteList}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ suggestions: [] });

    const parsed = JSON.parse(match[0]);
    const valid = ["clarify", "expand", "decide", "express"];
    const suggestions = parsed.filter(
      (s: { id: string; action: string }) => s.id && valid.includes(s.action)
    );

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[analyze-notes]", err);
    return NextResponse.json({ suggestions: [] });
  }
}
