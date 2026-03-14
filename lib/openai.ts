// Server-side OpenAI helper (fetch-based, no SDK dependency issues)

export function extractJSON(raw: string): string {
  // Bug fix: Handle empty/null input and validate extracted JSON exists
  if (!raw || typeof raw !== "string") {
    throw new Error("extractJSON: Input must be a non-empty string");
  }
  const m = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
  const extracted = m ? m[1] : raw;
  if (!extracted || !extracted.trim()) {
    throw new Error("extractJSON: No JSON content found in response");
  }
  return extracted;
}

export async function callOpenAI(
  apiKey: string,
  messages: { role: string; content: string }[],
  maxTokens = 2500
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  // Bug fix: Validate that we got actual content from OpenAI, not an empty response
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }
  return content;
}
