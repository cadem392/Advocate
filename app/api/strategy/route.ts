import { NextRequest, NextResponse } from "next/server";
import { STRATEGY_PROMPT } from "@/lib/prompts";
import { SAMPLE_ATTACK_TREE } from "@/lib/sample-data";
import { callOpenAI, extractJSON } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { analysis, useSampleMode, apiKey } = await request.json();

    if (!analysis) {
      return NextResponse.json({ error: "Analysis data is required" }, { status: 400 });
    }

    if (useSampleMode || !apiKey) {
      return NextResponse.json(SAMPLE_ATTACK_TREE);
    }

    const raw = await callOpenAI(apiKey, [
      { role: "user", content: STRATEGY_PROMPT + JSON.stringify(analysis, null, 2) },
    ]);

    const tree = JSON.parse(extractJSON(raw));
    return NextResponse.json(tree);
  } catch (error) {
    console.error("Strategy error:", error);
    return NextResponse.json(SAMPLE_ATTACK_TREE);
  }
}
