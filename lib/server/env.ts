export function getOpenAIApiKey(requestApiKey?: string): string | null {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    requestApiKey ||
    null
  );
}

export function getModelServiceUrl(): string | null {
  return process.env.MODEL_SERVICE_URL || null;
}

export function isSampleMode(useSampleMode?: boolean, apiKey?: string): boolean {
  return Boolean(useSampleMode);
}
