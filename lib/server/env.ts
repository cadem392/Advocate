let warnedAboutMissingOpenAIKey = false;

function resolveOpenAIApiKey() {
  return process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
}

function warnIfOpenAIKeyMissing() {
  if (warnedAboutMissingOpenAIKey || resolveOpenAIApiKey()) return;
  warnedAboutMissingOpenAIKey = true;
  // Fix 13: warn loudly at startup so heuristic fallback is never silent.
  console.warn(
    "[Advocate] OPENAI_API_KEY is missing. Document parsing will fall back to lower-quality heuristic mode until a key is configured."
  );
}

export function getOpenAIApiKey(requestApiKey?: string): string | null {
  warnIfOpenAIKeyMissing();
  return resolveOpenAIApiKey() || requestApiKey || null;
}

export function getModelServiceUrl(): string | null {
  return process.env.MODEL_SERVICE_URL || null;
}

export function isSampleMode(useSampleMode?: boolean, apiKey?: string): boolean {
  return Boolean(useSampleMode);
}

warnIfOpenAIKeyMissing();
