// Persistent rate limiter using Upstash Redis
// Survives serverless cold starts and works across all instances

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// In-memory fallback if Redis is not configured
const fallbackStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  // Strict limits for sensitive operations
  AUTH: { windowMs: 60000, maxRequests: 5 }, // 5 per minute
  REGISTER: { windowMs: 3600000, maxRequests: 3 }, // 3 per hour
  EMAIL_VERIFY: { windowMs: 300000, maxRequests: 5 }, // 5 per 5 minutes
  STAKING: { windowMs: 60000, maxRequests: 10 }, // 10 per minute

  // Moderate limits for game actions
  MATCH_JOIN: { windowMs: 60000, maxRequests: 20 }, // 20 per minute
  SUBMISSION: { windowMs: 1000, maxRequests: 5 }, // 5 per second (during match)

  // Relaxed limits for read operations
  API_READ: { windowMs: 60000, maxRequests: 100 }, // 100 per minute
  LEADERBOARD: { windowMs: 10000, maxRequests: 30 }, // 30 per 10 seconds
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

// Redis-backed rate limiting with sliding window
async function checkRateLimitRedis(
  r: Redis,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;
  const windowSec = Math.ceil(config.windowMs / 1000);

  // Increment and get current count atomically
  const count = await r.incr(key);

  // Set expiry on first request in window
  if (count === 1) {
    await r.expire(key, windowSec);
  }

  // Get TTL for reset time
  const ttl = await r.ttl(key);
  const resetIn = ttl > 0 ? ttl : windowSec;

  if (count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - count,
    resetIn,
  };
}

// In-memory fallback rate limiting
function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = fallbackStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + config.windowMs };
  }

  const resetIn = Math.ceil((entry.resetTime - now) / 1000);

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count++;
  fallbackStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn,
  };
}

// Main rate limit check - uses Redis if available, falls back to in-memory
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const r = getRedis();
  if (r) {
    try {
      return await checkRateLimitRedis(r, identifier, config);
    } catch {
      // Redis error - fall back to memory
      return checkRateLimitMemory(identifier, config);
    }
  }
  return checkRateLimitMemory(identifier, config);
}

// Get client identifier from request
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

// Rate limit middleware helper for API routes
export async function withRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<{ allowed: boolean; headers: Headers }> {
  const identifier = getClientIdentifier(request);
  const result = await checkRateLimit(identifier, config);

  const headers = new Headers();
  headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.resetIn.toString());

  return { allowed: result.allowed, headers };
}

// --- Email verification code helpers ---

// Store a 6-digit verification code in Redis (5 min TTL)
export async function storeVerificationCode(
  email: string,
  code: string
): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    await r.set(`verify:${email.toLowerCase()}`, code, { ex: 300 });
    return true;
  } catch {
    return false;
  }
}

// Verify a code against what's stored
export async function verifyCode(
  email: string,
  code: string
): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const stored = await r.get<string>(`verify:${email.toLowerCase()}`);
    if (!stored || stored !== code) return false;
    // Delete after successful verification (one-time use)
    await r.del(`verify:${email.toLowerCase()}`);
    return true;
  } catch {
    return false;
  }
}

// Generate a random 6-digit code
export function generateVerificationCode(): string {
  const { randomInt } = require("crypto");
  return String(randomInt(100000, 999999));
}
