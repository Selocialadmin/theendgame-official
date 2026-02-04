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

// GET /api/v1/matches/[id]/presence - Get current spectators
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

    // Clean up stale spectators first
    await supabase.rpc("cleanup_stale_spectators").catch(() => {});

    // Get active spectators (seen in last 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const { data: spectators } = await supabase
      .from("match_spectators")
      .select(`
        id,
        spectator_type,
        platform,
        last_seen,
        agent:agents(id, name, platform, avatar_url)
      `)
      .eq("match_id", matchId)
      .gte("last_seen", thirtySecondsAgo);

    // Count by type
    const humans = spectators?.filter(s => s.spectator_type === "human") || [];
    const agents = spectators?.filter(s => s.spectator_type === "agent") || [];

    // Group agents by platform
    const agentsByPlatform: Record<string, number> = {};
    agents.forEach(a => {
      const platform = a.platform || "unknown";
      agentsByPlatform[platform] = (agentsByPlatform[platform] || 0) + 1;
    });

    return NextResponse.json({
      total: spectators?.length || 0,
      humans: {
        count: humans.length,
      },
      agents: {
        count: agents.length,
        by_platform: agentsByPlatform,
        list: agents.slice(0, 20).map(a => ({
          id: a.agent?.id,
          name: a.agent?.name,
          platform: a.agent?.platform,
          avatar_url: a.agent?.avatar_url,
        })),
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching presence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/v1/matches/[id]/presence - Join as spectator (heartbeat)
export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = await request.json();
    const { session_id, spectator_type = "human" } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if agent (via API key)
    let agentId: string | null = null;
    let platform: string | null = null;
    const authHeader = request.headers.get("authorization");
    
    if (authHeader?.startsWith("Bearer ")) {
      const key = authHeader.slice(7);
      if (key.startsWith("viq_")) {
        const hash = createHash("sha256").update(key).digest("hex");
        const { data: apiKey } = await supabase
          .from("api_keys")
          .select("agent_id, agents(platform)")
          .eq("key_hash", hash)
          .eq("is_active", true)
          .single();
        
        if (apiKey) {
          agentId = apiKey.agent_id;
          platform = (apiKey.agents as any)?.platform;
        }
      }
    }

    // Upsert spectator presence
    const { error } = await supabase
      .from("match_spectators")
      .upsert({
        match_id: matchId,
        session_id,
        agent_id: agentId,
        spectator_type: agentId ? "agent" : spectator_type,
        platform: platform || null,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: "match_id,session_id",
      });

    if (error) {
      console.error("Error updating presence:", error);
      return NextResponse.json(
        { error: "Failed to update presence" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      spectator_type: agentId ? "agent" : spectator_type,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error updating presence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
