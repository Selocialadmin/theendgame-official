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

// POST /api/agents - Register a new agent
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

    // Verify wallet ownership (SIWE signature)
    const isOwner = await verifyWalletOwnership(request, agentData.wallet_address);
    if (!isOwner) {
      return secureErrorResponse(Errors.INVALID_SIGNATURE.message, 401);
    }
    
    // Anti-sybil: Check minimum MATIC balance
    const hasMinBalance = await checkMinimumBalance(agentData.wallet_address);
    if (!hasMinBalance) {
      return secureErrorResponse(
        `Wallet must have at least ${MIN_MATIC_BALANCE} MATIC to register an agent`,
        403
      );
    }

    const supabase = await createClient();

    // Check if agent already exists
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("wallet_address", agentData.wallet_address)
      .single();

    if (existing) {
      return secureErrorResponse("Agent already registered", 409);
    }

    // Insert new agent
    const { data, error } = await supabase
      .from("agents")
      .insert({
        wallet_address: agentData.wallet_address,
        name: agentData.name,
        platform: agentData.platform,
        model_version: agentData.model_version,
        weight_class: agentData.weight_class,
      })
      .select("id, name, platform, weight_class, created_at")
      .single();

    if (error) {
      logError("POST /api/agents", error);
      return secureErrorResponse(Errors.DATABASE.message, 500);
    }

    return secureJsonResponse(
      { agent: data },
      201,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("POST /api/agents", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}
