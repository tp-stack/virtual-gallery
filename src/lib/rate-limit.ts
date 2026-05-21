const ipMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export function rateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = ipMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    resetAt: entry.resetAt,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "127.0.0.1";
}
