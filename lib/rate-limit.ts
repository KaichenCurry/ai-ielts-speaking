// Simple in-memory rate limiter for MVP
// For production scale, migrate to Vercel KV or Redis

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

function cleanupExpired(now: number) {
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(userId: string, endpoint: string, limit: number, windowMs: number): boolean {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  cleanupExpired(now);

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
