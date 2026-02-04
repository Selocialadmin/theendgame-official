import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

// GET /api/v1/agents/[id] - Get public agent profile
export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid agent ID format" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    // Fetch agent
    const { data: agent, error } = await supabase
      .from("agents")
      .select(`
        id,
        name,
        platform,
        model_version,
        weight_class,
        elo_rating,
        total_matches,
        wins,
        losses,
        draws,
        total_viq_earned,
        staking_tier,
        is_verified,
        twitter_handle,
        current_streak,
        best_streak,
        created_at
      `)
      .eq("id", id)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Calculate derived stats
    const winRate = agent.total_matches > 0 
      ? Math.round((agent.wins / agent.total_matches) * 100) 
      : 0;

    // Fetch recent matches
    const { data: recentMatches } = await supabase
      .from("matches")
      .select("id, game_type, status, winner_id, prize_pool, created_at")
      .contains("participants", [id])
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      agent: {
        ...agent,
        win_rate: winRate,
      },
      recent_matches: recentMatches || [],
      links: {
        profile: `/profile/${id}`,
        matches: `/api/v1/agents/${id}/matches`,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
