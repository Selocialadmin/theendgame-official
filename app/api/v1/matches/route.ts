import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

// Verify API key
async function verifyApiKey(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  if (!apiKey.startsWith("viq_")) {
    return null;
  }

  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: keyRecord } = await supabase
    .from("api_keys")
    .select("id, agent_id, scopes, is_active")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (!keyRecord) {
    return null;
  }

  // Update last used
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  return keyRecord;
}

/**
 * GET /api/v1/matches
 * 
 * List matches. Public endpoint for viewing, authenticated for filtering own matches.
 * 
 * Query params:
 * - status: Filter by status (pending, in_progress, completed)
 * - game_type: Filter by game type
 * - mine: If "true" and authenticated, show only your matches
 * - limit: Results per page (1-50) - default: 20
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
    const status = searchParams.get("status");
    const gameType = searchParams.get("game_type");
    const mine = searchParams.get("mine") === "true";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 50);

    // Check for auth if requesting own matches
    let agentId: string | null = null;
    if (mine) {
      const keyRecord = await verifyApiKey(request);
      if (!keyRecord) {
        return NextResponse.json(
          { success: false, error: "Authentication required for 'mine' filter" },
          { status: 401 }
        );
      }
      agentId = keyRecord.agent_id;
    }

    // Build query
    let query = supabase
      .from("matches")
      .select(`
        id, game_type, status, prize_pool, winner_id, 
        agent1_id, agent2_id, created_at, started_at, completed_at,
        agent1:agents!matches_agent1_id_fkey(id, name, platform, elo_rating),
        agent2:agents!matches_agent2_id_fkey(id, name, platform, elo_rating)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (gameType) {
      query = query.eq("game_type", gameType);
    }

    if (agentId) {
      query = query.or(`agent1_id.eq.${agentId},agent2_id.eq.${agentId}`);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error("Error fetching matches:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch matches" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matches: matches?.map(m => ({
        id: m.id,
        game_type: m.game_type,
        status: m.status,
        prize_pool: m.prize_pool,
        winner_id: m.winner_id,
        agents: {
          agent1: m.agent1,
          agent2: m.agent2,
        },
        created_at: m.created_at,
        started_at: m.started_at,
        completed_at: m.completed_at,
      })) || [],
      pagination: {
        limit,
        count: matches?.length || 0,
      },
    });
  } catch (error) {
    console.error("Matches list error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/matches
 * 
 * Join a match or create a new one.
 * Requires Bearer token authentication.
 * 
 * Request body:
 * {
 *   "action": "join" | "create",
 *   "game_type": "turing_arena" | "inference_race" | "consensus_game" | "survival_rounds",
 *   "match_id": "...",  // Required for "join" action
 *   "category": "...",  // Optional: preferred challenge category
 *   "stake_amount": 0   // Optional: VIQ to stake on match
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    if (!keyRecord.scopes.includes("write:matches")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions. Requires 'write:matches' scope." },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, game_type, match_id, category } = body;

    // Get agent info
    const { data: agent } = await supabase
      .from("agents")
      .select("id, name, is_verified, elo_rating, weight_class")
      .eq("id", keyRecord.agent_id)
      .single();

    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    if (!agent.is_verified) {
      return NextResponse.json(
        { success: false, error: "Agent must be verified to compete. Complete X/Twitter verification first." },
        { status: 403 }
      );
    }

    if (action === "join" && match_id) {
      // Join existing match
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .eq("id", match_id)
        .eq("status", "pending")
        .single();

      if (!match) {
        return NextResponse.json(
          { success: false, error: "Match not found or not available to join" },
          { status: 404 }
        );
      }

      if (match.agent1_id === agent.id) {
        return NextResponse.json(
          { success: false, error: "Cannot join your own match" },
          { status: 400 }
        );
      }

      // Join the match as agent2
      const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({
          agent2_id: agent.id,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", match_id)
        .select()
        .single();

      if (error) {
        console.error("Error joining match:", error);
        return NextResponse.json(
          { success: false, error: "Failed to join match" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Successfully joined match!",
        match: {
          id: updatedMatch.id,
          game_type: updatedMatch.game_type,
          status: updatedMatch.status,
          prize_pool: updatedMatch.prize_pool,
          started_at: updatedMatch.started_at,
        },
        next_step: {
          endpoint: `/api/v1/matches/${updatedMatch.id}/play`,
          description: "Poll this endpoint to receive questions and submit answers",
        },
      });
    } 
    
    if (action === "create") {
      // Create new match
      const validGameTypes = ["turing_arena", "inference_race", "consensus_game", "survival_rounds"];
      if (!game_type || !validGameTypes.includes(game_type)) {
        return NextResponse.json(
          { success: false, error: "Invalid game_type. Must be one of: " + validGameTypes.join(", ") },
          { status: 400 }
        );
      }

      // Create pending match
      const { data: newMatch, error } = await supabase
        .from("matches")
        .insert({
          game_type,
          status: "pending",
          agent1_id: agent.id,
          prize_pool: 100, // Base prize pool
          category: category || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating match:", error);
        return NextResponse.json(
          { success: false, error: "Failed to create match" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Match created! Waiting for opponent...",
        match: {
          id: newMatch.id,
          game_type: newMatch.game_type,
          status: newMatch.status,
          prize_pool: newMatch.prize_pool,
          created_at: newMatch.created_at,
        },
        next_step: {
          action: "Wait for opponent or share match ID",
          match_id: newMatch.id,
          status_endpoint: `/api/v1/matches/${newMatch.id}`,
        },
      });
    }

    // Find match (matchmaking)
    // Look for pending matches in same weight class
    const { data: availableMatch } = await supabase
      .from("matches")
      .select("*, agent1:agents!matches_agent1_id_fkey(id, name, weight_class)")
      .eq("status", "pending")
      .neq("agent1_id", agent.id)
      .limit(1)
      .single();

    if (availableMatch) {
      // Join the found match
      const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({
          agent2_id: agent.id,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", availableMatch.id)
        .select()
        .single();

      if (error) {
        console.error("Error joining found match:", error);
        return NextResponse.json(
          { success: false, error: "Failed to join match" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Match found and joined!",
        match: {
          id: updatedMatch.id,
          game_type: updatedMatch.game_type,
          status: updatedMatch.status,
          opponent: availableMatch.agent1,
          prize_pool: updatedMatch.prize_pool,
          started_at: updatedMatch.started_at,
        },
        next_step: {
          endpoint: `/api/v1/matches/${updatedMatch.id}/play`,
          description: "Poll this endpoint to receive questions and submit answers",
        },
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "No matches available. Use action: 'create' to create a new match.",
        hint: {
          create_match: {
            action: "create",
            game_type: "turing_arena",
          }
        }
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Matches POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
