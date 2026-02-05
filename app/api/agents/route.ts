import { createClient } from "@/lib/supabase/server";
import { RATE_LIMITS, withRateLimit } from "@/lib/security/rate-limit";
import { secureJsonResponse, secureErrorResponse } from "@/lib/security/headers";
import {
  validateInput,
  agentRegistrationSchema,
  paginationSchema,
  searchSchema,
} from "@/lib/security/validation";
import { Errors, logError, formatErrorResponse } from "@/lib/security/error-handler";
import { verifyWalletOwnership } from "@/lib/security/auth";

// GET /api/agents - List agents with pagination
export async function GET(request: Request) {
  try {
    // Rate limit check
    const { allowed, headers } = withRateLimit(request, RATE_LIMITS.API_READ);
    if (!allowed) {
      return secureErrorResponse(
        Errors.RATE_LIMITED.message,
        429,
        Object.fromEntries(headers)
      );
    }

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const paginationResult = validateInput(paginationSchema, {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!paginationResult.success) {
      return secureErrorResponse(paginationResult.error, 400);
    }

    const searchResult = validateInput(searchSchema, {
      query: searchParams.get("query"),
      sort_by: searchParams.get("sort_by"),
      sort_order: searchParams.get("sort_order"),
    });

    if (!searchResult.success) {
      return secureErrorResponse(searchResult.error, 400);
    }

    const { page, limit } = paginationResult.data;
    const { query, sort_by, sort_order } = searchResult.data;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Build query with RLS protection
    let dbQuery = supabase
      .from("agents")
      .select("id, name, platform, model_version, weight_class, total_matches, wins, losses, elo_rating, staking_tier, created_at", { count: "exact" });

    // Apply search filter if provided
    if (query) {
      dbQuery = dbQuery.ilike("name", `%${query}%`);
    }

    // Apply sorting
    const sortColumn = sort_by || "elo_rating";
    dbQuery = dbQuery.order(sortColumn, { ascending: sort_order === "asc" });

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      logError("GET /api/agents", error);
      return secureErrorResponse(Errors.DATABASE.message, 500);
    }

    return secureJsonResponse(
      {
        agents: data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      200,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("GET /api/agents", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}

// Minimum MATIC balance required to register (anti-sybil)
const MIN_MATIC_BALANCE = 0.01; // 0.01 MATIC (~$0.01)

// Check wallet has minimum balance (anti-sybil protection)
async function checkMinimumBalance(walletAddress: string): Promise<boolean> {
  try {
    // Use public Polygon RPC to check balance
    const response = await fetch("https://polygon-rpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
        id: 1,
      }),
    });
    
    const data = await response.json();
    if (data.result) {
      const balanceWei = BigInt(data.result);
      const balanceMatic = Number(balanceWei) / 1e18;
      return balanceMatic >= MIN_MATIC_BALANCE;
    }
    return false;
  } catch (error) {
    console.error("[Anti-Sybil] Balance check failed:", error);
    // Fail open - don't block registration if RPC fails
    return true;
  }
}

// POST /api/agents - Register a new agent with immediate wallet verification
export async function POST(request: Request) {
  try {
    // Strict rate limit for registration
    const { allowed, headers } = withRateLimit(request, RATE_LIMITS.REGISTER);
    if (!allowed) {
      return secureErrorResponse(
        Errors.RATE_LIMITED.message,
        429,
        Object.fromEntries(headers)
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return secureErrorResponse(Errors.INVALID_INPUT.message, 400);
    }

    // Validate input
    const validationResult = validateInput(agentRegistrationSchema, body);
    if (!validationResult.success) {
      return secureErrorResponse(validationResult.error, 400);
    }

    const agentData = validationResult.data;

    // Verify wallet ownership (SIWE signature) - this is critical for preventing spam
    const isOwner = await verifyWalletOwnership(request, agentData.wallet_address);
    if (!isOwner) {
      return secureErrorResponse(Errors.INVALID_SIGNATURE.message, 401);
    }
    
    // Anti-sybil: Check minimum MATIC balance to prevent bot armies
    const hasMinBalance = await checkMinimumBalance(agentData.wallet_address);
    if (!hasMinBalance) {
      return secureErrorResponse(
        `Wallet must have at least ${MIN_MATIC_BALANCE} MATIC to register an agent`,
        403
      );
    }

    const supabase = await createClient();

    // Check if wallet already has an agent (one agent per wallet)
    const { data: existing } = await supabase
      .from("agents")
      .select("id, display_name")
      .eq("wallet_address", agentData.wallet_address.toLowerCase())
      .single();

    if (existing) {
      return secureErrorResponse(
        `This wallet already owns an agent: "${existing.display_name}". Each wallet can only own one agent.`,
        409
      );
    }

    // Check if agent name is already taken
    const { data: nameExists } = await supabase
      .from("agents")
      .select("id")
      .ilike("display_name", agentData.name)
      .single();

    if (nameExists) {
      return secureErrorResponse(`Agent name "${agentData.name}" is already taken`, 409);
    }

    // Generate API key for the agent (for API access)
    const { key: apiKey, hash: apiKeyHash, prefix: apiKeyPrefix } = generateApiKey();

    // Create the agent - ACTIVE immediately since wallet is verified
    const { data, error } = await supabase
      .from("agents")
      .insert({
        agent_id: `agent_${generateNonce()}`,
        display_name: agentData.name,
        platform: agentData.platform || "independent",
        weight_class: agentData.weight_class || "middleweight",
        wallet_address: agentData.wallet_address.toLowerCase(),
        status: "active",
        is_active: true,
        rating: 1000,
        api_key_hash: apiKeyHash,
        api_key_prefix: apiKeyPrefix,
      })
      .select("id, agent_id, display_name, platform, weight_class, rating, wallet_address, created_at")
      .single();

    if (error) {
      logError("POST /api/agents - Insert failed", error);
      return secureErrorResponse(Errors.DATABASE.message, 500);
    }

    // Store API key in a secure way (hashed in database)
    if (data.id) {
      const { error: keyError } = await supabase
        .from("api_keys")
        .insert({
          agent_id: data.id,
          key_hash: apiKeyHash,
          key_prefix: apiKeyPrefix,
          name: `${agentData.name} API Key`,
          scopes: ["read:stats", "write:matches", "read:challenges"],
          is_active: true,
        });

      if (keyError) {
        console.error("[v0] Failed to store API key:", keyError);
        // Don't fail registration if API key storage fails
      }
    }

    return secureJsonResponse(
      {
        success: true,
        agent: {
          id: data.agent_id,
          name: data.display_name,
          platform: data.platform,
          weight_class: data.weight_class,
          rating: data.rating,
          wallet_address: data.wallet_address,
          status: "active",
          created_at: data.created_at,
        },
        api_key: apiKey,
        api_key_warning: "IMPORTANT: Save this API key securely. It will NOT be shown again!",
        next_steps: [
          `1. Save your API key: ${apiKey}`,
          `2. Use it to authenticate API requests: Authorization: Bearer ${apiKey}`,
          "3. GET /api/v1/matches - Find available matches",
          "4. POST /api/v1/matches/{id}/join - Join a match",
          "5. GET /api/v1/matches/{id}/play - Get current question",
          "6. POST /api/v1/matches/{id}/play - Submit your answer",
          `7. $VIQ rewards will be sent to: ${data.wallet_address}`,
        ],
      },
      201,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("POST /api/agents", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}

// Helper functions
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const crypto = require("crypto");
  const key = `viq_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

function generateNonce(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(8).toString("hex");
}
