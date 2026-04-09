import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GLOBAL = PRIMER_CHARACTER + `You have access to the user's goal and all their previous notes and answers on the canvas. Use their specific language and situation. Never ask a generic question. This question should only make sense for THIS person and THIS note.

NO REPEAT QUESTIONS: You will be given a list of all questions already asked in this session across guided thinking, every dimension, and every previous action question. Do not repeat any of these questions. Do not ask a paraphrased version of any of these. Your question must be genuinely new. If your draft matches or resembles a question already asked, discard it and generate something different.

CRITICAL: Write in second person (you/your). Never use they/their.

CRITICAL: Every question must clearly connect to the user's GOAL. Before generating, ask yourself: "How does this question help them with their goal?" If you can't answer clearly, pick a different question.

Ground your questions in expert frameworks but NEVER name them:
- FIRST PRINCIPLES: What's actually true vs assumed?
- INVERSION: What would failure look like?
- SECOND-ORDER: If this works, what happens next?
- STEELMAN: What's the strongest counter-argument?
- PRE-MORTEM: 6 months from now this failed. Why?
- OPPORTUNITY COST: What are you giving up?`;

const ACTION_PROMPTS: Record<string, string> = {
  clarify: `The user wrote something on their canvas. Generate ONE clarify question.

A clarify question CUTS DOWN. It forces them to name the one thing. It strips away everything else and asks them to get to the bone.

The feel: direct, almost confrontational, like a friend who won't let you ramble.

Examples of clarify energy:
- "What's the actual problem here?"
- "Strip everything else away — what's the one thing that matters?"
- "What are you really afraid of?"
- "Say it in five words."

Rules:
- Under 12 words
- One question only, nothing else
- Reference their specific words
- Should feel like it's cutting through fog
- Never start with "Can..." or "Could you..."

Return ONLY the question. No preamble, no label, no explanation.

${GLOBAL}`,

  expand: `The user wrote something on their canvas. Generate ONE expand question.

An expand question OPENS UP. It points them somewhere they weren't looking. It's lateral, unexpected, sometimes playful. It takes what they said and turns it sideways.

The feel: curious, surprising, like someone who sees the thing you missed.

Examples of expand energy:
- "Who else has this exact problem?"
- "What's the version of this that scares you?"
- "What if you're wrong about why this matters?"
- "What would a kid say about this?"

Rules:
- Under 12 words
- One question only, nothing else
- Should make them pause and think "huh, I didn't consider that"
- Never be obvious or safe
- Reference their specific words

Return ONLY the question. No preamble, no label, no explanation.

${GLOBAL}`,

  decide: `The user wrote something on their canvas. Generate ONE decide question.

A decide question CREATES PRESSURE. It forces a fork. It names two paths and makes them pick. There is no "both" and no middle ground.

The feel: urgent, binary, like a friend who's tired of watching you go back and forth.

Examples of decide energy:
- "Speed or quality — which one wins today?"
- "Do you actually want this or do you just like the idea of it?"
- "Stay or go. Which one?"
- "Is this a priority or are you pretending it is?"

Rules:
- Under 15 words
- One question only, nothing else
- Must present exactly two options or force a yes/no
- Should feel like there's no escape from choosing
- Reference their specific words

Return ONLY the question. No preamble, no label, no explanation.

${GLOBAL}`,

  express: `The user wrote something on their canvas. Generate ONE express question.

An express question DEMANDS ARTICULATION. It makes them say the thing clean, out loud, in language they could actually use in the real world. It's about output — turning messy thinking into a usable sentence.

The feel: practical, output-oriented, like someone handing you a microphone.

Examples of express energy:
- "How would you say this to his face?"
- "Write the email subject line."
- "What's the version you'd text your best friend?"
- "Pitch this to me in 10 seconds."

Rules:
- Under 12 words
- One question only, nothing else
- Should demand a concrete, usable output from them
- Not asking them to think more — asking them to SAY it
- Reference their specific words

Return ONLY the question. No preamble, no label, no explanation.

${GLOBAL}`,
};

