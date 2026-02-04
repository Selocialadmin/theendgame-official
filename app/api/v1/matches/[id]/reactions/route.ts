import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

// GET /api/v1/matches/[id]/reactions - Get round reactions
export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const { id: matchId } = await context.params;
  const { searchParams } = new URL(request.url);
  const round = searchParams.get("round");

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    let query = supabase
      .from("round_reactions")
      .select(`
        id,
        round_number,
        reaction,
        target_agent_id,
        created_at,
        agent:agents!round_reactions_agent_id_fkey(id, name, platform, avatar_url),
        target:agents!round_reactions_target_agent_id_fkey(id, name)
      `)
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });

    if (round) {
      query = query.eq("round_number", parseInt(round));
    }

    const { data: reactions, error } = await query.limit(100);

    if (error) {
      console.error("Error fetching reactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch reactions" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Aggregate by round
    const byRound: Record<number, { thumbs_up: number; thumbs_down: number; reactions: any[] }> = {};
    
    reactions?.forEach(r => {
      if (!byRound[r.round_number]) {
        byRound[r.round_number] = { thumbs_up: 0, thumbs_down: 0, reactions: [] };
      }
      if (r.reaction === "thumbs_up") byRound[r.round_number].thumbs_up++;
      if (r.reaction === "thumbs_down") byRound[r.round_number].thumbs_down++;
      byRound[r.round_number].reactions.push(r);
    });

    return NextResponse.json({
      reactions: reactions || [],
      by_round: byRound,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/v1/matches/[id]/reactions - React to a round
export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const { id: matchId } = await context.params;

  try {
    // Verify API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "API key required. Use: Authorization: Bearer viq_xxx" },
        { status: 401, headers: corsHeaders }
      );
    }

    const key = authHeader.slice(7);
    if (!key.startsWith("viq_")) {
      return NextResponse.json(
        { error: "Invalid API key format" },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    // Verify key and get agent
    const hash = createHash("sha256").update(key).digest("hex");
    const { data: apiKey } = await supabase
      .from("api_keys")
      .select("agent_id")
      .eq("key_hash", hash)
      .eq("is_active", true)
      .single();

    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid or inactive API key" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { round_number, reaction, target_agent_id } = body;

    // Validate
    if (!round_number || typeof round_number !== "number") {
      return NextResponse.json(
        { error: "round_number is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!reaction || !["thumbs_up", "thumbs_down"].includes(reaction)) {
      return NextResponse.json(
        { error: "reaction must be 'thumbs_up' or 'thumbs_down'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check match exists
    const { data: match } = await supabase
      .from("matches")
      .select("id, current_round")
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Upsert reaction (one per agent per round)
    const { data: reactionData, error } = await supabase
      .from("round_reactions")
      .upsert({
        match_id: matchId,
        round_number,
        agent_id: apiKey.agent_id,
        reaction,
        target_agent_id: target_agent_id || null,
      }, {
        onConflict: "match_id,round_number,agent_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating reaction:", error);
      return NextResponse.json(
        { error: "Failed to create reaction" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      reaction: reactionData,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error creating reaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
