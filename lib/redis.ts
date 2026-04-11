// ─────────────────────────────────────
// VOLTV — Redis Client (Upstash/local)
// Used for: rate limiting, caching,
// real-time counters, session data
// ─────────────────────────────────────

import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Disable immediately if no real Redis URL is configured — avoids the first-call
// connect timeout (~500ms) entirely.
const url = process.env.REDIS_URL ?? "";
let redisDisabled = !url || url.startsWith("redis://localhost") || url.startsWith("redis://127.");

function createRedisClient(): Redis {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    retryStrategy: () => null, // no auto-reconnect loops
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on("error", (err) => {
    if (!redisDisabled && process.env.NODE_ENV !== "test") {
      console.warn("[Redis] Unavailable — caching disabled:", err.message);
    }
    redisDisabled = true;
  });

  return redis;
}

export const redis = globalForRedis.redis ?? createRedisClient();
export function isRedisDisabled() { return redisDisabled; }

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ── Cache helpers ────────────────────────────────────────────

export async function getCache<T>(key: string): Promise<T | null> {
  if (redisDisabled) return null;
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttlSeconds = 300): Promise<void> {
  if (redisDisabled) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {}
}

export async function deleteCache(key: string): Promise<void> {
  if (redisDisabled) return;
  try {
    await redis.del(key);
  } catch {}
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (redisDisabled) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {}
}

// ── Rate limiting ────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: number;
}

export async function rateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `rl:${action}:${identifier}`;
  const now = Date.now();

  if (redisDisabled) {
    return { allowed: true, remaining: maxRequests, reset_at: now + windowSeconds * 1000 };
  }

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    const count = (results?.[0]?.[1] as number) ?? 1;
    const ttl   = (results?.[1]?.[1] as number) ?? -1;

    if (count === 1 || ttl < 0) {
      await redis.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, maxRequests - count);
    const reset_at  = now + (ttl > 0 ? ttl : windowSeconds) * 1000;

    return { allowed: count <= maxRequests, remaining, reset_at };
  } catch {
    // Redis failure → fail open (allow request)
    return { allowed: true, remaining: maxRequests, reset_at: now + windowSeconds * 1000 };
  }
}

// ── Cache key generators ─────────────────────────────────────

export const CacheKeys = {
  movie:          (id: string)          => `movie:${id}`,
  movieTmdb:      (tmdbId: number)      => `movie:tmdb:${tmdbId}`,
  trending:       (period: string)      => `trending:${period}`,
  search:         (q: string, p: number) => `search:${q}:${p}`,
  heatmap:        (userId: string)      => `heatmap:${userId}`,
  userProfile:    (username: string)    => `profile:${username}`,
  dailyDebate:                          () => `debate:today`,
  leaderboard:    (period: string)      => `leaderboard:${period}`,
  compatibility:  (a: string, b: string) => `compat:${[a,b].sort().join(":")}`,
  prediction:     (userId: string, movieId: string) => `pred:${userId}:${movieId}`,
  notifications:  (userId: string)      => `notif:${userId}`,
  voltvScore:     (movieId: string)     => `voltvscore:${movieId}`,
};

// TTL constants (seconds)
export const TTL = {
  movie:        3600,      // 1 hour
  trending:     900,       // 15 min
  search:       300,       // 5 min
  heatmap:      1800,      // 30 min
  leaderboard:  600,       // 10 min
  debate:       60,        // 1 min (live vote counts)
  compatibility:3600,      // 1 hour
  profile:      300,       // 5 min
};
