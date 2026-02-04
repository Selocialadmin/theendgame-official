"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

// Verify API key and return agent info
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
 * GET /api/v1/agents/me
 * 
 * Get the current agent's full profile and stats.
 * Requires Bearer token authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", keyRecord.agent_id)
      .single();

    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    // Get recent matches
    const { data: recentMatches } = await supabase
      .from("matches")
      .select("id, game_type, status, winner_id, prize_pool, created_at, agent1_id, agent2_id")
      .or(`agent1_id.eq.${agent.id},agent2_id.eq.${agent.id}`)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calculate win rate
    const winRate = agent.total_matches > 0 
      ? ((agent.wins / agent.total_matches) * 100).toFixed(1) 
      : "0.0";

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        description: agent.description,
        website: agent.website,
        avatar_url: agent.avatar_url,
        weight_class: agent.weight_class,
        elo_rating: agent.elo_rating,
        staking_tier: agent.staking_tier,
        is_verified: agent.is_verified,
        wallet_address: agent.wallet_address,
        created_at: agent.created_at,
      },
      stats: {
        total_matches: agent.total_matches,
        wins: agent.wins,
        losses: agent.losses,
        draws: agent.draws,
        win_rate: `${winRate}%`,
        total_viq_earned: agent.total_viq_earned,
        current_streak: agent.current_streak || 0,
        best_streak: agent.best_streak || 0,
      },
      recent_matches: recentMatches?.map(m => ({
        id: m.id,
        game_type: m.game_type,
        status: m.status,
        is_winner: m.winner_id === agent.id,
        prize_pool: m.prize_pool,
        created_at: m.created_at,
      })) || [],
    });
  } catch (error) {
    console.error("Agent me error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/agents/me
 * 
 * Update the current agent's profile.
 * Requires Bearer token authentication.
 */
export async function PATCH(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired API key" },
        { status: 401 }
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
    const { description, website, avatar_url, wallet_address } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (description !== undefined) {
      if (description && description.length > 160) {
        return NextResponse.json(
          { success: false, error: "Description must be 160 characters or less" },
          { status: 400 }
        );
      }
      updates.description = description;
    }

    if (website !== undefined) {
      updates.website = website;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    if (wallet_address !== undefined) {
      // Validate Ethereum address format
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (wallet_address && !ethAddressRegex.test(wallet_address)) {
        return NextResponse.json(
          { success: false, error: "Invalid wallet address format" },
          { status: 400 }
        );
      }
      updates.wallet_address = wallet_address;
    }

    const { data: agent, error } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", keyRecord.agent_id)
      .select("id, name, description, website, avatar_url, wallet_address")
      .single();

    if (error) {
      console.error("Error updating agent:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Agent profile updated",
      agent,
    });
  } catch (error) {
    console.error("Agent me PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
