import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { INTELLECTUAL_LAYER } from "@/lib/prompts/intellectual-layer";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are the session architect for Primer. Based on the user's goal and their guided thinking answers, generate a focused session plan.

RULES:
- Generate exactly 4 dimensions. Each dimension should be a distinct area of thinking the user needs to explore. No overlap between dimensions. 4 is the max — be selective about what matters most.
- Each dimension is a specific aspect of their goal they need to think through
- Dimensions should follow a logical progression (not random)
- Use the user's exact language where possible
- Dimensions must be specific to THIS person's goal, not generic
- NEVER use generic dimensions like "define your vision" or "identify challenges"
- Think about what a great strategist or coach would tell this person to think through

DIMENSION LANGUAGE RULES:
- Labels should be 3-6 words MAX
- Write them like you're asking a friend over coffee, not writing a consulting report
- Use simple everyday words. No jargon. No compound phrases.
- Each label should feel like a natural question or topic, not a formal category
- Descriptions should be one simple sentence explaining what to think about

BAD dimension labels (too complex, too formal):
- "How to demonstrate the counterintuitive insight"
- "Audience-specific problem scenarios"
- "Competitive positioning against AI tools"
- "Discovery and adoption pathways"
- "Value demonstration strategies"
- "Market entry sequence strategy"

GOOD dimension labels (simple, conversational):
- "Who needs this most"
- "What they're doing instead"
- "Why they'd switch"
- "How they'd find you"
- "What makes you different"
- "The first thing to build"
- "Who to talk to first"
- "What success looks like"
- "The biggest risk"
- "What to say on the homepage"

The user should read a dimension label and immediately know what to think about. No translation needed. If a label requires a description to understand, the label is too complex.

FORMAT — respond with ONLY a JSON object, nothing else:
{
  "summary": "One sentence restating their goal in clearer language (under 20 words)",
  "dimensions": [
    {"label": "short label", "description": "one sentence explaining what to think through here"},
    {"label": "short label", "description": "one sentence explaining what to think through here"},
    {"label": "short label", "description": "one sentence explaining what to think through here"},
    {"label": "short label", "description": "one sentence explaining what to think through here"}
  ]
}

Adapt the mode:
- CLARITY mode: dimensions should separate and distill
- EXPANSION mode: dimensions should explore different angles and possibilities
- DECISION mode: dimensions should evaluate tradeoffs and criteria
- EXPRESSION mode: dimensions should structure and articulate

` + "\n\n--- INTELLECTUAL LAYER ---\n\n" + INTELLECTUAL_LAYER;

interface QA { question: string; answer: string; }

const FALLBACKS: Record<string, { label: string; description: string }[]> = {
  clarity: [
    { label: "What's actually going on", description: "Separate the facts from your interpretation of them" },
    { label: "What you're assuming", description: "Surface the beliefs you haven't questioned" },
    { label: "What matters most", description: "Find the one thread that everything else depends on" },
    { label: "The clearest version", description: "Distill everything into one sharp statement" },
  ],
  expansion: [
    { label: "The obvious angle", description: "Start with what you already see" },
    { label: "The opposite angle", description: "Flip your default assumption" },
    { label: "The outside perspective", description: "How would someone from a different world see this" },
    { label: "The boldest version", description: "Remove all constraints and see what emerges" },
  ],
  decision: [
    { label: "The actual choice", description: "Name the decision as simply as possible" },
    { label: "What your gut says", description: "Acknowledge the intuition you already have" },
    { label: "The worst case", description: "Imagine this fails. What specifically went wrong" },
    { label: "The real criteria", description: "What would need to be true to decide confidently" },
  ],
  expression: [
    { label: "The core message", description: "The one thing you're trying to say" },
    { label: "Who needs to hear it", description: "Define your specific audience and what they already believe" },
    { label: "The structure", description: "Find the logical flow of your argument" },
    { label: "The pushback", description: "Anticipate and address the strongest objection" },
  ],
};

export async function POST(req: Request) {
  try {
    const { goal, mode, qas } = await req.json();
    if (!goal) return NextResponse.json({ error: "Missing goal" }, { status: 400 });

    const safeMode = ["clarity", "expansion", "decision", "expression"].includes(mode) ? mode : "clarity";
    let userMsg = `MODE: ${safeMode.toUpperCase()}\nGOAL: "${goal}"\n`;
    if (qas?.length) {
      userMsg += "\nGUIDED THINKING ANSWERS:\n";
      (qas as QA[]).forEach((qa, i) => { userMsg += `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\n\n`; });
    }
    userMsg += "Generate the session plan as JSON.";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 500, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    clearTimeout(timer);

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const jsonStr = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    const plan = JSON.parse(jsonStr);
    if (!plan.dimensions?.length) throw new Error("No dimensions");
    return NextResponse.json(plan);
  } catch (err) {
    console.error("[session-plan]", err);
    const body = await req.clone().json().catch(() => ({}));
    const mode = body.mode || "clarity";
    const fb = FALLBACKS[mode] || FALLBACKS.clarity;
    return NextResponse.json({ summary: "Let's think through the key dimensions of your goal.", dimensions: fb, fallback: true });
  }
}
