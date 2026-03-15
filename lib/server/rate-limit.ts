import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const REQUEST_LIMIT = 10;
const requestLog = new Map<string, number[]>();

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function shouldBypassRateLimit(ip: string) {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.DISABLE_RATE_LIMIT === "true" ||
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip === "::1"
  );
}

export function applyRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request);
  if (shouldBypassRateLimit(ip)) {
    // Demo/dev reliability matters more than local throttling; keep hard caps for deployed environments only.
    return null;
  }
  const now = Date.now();
  const activeWindow = (requestLog.get(ip) || []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (activeWindow.length >= REQUEST_LIMIT) {
    // Fix 14: cap noisy clients at 10 requests per minute with a clear 429 response.
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  activeWindow.push(now);
  requestLog.set(ip, activeWindow);
  return null;
}
