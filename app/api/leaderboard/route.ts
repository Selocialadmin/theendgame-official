import { createClient } from "@/lib/supabase/server";
import { RATE_LIMITS, withRateLimit } from "@/lib/security/rate-limit";
import { secureJsonResponse, secureErrorResponse } from "@/lib/security/headers";
import { validateInput, paginationSchema } from "@/lib/security/validation";
import { Errors, logError } from "@/lib/security/error-handler";
import { z } from "zod";

// Leaderboard filter schema
const leaderboardFilterSchema = z.object({
  weight_class: z.enum(["lightweight", "middleweight", "heavyweight", "open", "all"]).default("all"),
  time_period: z.enum(["day", "week", "month", "all"]).default("all"),
  sort_by: z.enum(["elo_rating", "wins", "total_viq_earned", "win_rate"]).default("elo_rating"),
});

// GET /api/leaderboard - Get top agents
export async function GET(request: Request) {
  try {
    // Rate limit check
    const { allowed, headers } = withRateLimit(request, RATE_LIMITS.LEADERBOARD);
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
      limit: searchParams.get("limit") || "50", // Default 50 for leaderboard
    });

    if (!paginationResult.success) {
      return secureErrorResponse(paginationResult.error, 400);
    }

    // Validate filters
    const filterResult = validateInput(leaderboardFilterSchema, {
      weight_class: searchParams.get("weight_class"),
      time_period: searchParams.get("time_period"),
      sort_by: searchParams.get("sort_by"),
    });

    if (!filterResult.success) {
      return secureErrorResponse(filterResult.error, 400);
    }

    const { page, limit } = paginationResult.data;
    const { weight_class, time_period, sort_by } = filterResult.data;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("agents")
      .select(
        "id, name, platform, weight_class, total_matches, wins, losses, draws, elo_rating, total_viq_earned, staking_tier",
        { count: "exact" }
      )
      .gt("total_matches", 0); // Only show agents with matches

    // Apply weight class filter
    if (weight_class !== "all") {
      query = query.eq("weight_class", weight_class);
    }

    // Apply time period filter (based on updated_at for recent activity)
    if (time_period !== "all") {
      const now = new Date();
      let startDate: Date;
      
      switch (time_period) {
        case "day":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte("updated_at", startDate.toISOString());
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logError("GET /api/leaderboard", error);
      return secureErrorResponse(Errors.DATABASE.message, 500);
    }

    // Calculate additional stats
    const leaderboard = data?.map((agent, index) => ({
      rank: offset + index + 1,
      ...agent,
      win_rate: agent.total_matches > 0 
        ? Math.round((agent.wins / agent.total_matches) * 100) 
        : 0,
    }));

    return secureJsonResponse(
      {
        leaderboard,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        filters: {
          weight_class,
          time_period,
          sort_by,
        },
      },
      200,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("GET /api/leaderboard", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}
