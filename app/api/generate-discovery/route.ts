import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `You are generating a discovery. One sentence. Under 15 words.

Your only job is to say back what the user said, in fewer and sharper words.

You are a mirror. You show them what they said, clearer than they said it. You do NOT find hidden meaning. You do NOT tell them what they are really doing. You do NOT tell them what they have not done. You do NOT make conclusions they did not make. You do NOT interpret their words. You repeat their words back, sharper.

GOOD: user says "my health" when asked what matters most at 80. Discovery: "Health. No hesitation."
GOOD: user says "cooking, cleaning, fresh air, unwinding, growing Primer". Discovery: "Primer is on the same list as cooking and fresh air."
GOOD: user says "i forget the ideas when weight loss competes". Discovery: "Ideas disappear when weight loss takes over your morning."
GOOD: user says "none of them, theyre all ideas that feed each other". Discovery: "Every piece feeds the others. Nothing stands alone."

BAD: "You built Primer but the client work is burying it." The user did not say client work is burying anything.
BAD: "Thinking it through well is your way of avoiding the messy work of starting." The user did not say they are avoiding anything.
BAD: "Foundation work feels binary when it is actually gradual." The user did not say this.
BAD: "You have not ranked them." The user was not asked to rank them.

The test before you return any discovery: did the user say this or did you decide it? If you decided it, throw it out and try again.

Also check: is this over 15 words? If yes, cut it. Does this use the construction "not X it is Y" or "it is Y not X"? If yes, rewrite it. Does this sound like a therapist or an analyst? If yes, throw it out. Could this discovery apply to any user in any session? If yes, it is too generic, throw it out.

You will receive a list of previous discoveries. Never repeat the same idea, structure, or opening phrase.

Respond with ONLY the discovery line. Nothing else.`;

export async function POST(req: Request) {
  try {
    const { userResponse, dimensionLabel, previousDiscoveries, patternContext } = await req.json();
    if (!userResponse) return NextResponse.json({ discovery: null });

    let userMsg = `USER'S RESPONSE:\n${userResponse}`;
    if (dimensionLabel) userMsg += `\nDIMENSION: ${dimensionLabel}`;
    if (previousDiscoveries) {
      userMsg += `\n=== ALL DISCOVERIES ALREADY GENERATED IN THIS SESSION ===\n${previousDiscoveries}\n=== END OF PREVIOUS DISCOVERIES ===\nNEVER repeat any of these. Never use the same opening phrase, same structure, or same core idea. Each new discovery must be genuinely new. ALSO check the balance: if most are challenges, the next should affirm.`;
      console.log("[generate-discovery] received", previousDiscoveries.split("\n").length, "previous discoveries");
    }
    if (patternContext) {
      userMsg += `\n\n=== PATTERN RESOLUTION CONTEXT ===\nThe user just answered a question that was resolving a detected pattern.\nPattern label: ${patternContext.label}\nBehavior observed: ${patternContext.behavior}\nQuestion asked: ${patternContext.question}\n=== END ===\nThe discovery should reflect what the user clarified or resolved by answering this question. Acknowledge the shift in their thinking. Do NOT repeat the pattern observation. If they genuinely resolved the tension or clarified the fuzzy term, name what became clear. If they did not fully resolve it, name what is still open.`;
      console.log("[generate-discovery] PATTERN RESOLUTION context:", patternContext.label);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 50,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ discovery: text || null });
  } catch (err) {
    console.error("[generate-discovery]", err);
    return NextResponse.json({ discovery: null });
  }
}
