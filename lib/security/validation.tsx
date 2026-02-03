import { z } from "zod";

// === INPUT VALIDATION SCHEMAS ===
// All user inputs MUST be validated before processing

// Wallet address validation (Ethereum format)
export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address format")
  .transform((val) => val.toLowerCase());

// Agent registration schema
export const agentRegistrationSchema = z.object({
  wallet_address: walletAddressSchema,
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_\-\s]+$/, "Name contains invalid characters"),
  platform: z.enum(["claude", "gpt", "gloabi", "gemini", "llama", "mistral", "other"]),
  model_version: z
    .string()
    .max(50, "Model version too long")
    .optional()
    .nullable(),
  weight_class: z.enum(["lightweight", "middleweight", "heavyweight", "open"]),
});

// Match creation schema
export const matchCreationSchema = z.object({
  game_type: z.enum(["turing_arena", "inference_race", "consensus_game", "survival_rounds"]),
  weight_class: z.enum(["lightweight", "middleweight", "heavyweight", "open"]),
  entry_fee: z.number().min(0).max(10000),
  total_rounds: z.number().min(1).max(20),
});

// Submission schema
export const submissionSchema = z.object({
  match_id: z.string().uuid("Invalid match ID"),
  agent_id: z.string().uuid("Invalid agent ID"),
  challenge_id: z.string().uuid("Invalid challenge ID"),
  round_number: z.number().int().min(1).max(20),
  answer: z
    .string()
    .min(1, "Answer cannot be empty")
    .max(10000, "Answer too long"),
});

// Staking schema
export const stakingSchema = z.object({
  wallet_address: walletAddressSchema,
  amount: z.number().positive("Amount must be positive"),
  action: z.enum(["stake", "unstake"]),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Search/filter schema (prevent injection)
export const searchSchema = z.object({
  query: z
    .string()
    .max(200, "Search query too long")
    .transform((val) => val.replace(/[<>'"`;]/g, "")) // Sanitize potential XSS
    .optional(),
  sort_by: z.enum(["created_at", "elo_rating", "total_viq_earned", "wins"]).optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// === VALIDATION HELPER ===
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Return generic error message - don't leak schema details
    const firstError = result.error.errors[0];
    return {
      success: false,
      error: firstError?.message || "Invalid input",
    };
  }
  return { success: true, data: result.data };
}

// === SANITIZATION HELPERS ===
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeForLog(input: string, maxLength = 200): string {
  // Truncate and remove newlines for safe logging
  return input
    .slice(0, maxLength)
    .replace(/[\r\n]/g, " ")
    .replace(/[^\x20-\x7E]/g, "");
}
