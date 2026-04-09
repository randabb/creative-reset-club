import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `CRITICAL: Write in second person (you/your).

The user just finished exploring one dimension of their thinking. Analyze what they said for:

1. ASSUMPTIONS: Any statements they made as fact without evidence. Describe the assumption, don't quote their words.
2. CROSS_TENSION: Does anything in this dimension contradict what they said in other dimensions? Describe the tension in one sentence. Don't quote their notes directly.
3. KEY_INSIGHT: What's the sharpest realization from this dimension? One sentence in your own words.

Respond with ONLY a JSON object:
{"assumptions":["they assume X is true"],"crossTension":{"tension":"one sentence describing the tension"},"keyInsight":"the sharpest insight"}

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
