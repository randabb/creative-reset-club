import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Generate one line for the user's brief based on this completed dimension of their thinking. This line should be a sharp, actionable insight — something they could take and use immediately.

Rules:
- One sentence, 15-25 words
- Specific to what they said, not generic advice
- Should feel like the conclusion of this dimension's thinking
- Write in second person (you/your)
- Each line should stand alone as a useful insight

Return ONLY the line as a string.`;

export async function POST(req: Request) {
  try {
    const { goal, dimension, answers, discoveries, previousBriefLines } = await req.json();
    let userMsg = `GOAL: ${goal || ""}\nDIMENSION: ${dimension || ""}`;
    if (answers) userMsg += `\n\nANSWERS:\n${answers}`;
    if (discoveries) userMsg += `\n\nDISCOVERIES:\n${discoveries}`;
    if (previousBriefLines) userMsg += `\n\nPREVIOUS BRIEF LINES (don't repeat):\n${previousBriefLines}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 60, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim().replace(/^["']|["']$/g, "") : "";
    return NextResponse.json({ line: text || "" });
  } catch (err) {
    console.error("[mobile-brief-line]", err);
    return NextResponse.json({ line: "" });
  }
}