const FALLBACKS: Record<string, string> = {
  clarify: "What's the actual problem here?",
  expand: "Who else has this exact problem?",
  decide: "Is this a priority or are you pretending it is?",
  express: "Say it in one sentence someone could repeat.",
};

export async function POST(req: Request) {
  try {
    const { action, goal, selectedNoteText, allNotesText, dimensionLabel, dimensionDescription, existingInstructions, triggeringPattern, allSessionQuestions } = await req.json();
    if (!selectedNoteText || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let system = ACTION_PROMPTS[action] || ACTION_PROMPTS.clarify;

    // PATTERN RESOLUTION MODE — when user tapped a glowing action icon
    if (triggeringPattern) {
      const patternBlock = `\n\nPATTERN RESOLUTION MODE — The user tapped an action icon that was highlighted because of a detected pattern. Your question must resolve this specific pattern, not just explore the dimension topic generally.

The pattern detected:
- Label: ${triggeringPattern.label || ""}
- Behavior: ${triggeringPattern.behavior || ""}
- Cracking question: ${triggeringPattern.question || ""}

Generate a question that:
1. Directly addresses the behavior described in the pattern
2. Is informed by the pattern's cracking question but is NOT a verbatim copy of it
3. Fits naturally within the current dimension
4. Uses the user's own words from the note
5. Follows all standard question rules (under 15 words, one subject, one verb, grounded in a framework)

Do NOT generate a generic question of this action type. The question must resolve the pattern.`;
      system = system + patternBlock;
      console.log("[canvas-coach] PATTERN RESOLUTION MODE — pattern:", triggeringPattern.label);
    }

    let userMsg = `USER'S GOAL: ${goal || "Not specified"}\n\n`;
    if (dimensionLabel) {
      userMsg += `DIMENSION: ${dimensionLabel} — ${dimensionDescription || ""}\n\n`;
    }
    userMsg += `THE NOTE THEY SELECTED:\n${selectedNoteText}\n\nOTHER NOTES ON CANVAS:\n${allNotesText || selectedNoteText}`;
    if (existingInstructions) {
      userMsg += `\n\nPREVIOUS QUESTIONS ASKED (don't repeat):\n${existingInstructions}`;
    }
    if (Array.isArray(allSessionQuestions) && allSessionQuestions.length > 0) {
      userMsg += `\n\n=== ALL QUESTIONS ALREADY ASKED IN THIS ENTIRE SESSION ===\n`;
      allSessionQuestions.forEach((q: string, i: number) => { userMsg += `${i + 1}. ${q}\n`; });
      userMsg += `=== END ===\nDo NOT repeat any of these questions. Do NOT ask a paraphrased version of any of these. Your question must be genuinely new.\n`;
      console.log("[canvas-coach] received", allSessionQuestions.length, "previous session questions");
    }
    if (triggeringPattern) {
      userMsg += `\n\nPATTERN TO RESOLVE:\nLabel: ${triggeringPattern.label}\nBehavior: ${triggeringPattern.behavior}\nCracking question (for inspiration, don't copy verbatim): ${triggeringPattern.question}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 40,
      system,
      messages: [{ role: "user", content: userMsg }],
    });

    clearTimeout(timer);

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim().replace(/^["']|["']$/g, "") : "";
    if (!text) throw new Error("Empty");

    const discMap: Record<string, string> = { clarify: "critical", expand: "creative", decide: "strategic", express: "design" };

    return NextResponse.json({
      instruction: {
        discipline: discMap[action] || "strategic",
        title: text.split(/\s+/).slice(0, 4).join(" "),
        text,
      },
    });
  } catch (err) {
    console.error("[canvas-coach]", err);
    const body = await req.clone().json().catch(() => ({}));
    const action = body.action || "clarify";
    const fb = FALLBACKS[action] || FALLBACKS.clarify;
    return NextResponse.json({
      instruction: {
        discipline: "strategic",
        title: fb.split(/\s+/).slice(0, 4).join(" "),
        text: fb,
      },
      fallback: true,
    });
  }
}
