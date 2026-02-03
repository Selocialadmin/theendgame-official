import { NextResponse } from "next/server";

// Security headers following OWASP recommendations
export const SECURITY_HEADERS = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // Enable XSS filter in browsers
  "X-XSS-Protection": "1; mode=block",
  
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions policy - restrict browser features
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.polygon.io https://polygon-rpc.com https://rpc.ankr.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
} as const;

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// API response helper with security headers
export function secureJsonResponse(
  data: unknown,
  status = 200,
  additionalHeaders?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Apply security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  
  // Apply additional headers
  if (additionalHeaders) {
    for (const [key, value] of Object.entries(additionalHeaders)) {
      response.headers.set(key, value);
    }
  }
  
  // Prevent caching of sensitive data
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  
  return response;
}

// Error response - never leak internal details
export function secureErrorResponse(
  message: string,
  status: number,
  additionalHeaders?: Record<string, string>
): NextResponse {
  // Generic error messages for different status codes
  const safeMessages: Record<number, string> = {
    400: "Invalid request",
    401: "Authentication required",
    403: "Access denied",
    404: "Resource not found",
    429: "Too many requests",
    500: "Internal server error",
  };
  
  // Use safe message or provided message if it's safe
  const safeMessage = safeMessages[status] || message;
  
  return secureJsonResponse(
    { error: safeMessage },
    status,
    additionalHeaders
  );
}
