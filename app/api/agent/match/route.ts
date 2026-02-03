"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

// Verify API key middleware
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

// GET - Get available matches to join
export async function GET(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get("game_type");
    const weightClass = searchParams.get("weight_class");

    const supabase = await createClient();

    // Get agent's weight class
    const { data: agent } = await supabase
      .from("agents")
      .select("id, weight_class")
      .eq("user_id", keyRecord.user_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "No agent registered" }, { status: 404 });
    }

    // Find pending matches
    let query = supabase
      .from("matches")
      .select("id, game_type, weight_class, participants, prize_pool, entry_fee, total_rounds, created_at")
      .eq("status", "pending")
      .eq("weight_class", weightClass || agent.weight_class);

    if (gameType) {
      query = query.eq("game_type", gameType);
    }

    const { data: matches } = await query.order("created_at", { ascending: false }).limit(20);

    // Filter out matches agent is already in
    const availableMatches = matches?.filter(
      (m) => !m.participants?.includes(agent.id)
    ) || [];

    return NextResponse.json({
      agent_id: agent.id,
      weight_class: agent.weight_class,
      available_matches: availableMatches.map((m) => ({
        id: m.id,
        game_type: m.game_type,
        weight_class: m.weight_class,
        current_participants: m.participants?.length || 0,
        prize_pool: m.prize_pool,
        entry_fee: m.entry_fee,
        total_rounds: m.total_rounds,
        created_at: m.created_at,
      })),
    });
  } catch (error) {
    console.error("Match GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Join a match or create a new one
export async function POST(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    if (!keyRecord.scopes.includes("write:matches")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { action, match_id, game_type, weight_class } = body;

    const supabase = await createClient();

    // Get agent
    const { data: agent } = await supabase
      .from("agents")
      .select("id, weight_class, staking_tier")
      .eq("user_id", keyRecord.user_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "No agent registered" }, { status: 404 });
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
        return NextResponse.json({ error: "Match not found or not available" }, { status: 404 });
      }

      if (match.weight_class !== agent.weight_class && match.weight_class !== "open") {
        return NextResponse.json({ error: "Weight class mismatch" }, { status: 400 });
      }

      if (match.participants?.includes(agent.id)) {
        return NextResponse.json({ error: "Already in this match" }, { status: 400 });
      }

      // Add agent to participants
      const updatedParticipants = [...(match.participants || []), agent.id];
      
      const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({ participants: updatedParticipants })
        .eq("id", match_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "Failed to join match" }, { status: 500 });
      }

      return NextResponse.json({
        message: "Successfully joined match",
        match: {
          id: updatedMatch.id,
          game_type: updatedMatch.game_type,
          status: updatedMatch.status,
          participants: updatedMatch.participants?.length,
        },
      });
    } else if (action === "create") {
      // Create new match
      const { data: newMatch, error } = await supabase
        .from("matches")
        .insert({
          game_type: game_type || "turing_arena",
          weight_class: weight_class || agent.weight_class,
          status: "pending",
          participants: [agent.id],
          total_rounds: game_type === "inference_race" ? 10 : 5,
          prize_pool: 0,
          entry_fee: 0,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
      }

      return NextResponse.json({
        message: "Match created successfully",
        match: {
          id: newMatch.id,
          game_type: newMatch.game_type,
          weight_class: newMatch.weight_class,
          status: newMatch.status,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'join' or 'create'" }, { status: 400 });
  } catch (error) {
    console.error("Match POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
