import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 15;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `Based on this user's goal and their thinking synthesis, determine the single most useful DELIVERABLE an AI assistant should create for them. This should be something tangible they can walk away with.

Examples of deliverables based on different goals:
- "figure out how to position my product" → "Create a one-page positioning document with: target audience, core problem, unique value prop, key messaging, and 3 tagline options"
- "decide whether to hire or promote" → "Create a decision brief with: pros/cons of each option, recommended path, 3 immediate next steps, and a 30-day action plan"
- "plan my product roadmap" → "Create a 90-day roadmap with: priorities ranked, key milestones, dependencies, and what to cut"
- "figure out my go-to-market strategy" → "Create a GTM strategy document with: ICP definition, channel priorities, first 30-day plan, messaging framework, and 10 outbound message templates"
- "think through a difficult conversation" → "Create a conversation script with: opening line, key points to cover, responses to likely pushback, and the specific ask"
- "decide if I should leave my job" → "Create a decision framework with: what staying costs, what leaving costs, 3 non-negotiables, a timeline, and the first step for whichever path I choose"
- "lose weight" → "Create a weekly action plan with: 5 specific meals to prep, a 3-day workout schedule, the one habit to start this week, and what to do when motivation drops"

Pick the deliverable that best fits their specific goal and synthesis. Be specific about what the document should contain. The deliverable should feel like the natural next step after their thinking.

Return ONLY a JSON object, no markdown:
{"deliverable": "Create a [specific document type] with: [specific sections and content]", "label": "short 2-3 word label like 'Strategy doc' or 'Decision brief' or 'Action plan'"}`;

export async function POST(req: Request) {
  try {
    const { goal, mode, synthesis } = await req.json();
    if (!goal) return NextResponse.json({ deliverable: null, label: null });

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: "user", content: `User's goal: "${goal}"\nMode: ${mode}\nSynthesis: ${synthesis || "No synthesis yet"}` }],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({
      deliverable: parsed.deliverable || null,
      label: parsed.label || null,
    });
  } catch (err) {
    console.error("[suggest-deliverable]", err);
    return NextResponse.json({ deliverable: null, label: null });
  }
}
