import { sanitizeForLog } from "./validation";

// === SECURE ERROR HANDLING ===
// Never leak internal details to clients

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined errors (don't expose internal details)
export const Errors = {
  // Authentication
  UNAUTHORIZED: new AppError("Authentication required", 401, "UNAUTHORIZED"),
  FORBIDDEN: new AppError("Access denied", 403, "FORBIDDEN"),
  INVALID_SIGNATURE: new AppError("Invalid signature", 401, "INVALID_SIGNATURE"),
  SESSION_EXPIRED: new AppError("Session expired", 401, "SESSION_EXPIRED"),

  // Validation
  INVALID_INPUT: new AppError("Invalid input", 400, "INVALID_INPUT"),
  INVALID_ADDRESS: new AppError("Invalid wallet address", 400, "INVALID_ADDRESS"),
  MISSING_PARAMS: new AppError("Missing required parameters", 400, "MISSING_PARAMS"),

  // Rate limiting
  RATE_LIMITED: new AppError("Too many requests", 429, "RATE_LIMITED"),

  // Resources
  NOT_FOUND: new AppError("Resource not found", 404, "NOT_FOUND"),
  AGENT_NOT_FOUND: new AppError("Agent not found", 404, "AGENT_NOT_FOUND"),
  MATCH_NOT_FOUND: new AppError("Match not found", 404, "MATCH_NOT_FOUND"),

  // Game errors
  MATCH_FULL: new AppError("Match is full", 400, "MATCH_FULL"),
  MATCH_STARTED: new AppError("Match already started", 400, "MATCH_STARTED"),
  MATCH_ENDED: new AppError("Match has ended", 400, "MATCH_ENDED"),
  INSUFFICIENT_BALANCE: new AppError("Insufficient balance", 400, "INSUFFICIENT_BALANCE"),
  ALREADY_SUBMITTED: new AppError("Already submitted for this round", 400, "ALREADY_SUBMITTED"),

  // Server errors (generic message)
  INTERNAL: new AppError("Internal server error", 500, "INTERNAL_ERROR"),
  DATABASE: new AppError("Database error", 500, "DATABASE_ERROR"),
  EXTERNAL_SERVICE: new AppError("External service unavailable", 503, "SERVICE_UNAVAILABLE"),
} as const;

// Error response formatter
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
  };
}

export function formatErrorResponse(error: AppError): ErrorResponse {
  return {
    error: {
      message: error.message,
      code: error.code,
    },
  };
}

// Safe error logging (no sensitive data)
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  
  let errorMessage: string;
  let errorStack: string | undefined;
  
  if (error instanceof Error) {
    errorMessage = sanitizeForLog(error.message);
    errorStack = error.stack;
  } else if (typeof error === "string") {
    errorMessage = sanitizeForLog(error);
  } else {
    errorMessage = "Unknown error";
  }

  // Log structure for aggregation/monitoring
  const logEntry = {
    timestamp,
    context,
    message: errorMessage,
    ...(additionalInfo && {
      // Sanitize additional info
      info: Object.fromEntries(
        Object.entries(additionalInfo).map(([k, v]) => [
          k,
          typeof v === "string" ? sanitizeForLog(v) : v,
        ])
      ),
    }),
  };

  // In development, include stack trace
  if (process.env.NODE_ENV === "development" && errorStack) {
    console.error("[ERROR]", JSON.stringify(logEntry, null, 2));
    console.error("[STACK]", errorStack);
  } else {
    console.error("[ERROR]", JSON.stringify(logEntry));
  }
}

// Convert unknown errors to AppError
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Log the original error internally
  logError("normalizeError", error);

  // Return generic error to client
  return Errors.INTERNAL;
}
