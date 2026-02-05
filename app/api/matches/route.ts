import { createClient } from "@/lib/supabase/server";
import { RATE_LIMITS, withRateLimit } from "@/lib/security/rate-limit";
import { secureJsonResponse, secureErrorResponse } from "@/lib/security/headers";
import {
  validateInput,
  matchCreationSchema,
  paginationSchema,
} from "@/lib/security/validation";
import { Errors, logError } from "@/lib/security/error-handler";

// GET /api/matches - List matches with filtering
export async function GET(request: Request) {
  try {
    // Rate limit check
    const { allowed, headers } = await withRateLimit(request, RATE_LIMITS.API_READ);
    if (!allowed) {
      return secureErrorResponse(
        Errors.RATE_LIMITED.message,
        429,
        Object.fromEntries(headers)
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Validate pagination
    const paginationResult = validateInput(paginationSchema, {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!paginationResult.success) {
      return secureErrorResponse(paginationResult.error, 400);
    }

    const { page, limit } = paginationResult.data;
    const offset = (page - 1) * limit;

    // Filter params
    const status = searchParams.get("status");
    const gameType = searchParams.get("game_type");
    const weightClass = searchParams.get("weight_class");

    // Validate filter values
    const validStatuses = ["pending", "active", "completed", "cancelled"];
    const validGameTypes = ["turing_arena", "inference_race", "consensus_game", "survival_rounds"];
    const validWeightClasses = ["lightweight", "middleweight", "heavyweight", "open"];

    if (status && !validStatuses.includes(status)) {
      return secureErrorResponse("Invalid status filter", 400);
    }
    if (gameType && !validGameTypes.includes(gameType)) {
      return secureErrorResponse("Invalid game_type filter", 400);
    }
    if (weightClass && !validWeightClasses.includes(weightClass)) {
      return secureErrorResponse("Invalid weight_class filter", 400);
    }

    const supabase = await createClient();

    if (!supabase) {
      return secureJsonResponse({
        matches: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      }, 200, Object.fromEntries(headers));
    }

    let query = supabase
      .from("matches")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) query = query.eq("status", status);
    if (gameType) query = query.eq("game_type", gameType);
    if (weightClass) query = query.eq("weight_class", weightClass);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logError("GET /api/matches", error);
      return secureErrorResponse(Errors.DATABASE.message, 500);
    }

    return secureJsonResponse(
      {
        matches: data,
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
    logError("GET /api/matches", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}

// POST /api/matches - Create a new match
export async function POST(request: Request) {
  try {
    // Rate limit check
    const { allowed, headers } = await withRateLimit(request, RATE_LIMITS.MATCH_JOIN);
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
    const validationResult = validateInput(matchCreationSchema, body);
    if (!validationResult.success) {
      return secureErrorResponse(validationResult.error, 400);
    }

    const matchData = validationResult.data;

    const supabase = await createClient();

    if (!supabase) {
      return secureErrorResponse("Database not configured", 503);
    }

    // Create the match
    const { data, error } = await supabase
      .from("matches")
      .insert({
        game_type: matchData.game_type,
        weight_class: matchData.weight_class,
        entry_fee: matchData.entry_fee,
        total_rounds: matchData.total_rounds,
        participants: [],
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      logError("POST /api/matches", error);
      return secureErrorResponse(Errors.DATABASE.message, 500);
    }

    return secureJsonResponse(
      { match: data },
      201,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("POST /api/matches", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}
