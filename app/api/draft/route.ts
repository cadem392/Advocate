import { NextRequest, NextResponse } from "next/server";
import { DRAFT_PROMPT } from "@/lib/prompts";
import { SAMPLE_DRAFT } from "@/lib/sample-data";
import { callOpenAI } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { nodeLabel, nodeDescription, documentType, analysis, useSampleMode, apiKey } =
      await request.json();

    if (!nodeDescription || !analysis) {
      return NextResponse.json({ error: "Required parameters missing" }, { status: 400 });
    }

    if (useSampleMode || !apiKey) {
      return NextResponse.json({ content: SAMPLE_DRAFT });
    }

    const ctx = `Node: ${nodeLabel}\nDescription: ${nodeDescription}\nDocument type: ${documentType}\nCase analysis: ${JSON.stringify(analysis)}`;
    const content = await callOpenAI(apiKey, [
      { role: "user", content: DRAFT_PROMPT + ctx },
    ], 2500);

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Draft error:", error);
    return NextResponse.json({ content: SAMPLE_DRAFT });
  }
}
