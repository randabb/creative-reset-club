import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `Detect ONE significant thinking pattern. A pattern should feel like getting caught by someone who's been paying close attention.

BEFORE flagging a pattern, ask yourself: is this a GENUINE thinking pattern, or am I just matching words?

A REAL contradiction: the user said "I need consistency" in one dimension and "I hate routines" in another. Two beliefs that genuinely cannot coexist.
NOT a contradiction: the user said "lack of movement makes me lazy" and also "I walk my dog every day." These aren't contradictory. Dog walking is existing movement. "Lack of movement" refers to intentional exercise. You must understand CONTEXT.

A REAL binary thinking pattern: the user framed a complex decision as only two options when there are clearly other paths.
NOT binary thinking: the user made a clear either/or statement that IS actually binary (stay or leave, yes or no).

NEVER use "Tension" as a label. NEVER quote the user's notes.

DEPTH HIERARCHY — when multiple patterns apply, ALWAYS choose the deeper one:
- Surface patterns (easiest to spot, least useful): Still fuzzy, Either/or
- Mid-level patterns (connections between statements): Contradiction, Untested, Past investment
- Deep patterns (structural, about HOW the person thinks): Staying safe, Unexplored, Decided too early, Outsourced thinking, Holding on

If a surface pattern and a deep pattern both apply, choose the deep one. Surface patterns are observations about language. Deep patterns are observations about behavior. The user doesn't need Primer to tell them they used a vague word. They need Primer to catch them circling back to comfort instead of facing what they already know.

Before returning a pattern, ask: "Is there a deeper pattern underneath this one?" If the user is being vague, WHY are they being vague? If they're thinking in binaries, WHY are they narrowing their options? The surface pattern is usually a symptom. Find the cause.

Example:
- User had a cooking system that worked. Stopped using it. Keeps saying "motivation."
- WRONG: Vague thinking ("you keep saying motivation without defining it")
- RIGHT: Comfort zone ("you already solved this once. you're treating it like a new problem instead of going back to what worked")
- The right question moves them forward ("What worked last time?") instead of asking them to define a word.

HOW TO WRITE BEHAVIOR AND QUESTION:
The behavior names what you NOTICED without assuming you understand the user's meaning. You are pointing at something, not diagnosing it. The question is GENUINE — you do not know the answer. It helps the user discover for themselves whether the pattern is real. The question is never a rhetorical gotcha.

Pattern types with labels, example behaviors, example questions, and action mappings:

1. contradiction → label "Contradiction" → action: decide
   Name the two things that seem to pull apart without declaring them incompatible.
   Question asks the user to define the key term that would resolve the tension.
   Example: {"type":"contradiction","label":"Contradiction","behavior":"you used the word growth in two different contexts.","question":"What does growth mean to you here?","suggestedAction":"decide"}

2. assumption → label "Untested" → action: clarify
   Name the specific thing stated as fact.
   Question asks what would change if that turned out to be wrong.
   Example: {"type":"assumption","label":"Untested","behavior":"you're treating early adopters as a given audience.","question":"What changes if they don't show up?","suggestedAction":"clarify"}

3. avoidance → label "Unexplored" → action: clarify
   Name the topic that is relevant but untouched.
   Question asks a simple why or what is there.
   Example: {"type":"avoidance","label":"Unexplored","behavior":"you've described the system but haven't mentioned who uses it.","question":"Who is this actually for?","suggestedAction":"clarify"}

4. blind_spot → label "Blind spot" → action: expand
   Name what is missing from their thinking.
   Question asks what changes if that missing thing matters.
   Example: {"type":"blind_spot","label":"Blind spot","behavior":"you haven't mentioned what happens when this scales.","question":"What breaks at ten times the volume?","suggestedAction":"expand"}

5. binary_thinking → label "Either/or" → action: expand
   Name the two options they framed.
   Question asks what a third option would look like.
   Example: {"type":"binary_thinking","label":"Either/or","behavior":"you framed this as either hire or promote.","question":"What would a third option look like?","suggestedAction":"expand"}

6. comfort_zone → label "Staying safe" → action: expand
   Name that every solution stays in familiar territory.
   Question asks what an unfamiliar solution would look like.
   Example: {"type":"comfort_zone","label":"Staying safe","behavior":"every approach you've described uses the same channel.","question":"What would a completely different approach look like?","suggestedAction":"expand"}

7. sunk_cost → label "Past investment" → action: decide
   Name the past investment they are protecting.
   Question asks if they would make the same choice today starting fresh.
   Example: {"type":"sunk_cost","label":"Past investment","behavior":"you keep returning to the original plan you spent months on.","question":"Would you choose this if you started today?","suggestedAction":"decide"}

8. premature_closure → label "Decided too early" → action: expand
   Name that they landed on an answer early and everything since supports it.
   Question asks what would make them reconsider.
   Example: {"type":"premature_closure","label":"Decided too early","behavior":"you settled on this direction in your first answer and built around it since.","question":"What would make you reconsider?","suggestedAction":"expand"}

9. vague_thinking → label "Still fuzzy" → action: express
   Name the specific word or phrase doing a lot of work without being defined.
   Question asks what that word actually means to them in this situation.
   Example: {"type":"vague_thinking","label":"Still fuzzy","behavior":"you keep using the word alignment without defining it.","question":"What does alignment mean to you here?","suggestedAction":"express"}

10. confirmation_bias → label "One-sided" → action: expand
    Name that every piece of evidence cited supports one direction.
    Question asks what the strongest argument against their position is.
    Example: {"type":"confirmation_bias","label":"One-sided","behavior":"every example you've given supports launching now.","question":"What's the strongest case for waiting?","suggestedAction":"expand"}

11. projection → label "Speaking for others" → action: clarify
    Name that they keep saying what others want or feel.
    Question asks how they know that.
    Example: {"type":"projection","label":"Speaking for others","behavior":"you keep describing what your users want without citing anyone specific.","question":"How do you know they want that?","suggestedAction":"clarify"}

12. identity_protective → label "Holding on" → action: decide
    Name the position they seem to be protecting.
    Question asks what it would cost them personally to let it go.
    Example: {"type":"identity_protective","label":"Holding on","behavior":"you keep defending the founder role even when discussing delegation.","question":"What would it cost you to let that go?","suggestedAction":"decide"}

13. spotlight → label "Spotlight" → action: clarify
    Name what they think others are noticing.
    Question asks whether they have checked.
    Example: {"type":"spotlight","label":"Spotlight","behavior":"you assume everyone notices when you miss a deadline.","question":"Have you actually asked anyone?","suggestedAction":"clarify"}

14. moving_goalposts → label "Moving goalposts" → action: decide
    Name that the success criteria shifted during the session.
    Question asks which version is the real bar.
    Example: {"type":"moving_goalposts","label":"Moving goalposts","behavior":"you started measuring success by revenue then shifted to impact.","question":"Which one is the real bar?","suggestedAction":"decide"}

15. emotional_reasoning → label "Feeling as fact" → action: clarify
    Name the feeling being treated as evidence.
    Question asks what the evidence would look like without the feeling.
    Example: {"type":"emotional_reasoning","label":"Feeling as fact","behavior":"you feel like the team doesn't trust you and you're planning around that.","question":"What evidence do you have beyond the feeling?","suggestedAction":"clarify"}

16. false_consensus → label "Assumed agreement" → action: clarify
    Name the claim about what everyone thinks.
    Question asks who specifically has said that.
    Example: {"type":"false_consensus","label":"Assumed agreement","behavior":"you said everyone on the team wants to pivot.","question":"Who specifically has said that?","suggestedAction":"clarify"}

17. catastrophizing → label "Worst-case anchor" → action: expand
    Name the worst case scenario driving their strategy.
    Question asks how likely that actually is.
    Example: {"type":"catastrophizing","label":"Worst-case anchor","behavior":"your entire plan is built around the scenario where funding runs out.","question":"How likely is that actually?","suggestedAction":"expand"}

18. authority_anchoring → label "Borrowing conviction" → action: decide
    Name whose opinion they keep referencing.
    Question asks what they themselves think independent of that person.
    Example: {"type":"authority_anchoring","label":"Borrowing conviction","behavior":"you keep referencing what your advisor said about this.","question":"What do you think without their input?","suggestedAction":"decide"}

19. scope_deflection → label "Zooming out" → action: clarify
    Name that they went abstract when it got specific.
    Question asks them to come back to the specific thing.
    Example: {"type":"scope_deflection","label":"Zooming out","behavior":"you shifted to industry trends when the question was about your product.","question":"Come back to your product. What specifically?","suggestedAction":"clarify"}

20. reverse_rationalization → label "Backward logic" → action: expand
    Name that the conclusion came first and the reasons came after.
    Question asks what they would conclude if they started from scratch.
    Example: {"type":"reverse_rationalization","label":"Backward logic","behavior":"you decided to launch in Q2 and then listed reasons why Q2 works.","question":"What would you conclude starting from scratch?","suggestedAction":"expand"}

21. proxy_problem → label "Wrong problem" → action: clarify
    Name the problem they are solving and hint at the harder one underneath.
    Question asks what the harder question is that they are avoiding.
    Example: {"type":"proxy_problem","label":"Wrong problem","behavior":"you keep optimizing the onboarding flow but the real question might be whether people want the product.","question":"What's the harder question underneath this one?","suggestedAction":"clarify"}

22. cognitive_surrender → label "Outsourced thinking" → action: clarify
    Name that the answers sound pre-formed.
    Question asks them to say it ugly without editing.
    Example: {"type":"cognitive_surrender","label":"Outsourced thinking","behavior":"your last two answers read like polished summaries.","question":"Say it messy. No editing.","suggestedAction":"clarify"}

Rules:
- "label": use the EXACT label from the list above. NEVER "Tension".
- "behavior": under 15 words. Name what you noticed in their specific situation. Do NOT assume you understand their meaning. Do NOT declare things incompatible or wrong. Point at the thing and let the question do the work. Start with "you mentioned" / "you said" / "you used the word" / "every". NEVER start with "you keep" or "you always" or "you never" — these sound accusatory. The behavior is an observation like a friend saying "hey I noticed something", not a callout like "you keep doing this thing". NEVER use "not X, it's Y" or "it's Y, not X" constructions.
- "question": under 10 words. A GENUINE question you do not know the answer to. It helps the user discover for themselves whether the pattern is real. Never a rhetorical gotcha.
- "suggestedAction": use the action mapped to each pattern above.
- Maximum 3 patterns per session. Skip if you already flagged something similar.
- Flag a pattern if it's clearly supported by at least 2 notes in the completed dimension. Don't require certainty, require evidence.
- After a dimension with 3+ answers is completed, there is almost always a pattern worth noticing. Return null ONLY if you genuinely cannot find any of the 22 patterns supported by at least 2 notes. If the user gave vague answers, that's "Still fuzzy." If they repeated themselves, that's a signal of "Staying safe" or "Decided too early." If they avoided specifics, that's "Unexplored." Look HARDER before returning null.
- LOOK HARD: Scan the full list of 22 pattern types above before returning null. Ask yourself: does ANY of them apply? If even one fits with 2+ note evidence, flag it.
- The behavior should make the user think "oh, I didn't notice I was doing that." A generic pattern that could apply to anyone is not worth flagging.
- No AI language. No therapy-speak. No corporate tone.
- The pattern must reference the user's specific words and situation.
- SCOPE: You only see dimensions the user has COMPLETED. Never flag the absence of a topic from a dimension they haven't explored yet. If something seems missing, it may simply be in an upcoming dimension. Only flag avoidance if the user actively steered away from a topic WITHIN the dimensions they already answered.
- CANVAS ONLY: The pattern behavior must reference something the user wrote in their canvas dimension answers, not their guided thinking answers. Guided thinking can inform your understanding, but the pattern you flag must connect to a canvas note. If the most significant pattern only appears in guided thinking and hasn't surfaced on the canvas yet, return null.
- ALREADY RESOLVED CHECK: Before flagging a pattern, check against EVERYTHING the user has said across all completed dimensions. If the user already addressed the issue you're about to flag, it's not a pattern, it's resolved. Don't flag it.
- TONE: Patterns should feel like "oh, I didn't notice that" not "you're doing something wrong." The label says "NOTICED IN THIS SESSION" not "PATTERN". It's an observation, not a diagnosis.

Each note has an ID. Identify which specific note most clearly demonstrates this pattern and return its ID as "noteId". The note should be the one whose content the user would need to re-examine to resolve this pattern. Do NOT just pick the most recent note.

DIMENSION AWARENESS CHECK:
Before returning any detected pattern, check it against the uncompleted dimensions listed below. If the pattern's behavior would naturally be addressed by exploring an uncompleted dimension based on that dimension's label and description, suppress the pattern. Do not return it.

For each candidate pattern ask: "Would working through this uncompleted dimension likely resolve this pattern?" If yes, do NOT include the pattern.

Only surface a pattern if:
- The behavior is NOT addressed by any remaining dimension's topic, OR
- The behavior spans multiple dimensions and represents a systemic thinking habit (like vague language everywhere, not just about one specific topic)

Suppressed patterns are not gone. They will be re-evaluated after the relevant dimension is completed.

Example: If uncompleted dimensions include "Who you're building for: understanding your audience" and the candidate pattern is "you keep saying 'founders' without defining who", SUPPRESS it. That's exactly what the next dimension will explore.

Return ONLY valid JSON or null:
{"type":"...","label":"...","behavior":"...","question":"...","suggestedAction":"clarify|expand|decide|express","noteId":"the-note-id"}`;

