// In-memory rate limiter for serverless
// For production, use Redis (Upstash) for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  // Strict limits for sensitive operations
  AUTH: { windowMs: 60000, maxRequests: 5 }, // 5 per minute
  REGISTER: { windowMs: 3600000, maxRequests: 3 }, // 3 per hour
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

export function checkRateLimit(
  identifier: string, // IP or wallet address
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${identifier}`;
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn,
  };
}

// Get client identifier from request
export function getClientIdentifier(request: Request): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take first IP (client IP)
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  // Fallback - in production this should never happen
  return "unknown";
}

// Rate limit middleware helper for API routes
export function withRateLimit(
  request: Request,
  config: RateLimitConfig
): { allowed: boolean; headers: Headers } {
  const identifier = getClientIdentifier(request);
  const result = checkRateLimit(identifier, config);
  
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.resetIn.toString());
  
  return { allowed: result.allowed, headers };
}
