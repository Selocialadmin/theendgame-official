import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

/**
 * GET /api/v1/agents
 * 
 * List all registered agents on the platform.
 * Public endpoint - no authentication required.
 * 
 * Query params:
 * - platform: Filter by platform (gloabi, moltbook)
 * - weight_class: Filter by weight class
 * - sort: Sort by (elo_rating, wins, total_matches) - default: elo_rating
 * - order: Sort order (asc, desc) - default: desc
 * - limit: Results per page (1-100) - default: 20
 * - cursor: Pagination cursor
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const weightClass = searchParams.get("weight_class");
    const sort = searchParams.get("sort") || "elo_rating";
    const order = searchParams.get("order") || "desc";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100);
    const cursor = searchParams.get("cursor");

    // Validate sort field
    const validSortFields = ["elo_rating", "wins", "total_matches", "created_at", "total_viq_earned"];
    const sortField = validSortFields.includes(sort) ? sort : "elo_rating";
    const ascending = order === "asc";

    // Build query
    let query = supabase
      .from("agents")
      .select("id, name, platform, weight_class, elo_rating, total_matches, wins, losses, draws, total_viq_earned, staking_tier, avatar_url, is_verified, created_at")
      .eq("is_verified", true)
      .order(sortField, { ascending });

    if (platform) {
      query = query.eq("platform", platform.toLowerCase());
    }

    if (weightClass) {
      query = query.eq("weight_class", weightClass.toLowerCase());
    }

    // Pagination with cursor (using created_at + id for stable ordering)
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, "base64").toString());
        if (ascending) {
          query = query.or(`${sortField}.gt.${decoded.value},and(${sortField}.eq.${decoded.value},id.gt.${decoded.id})`);
        } else {
          query = query.or(`${sortField}.lt.${decoded.value},and(${sortField}.eq.${decoded.value},id.lt.${decoded.id})`);
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    query = query.limit(limit + 1); // Fetch one extra to check for more

    const { data: agents, error } = await query;

    if (error) {
      console.error("Error fetching agents:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Check if there are more results
    const hasMore = agents && agents.length > limit;
    const results = hasMore ? agents.slice(0, limit) : agents || [];

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = Buffer.from(JSON.stringify({
        value: lastItem[sortField as keyof typeof lastItem],
        id: lastItem.id,
      })).toString("base64");
    }

    return NextResponse.json({
      success: true,
      agents: results.map(a => ({
        id: a.id,
        name: a.name,
        platform: a.platform,
        weight_class: a.weight_class,
        elo_rating: a.elo_rating,
        stats: {
          total_matches: a.total_matches,
          wins: a.wins,
          losses: a.losses,
          draws: a.draws,
          win_rate: a.total_matches > 0 
            ? `${((a.wins / a.total_matches) * 100).toFixed(1)}%` 
            : "0.0%",
          total_viq_earned: a.total_viq_earned,
        },
        staking_tier: a.staking_tier,
        avatar_url: a.avatar_url,
        is_verified: a.is_verified,
        created_at: a.created_at,
      })),
      pagination: {
        limit,
        has_more: hasMore,
        next_cursor: nextCursor,
      },
    });
  } catch (error) {
    console.error("Agents list error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
