import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PRIMER_CHARACTER } from "@/lib/primer-character";

export const maxDuration = 30;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = PRIMER_CHARACTER + `CRITICAL: Write in second person (you/your).

The user completed a full thinking session. Analyze their entire body of thinking for the synthesis.

1. ASSUMPTIONS: List every statement they made as fact without evidence across all dimensions. Be thorough.
2. AVOIDANCE: Based on their goal, what topics or angles did they conspicuously never address? What's missing?
3. CROSS_TENSIONS: List all contradictions or unresolved tensions between dimensions. Quote both sides for each.
4. STRONGEST_FRAGMENT: What's the single sharpest, most insightful thing they said across the entire session? Quote it exactly.

Respond with ONLY a JSON object:
{"assumptions":["..."],"avoidance":"what they never addressed","crossTensions":[{"from":"...","to":"...","tension":"..."}],"strongestFragment":"exact quote"}

Use empty arrays/null if nothing found. Only include genuine findings.`;

export async function POST(req: Request) {
  try {
    const { goal, mode, allDimensionAnswers, allDiscoveries, allPatterns } = await req.json();

    let userMsg = `GOAL: ${goal || ""}\nMODE: ${mode || ""}\n\nALL ANSWERS:\n${allDimensionAnswers || ""}`;
    if (allDiscoveries) userMsg += `\n\nDISCOVERIES:\n${allDiscoveries}`;
    if (allPatterns) userMsg += `\n\nPATTERNS:\n${allPatterns}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 400, system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ assumptions: [], avoidance: null, crossTensions: [], strongestFragment: null });
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({
      assumptions: parsed.assumptions || [],
      avoidance: parsed.avoidance || null,
      crossTensions: parsed.crossTensions || [],
      strongestFragment: parsed.strongestFragment || null,
    });
  } catch (err) {
    console.error("[analyze-session]", err);
    return NextResponse.json({ assumptions: [], avoidance: null, crossTensions: [], strongestFragment: null });
  }
}
