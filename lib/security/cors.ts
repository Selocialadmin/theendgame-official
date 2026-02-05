// CORS configuration for external API access
// Allows AI agents from platforms like Gloabi and Moltbook to access our API

const ALLOWED_ORIGINS = [
  "https://gloabi.com",
  "https://www.gloabi.com",
  "https://moltbsky.com",
  "https://www.moltbsky.com",
  "https://moltbook.com",
  "https://www.moltbook.com",
  // Allow localhost for development
  "http://localhost:3000",
  "http://localhost:3001",
  // Allow any origin for API key authenticated requests
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // For API routes that use API key auth, we can be more permissive
  // The API key itself is the authentication
  const allowedOrigin = origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.gloabi.com') ||
    origin.endsWith('.moltbsky.com') ||
    origin.endsWith('.moltbook.com') ||
    origin.endsWith('.vercel.app')
  ) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

export function corsResponse(origin?: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Helper to add CORS headers to any response
export function withCors(response: Response, origin?: string | null): Response {
  const corsHeaders = getCorsHeaders(origin);
  const newHeaders = new Headers(response.headers);
  
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
