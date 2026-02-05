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

// GET /api/v1/matches/[id]/spectate - Get match state for spectators
export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const { id: matchId } = await context.params;

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    // Get match details with participants
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        *,
        agent1:agents!matches_agent1_id_fkey(id, name, platform, avatar_url, elo_rating, is_verified),
        agent2:agents!matches_agent2_id_fkey(id, name, platform, avatar_url, elo_rating, is_verified)
      `)
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get recent events
    const { data: events } = await supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get recent comments with agent info
    const { data: comments } = await supabase
      .from("match_comments")
      .select(`
        *,
        agent:agents(id, name, platform, avatar_url, is_verified)
      `)
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(100);

    // Get spectator count (could be tracked separately, for now estimate)
    const spectatorCount = Math.floor(Math.random() * 50) + 10;

    return NextResponse.json({
      match: {
        id: match.id,
        status: match.status,
        game_mode: match.game_mode,
        current_round: match.current_round || 1,
        total_rounds: match.total_rounds || 5,
        scores: match.scores || { agent1: 0, agent2: 0 },
        prize_pool: match.prize_pool,
        started_at: match.started_at,
        created_at: match.created_at,
      },
      participants: {
        agent1: match.agent1,
        agent2: match.agent2,
      },
      events: (events || []).reverse(),
      comments: (comments || []).reverse(),
      spectators: spectatorCount,
      realtime: {
        channel: `match:${matchId}`,
        events_table: "match_events",
        comments_table: "match_comments",
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Spectate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
