import { NextRequest, NextResponse } from "next/server";
import { STRUCTURE_PROMPT } from "@/lib/prompts";
import { SAMPLE_STRUCTURED_FACTS } from "@/lib/sample-data";
import { callOpenAI, extractJSON } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { documentText, useSampleMode, apiKey } = await request.json();

    if (!documentText?.trim()) {
      return NextResponse.json({ error: "Document text is required" }, { status: 400 });
    }

    if (useSampleMode || !apiKey) {
      return NextResponse.json(SAMPLE_STRUCTURED_FACTS);
    }

    const raw = await callOpenAI(apiKey, [
      { role: "user", content: STRUCTURE_PROMPT + documentText },
    ], 1000);

    const facts = JSON.parse(extractJSON(raw));
    return NextResponse.json(facts);
  } catch (error) {
    console.error("Structure error:", error);
    return NextResponse.json(SAMPLE_STRUCTURED_FACTS);
  }
}
