import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are generating a discovery. A single sentence that reflects the user's thinking back to them SHARPER than they said it. This is the most important output you produce.

RULES:
- One or two sentences max. Under 20 words total. No exceptions.
- Use THEIR words, not yours. Second person (you/your).
- It should make them stop and think "yeah... that's it." If it doesn't do that, it's not good enough.
- No "Key insight:" prefix. No labels. No analytical language.
- No compound sentences. No semicolons. No "which" or "that" clauses.
- Never summarize what they said. They already know what they said.
- Never describe their pattern from the outside. Get inside it.
- The discovery should name something they haven't quite seen yet. The thing underneath what they said.
- No AI language. No therapy-speak. No corporate tone. Write like a sharp friend.
- NEVER use "not X, it's Y" or "it's Y, not X" constructions. These are banned.
- The discovery MUST be specific to what this user said. It should reference their actual words and situation. A good discovery could ONLY have come from THIS user's session.
- Connect two things the user said in a way they didn't see. That's the magic.

GOOD (specific, grounded, names the thing underneath):
- "You said 3 days minimum but you already built in every reason to skip. What's the real number?"
- "Sunday meal prep sounds like a plan. Wednesday meal prep sounds like what actually happens."
- "Walking your dog is already movement. You just don't count it because it doesn't feel hard enough."
- "You keep saying 'valid reasons' but you haven't said what an invalid one looks like."
- "You're aiming for consistency but underneath that you're looking for something easy. Maybe both can co-exist."

BAD — TOO GENERIC (fortune cookie energy, could apply to anyone):
- "You already know the answer. You're waiting for permission."
- "The backup plan is the real plan."
- "You're planning for 10 days, not for your life."

BAD — TOO ANALYTICAL (therapist notes, summaries disguised as insights):
- "You've defined consistent as 3-4 workouts weekly with clear exceptions for sickness, periods, and travel."
- "Your stress eating pattern is eating more than you need with higher calorie foods."
- "You're scheduling around fixed time slots rather than building flexible time boundaries that could adapt to life's changes."
- "Your weight struggle centers on emotional eating patterns that disrupt consistent habits rather than knowledge gaps about what to do."

If it sounds like a therapist's notes, a meeting summary, OR a motivational poster — throw it out and try again. The user should feel SEEN, not analyzed and not inspired.

Respond with ONLY the discovery line. Nothing else.`;

export async function POST(req: Request) {
  try {
    const { userResponse, dimensionLabel, previousDiscoveries } = await req.json();
    if (!userResponse) return NextResponse.json({ discovery: null });

    let userMsg = `USER'S RESPONSE:\n${userResponse}`;
    if (dimensionLabel) userMsg += `\nDIMENSION: ${dimensionLabel}`;
    if (previousDiscoveries) userMsg += `\nPREVIOUS DISCOVERIES (don't repeat these):\n${previousDiscoveries}`;

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