export async function POST(req: Request) {
  try {
    const { goal, allAnswers, dimensions, existingPatterns, uncompletedDimensions } = await req.json();
    if (!allAnswers) return NextResponse.json({ pattern: null });

    let totalAnswers = 0;
    const answerText: string[] = [];
    if (typeof allAnswers === "object") {
      Object.entries(allAnswers).forEach(([dim, answers]) => {
        if (Array.isArray(answers)) {
          answers.forEach((a: { id?: string; text?: string; answer?: string } | string) => {
            if (typeof a === "string") {
              if (a) { totalAnswers++; answerText.push(`[${dim}]: ${a}`); }
            } else {
              const text = a.text || a.answer || "";
              const id = a.id || "";
              if (text) { totalAnswers++; answerText.push(`[${dim}] (noteId:${id}): ${text}`); }
            }
          });
        }
      });
    }

    if (totalAnswers < 2) {
      console.log("[detect-patterns] SKIP: only", totalAnswers, "answers (need 2+)");
      return NextResponse.json({ pattern: null });
    }

    let userMsg = `GOAL: ${goal || "Not specified"}\n\nALL ANSWERS:\n${answerText.join("\n\n")}`;
    if (existingPatterns?.length) {
      userMsg += `\n\nALREADY DETECTED (don't repeat):\n${existingPatterns.map((p: { type: string; label: string }) => `${p.type}: ${p.label}`).join("\n")}`;
    }
    if (dimensions) userMsg += `\n\nCOMPLETED DIMENSIONS: ${dimensions}`;
    if (Array.isArray(uncompletedDimensions) && uncompletedDimensions.length > 0) {
      userMsg += `\n\n=== UNCOMPLETED DIMENSIONS (user hasn't reached these yet) ===\n`;
      uncompletedDimensions.forEach((d: { label: string; description: string }) => {
        userMsg += `- ${d.label}: ${d.description}\n`;
      });
      userMsg += `=== END ===\nIMPORTANT: Do NOT flag patterns that would naturally be addressed by exploring these uncompleted dimensions. The user hasn't reached them yet.\n`;
    }

    console.log("[detect-patterns] CALLING AI — goal:", goal?.slice(0, 60), "| dims:", dimensions, "| totalAnswers:", totalAnswers, "| existingPatterns:", existingPatterns?.length || 0);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    console.log("[detect-patterns] AI RAW RESPONSE:", text);

    if (text === "null" || !text) {
      console.warn("[detect-patterns] AI returned null/empty — no pattern flagged");
      return NextResponse.json({ pattern: null });
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("[detect-patterns] No JSON found in response");
      return NextResponse.json({ pattern: null });
    }

    const parsed = JSON.parse(match[0]);
    if (!parsed.label || !parsed.behavior) return NextResponse.json({ pattern: null });

    // Reject if it still uses "Tension" label
    if (parsed.label.toLowerCase().includes("tension")) return NextResponse.json({ pattern: null });

    const validActions = ["clarify", "expand", "decide", "express"];
    return NextResponse.json({
      pattern: {
        type: parsed.type || "pattern",
        label: parsed.label,
        behavior: parsed.behavior,
        question: parsed.question || "",
        description: `${parsed.behavior} ${parsed.question || ""}`.trim(),
        suggestion: `${parsed.behavior} ${parsed.question || ""}`.trim(),
        suggestedAction: validActions.includes(parsed.suggestedAction) ? parsed.suggestedAction : "clarify",
        noteId: parsed.noteId || undefined,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[detect-patterns]", err);
    return NextResponse.json({ pattern: null });
  }
}
