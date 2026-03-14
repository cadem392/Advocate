import { NextRequest, NextResponse } from "next/server";
import { ANALYZE_PROMPT } from "@/lib/prompts";
import { SAMPLE_ANALYSIS } from "@/lib/sample-data";
import { callOpenAI, extractJSON } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { documentText, useSampleMode, apiKey } = await request.json();

    if (!documentText?.trim()) {
      return NextResponse.json({ error: "Document text is required" }, { status: 400 });
    }

    if (useSampleMode || !apiKey) {
      return NextResponse.json(SAMPLE_ANALYSIS);
    }

    const raw = await callOpenAI(apiKey, [
      { role: "user", content: ANALYZE_PROMPT + documentText },
    ]);

    const analysis = JSON.parse(extractJSON(raw));
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(SAMPLE_ANALYSIS);
  }
}
