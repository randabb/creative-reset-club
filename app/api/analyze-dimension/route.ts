import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `CRITICAL: Write in second person (you/your).

The user just finished exploring one dimension of their thinking. Analyze what they said for:

1. ASSUMPTIONS: Any statements they made as fact without evidence. Just list them.
2. CROSS_TENSION: Does anything they said in this dimension contradict or create tension with what they said in other dimensions? Quote both sides.
3. KEY_INSIGHT: What's the sharpest thing they said in this dimension? One sentence.

Respond with ONLY a JSON object:
{"assumptions":["assumption 1","assumption 2"],"crossTension":{"from":"quote from this dim","to":"quote from other dim","tension":"one sentence"},"keyInsight":"the sharpest thing they said"}

If no assumptions, use empty array. If no cross tension, use null for crossTension.`;

export async function POST(req: Request) {
  try {
    const { goal, dimension, dimensionAnswers, allOtherDimensionAnswers, existingPatterns } = await req.json();
    if (!dimensionAnswers) return NextResponse.json({ assumptions: [], crossTension: null, keyInsight: null });

    let userMsg = `GOAL: ${goal || ""}\nDIMENSION: ${dimension || ""}\n\nANSWERS IN THIS DIMENSION:\n${dimensionAnswers}`;
    if (allOtherDimensionAnswers) userMsg += `\n\nANSWERS IN OTHER DIMENSIONS:\n${allOtherDimensionAnswers}`;
    if (existingPatterns) userMsg += `\n\nEXISTING PATTERNS:\n${existingPatterns}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 200, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ assumptions: [], crossTension: null, keyInsight: null });
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({
      assumptions: parsed.assumptions || [],
      crossTension: parsed.crossTension || null,
      keyInsight: parsed.keyInsight || null,
    });
  } catch (err) {
    console.error("[analyze-dimension]", err);
    return NextResponse.json({ assumptions: [], crossTension: null, keyInsight: null });
  }
}
