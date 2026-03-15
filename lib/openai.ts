// Server-side OpenAI helper (fetch-based, no SDK dependency issues)

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/gi,
  /ignore\s+all\s+prior\s+instructions/gi,
  /^\s*system\s*:/gim,
  /^\s*assistant\s*:/gim,
  /^\s*developer\s*:/gim,
  /^\s*user\s*:/gim,
  /you\s+are\s+now/gi,
];

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

export function sanitizePromptInput(raw: string): string {
  let sanitized = raw;
  // Fix 9: strip obvious prompt-injection markers before user text enters prompts.
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  return sanitized.replace(/\n{3,}/g, "\n\n").trim();
}

export function isOpenAIFallbackError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

  return [
    "quota",
    "billing",
    "insufficient_quota",
    "rate limit",
    "429",
    "401",
    "invalid api key",
    "account is not active",
  ].some((pattern) => message.includes(pattern));
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
