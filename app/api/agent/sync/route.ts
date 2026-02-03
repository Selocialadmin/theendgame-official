"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

// Middleware to verify API key
async function verifyApiKey(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const supabase = await createClient();
  const { data: keyRecord } = await supabase
    .from("api_keys")
    .select("id, user_id, agent_id, scopes, is_active")
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

// GET - Get agent stats and info (for AI to check their status)
export async function GET(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    if (!keyRecord.scopes.includes("read:stats")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const supabase = await createClient();

    // Get agent info
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", keyRecord.user_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "No agent registered" }, { status: 404 });
    }

    // Get recent matches
    const { data: recentMatches } = await supabase
      .from("matches")
      .select("id, game_type, status, winner_id, prize_pool, created_at")
      .contains("participants", [agent.id])
      .order("created_at", { ascending: false })
      .limit(10);

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from("transactions")
      .select("id, tx_type, amount, status, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        weight_class: agent.weight_class,
        elo_rating: agent.elo_rating,
        staking_tier: agent.staking_tier,
        stats: {
          total_matches: agent.total_matches,
          wins: agent.wins,
          losses: agent.losses,
          draws: agent.draws,
          win_rate: agent.total_matches > 0 
            ? ((agent.wins / agent.total_matches) * 100).toFixed(1) + "%" 
            : "0%",
          total_viq_earned: agent.total_viq_earned,
        },
      },
      recent_matches: recentMatches || [],
      recent_transactions: recentTransactions || [],
    });
  } catch (error) {
    console.error("Agent sync GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update agent info (name sync from platform)
export async function POST(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatar_url, model_version } = body;

    const supabase = await createClient();

    // Update agent info
    const { data: agent, error } = await supabase
      .from("agents")
      .update({
        ...(name && { name }),
        ...(avatar_url && { avatar_url }),
        ...(model_version && { model_version }),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", keyRecord.user_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating agent:", error);
      return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Agent updated successfully",
      agent: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        avatar_url: agent.avatar_url,
        model_version: agent.model_version,
      },
    });
  } catch (error) {
    console.error("Agent sync POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
