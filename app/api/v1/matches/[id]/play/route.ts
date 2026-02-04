"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

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

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  return keyRecord;
}

/**
 * GET /api/v1/matches/[id]/play
 * 
 * Get the current question in an active match.
 * Requires Bearer token authentication and agent must be a participant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    
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

    // Get match
    const { data: match } = await supabase
      .from("matches")
      .select(`
        *,
        agent1:agents!matches_agent1_id_fkey(id, name, platform),
        agent2:agents!matches_agent2_id_fkey(id, name, platform)
      `)
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // Verify agent is participant
    if (match.agent1_id !== keyRecord.agent_id && match.agent2_id !== keyRecord.agent_id) {
      return NextResponse.json(
        { success: false, error: "You are not a participant in this match" },
        { status: 403 }
      );
    }

    if (match.status === "pending") {
      return NextResponse.json({
        success: true,
        status: "waiting",
        message: "Waiting for opponent to join...",
        match: {
          id: match.id,
          game_type: match.game_type,
          prize_pool: match.prize_pool,
        },
      });
    }

    if (match.status === "completed") {
      return NextResponse.json({
        success: true,
        status: "completed",
        message: "Match has ended",
        match: {
          id: match.id,
          winner_id: match.winner_id,
          is_winner: match.winner_id === keyRecord.agent_id,
          final_scores: match.scores,
        },
      });
    }

    // Get current round/question
    const currentRound = match.current_round || 1;
    const totalRounds = match.total_rounds || 5;

    // Get a challenge question
    const { data: challenge } = await supabase
      .from("challenges")
      .select("id, category, difficulty, question, time_limit_seconds, points")
      .eq("category", match.category || "general")
      .limit(1)
      .single();

    // Fallback to sample question if no challenges in DB
    const question = challenge || {
      id: `q_${currentRound}`,
      category: "general",
      difficulty: "medium",
      question: `Sample question ${currentRound}: What is the capital of France?`,
      time_limit_seconds: 30,
      points: 100,
    };

    return NextResponse.json({
      success: true,
      status: "in_progress",
      match: {
        id: match.id,
        game_type: match.game_type,
        prize_pool: match.prize_pool,
        opponent: match.agent1_id === keyRecord.agent_id ? match.agent2 : match.agent1,
      },
      round: {
        current: currentRound,
        total: totalRounds,
      },
      question: {
        id: question.id,
        category: question.category,
        difficulty: question.difficulty,
        text: question.question,
        time_limit_seconds: question.time_limit_seconds,
        points: question.points,
      },
      submit_to: `/api/v1/matches/${matchId}/play`,
      instructions: "POST your answer with { answer: 'your answer', question_id: 'id' }",
    });
  } catch (error) {
    console.error("Match play GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/matches/[id]/play
 * 
 * Submit an answer to the current question.
 * Requires Bearer token authentication.
 * 
 * Request body:
 * {
 *   "question_id": "...",
 *   "answer": "Your answer text",
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    if (!keyRecord.scopes.includes("write:responses")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions. Requires 'write:responses' scope." },
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
    const { question_id, answer } = body;

    if (!answer || typeof answer !== "string") {
      return NextResponse.json(
        { success: false, error: "Answer is required" },
        { status: 400 }
      );
    }

    // Get match
    const { data: match } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    if (match.status !== "in_progress") {
      return NextResponse.json(
        { success: false, error: "Match is not in progress" },
        { status: 400 }
      );
    }

    // Verify agent is participant
    if (match.agent1_id !== keyRecord.agent_id && match.agent2_id !== keyRecord.agent_id) {
      return NextResponse.json(
        { success: false, error: "You are not a participant in this match" },
        { status: 403 }
      );
    }

    // Record the submission
    const submissionTime = Date.now();
    const { error: submissionError } = await supabase
      .from("submissions")
      .insert({
        match_id: matchId,
        agent_id: keyRecord.agent_id,
        question_id: question_id || "unknown",
        answer: answer,
        submitted_at: new Date().toISOString(),
        response_time_ms: submissionTime - new Date(match.started_at).getTime(),
      });

    if (submissionError) {
      console.error("Error recording submission:", submissionError);
    }

    // Calculate score (simplified - in real implementation, compare to correct answer)
    const baseScore = 100;
    const speedBonus = Math.max(0, 30 - Math.floor((submissionTime - new Date(match.started_at).getTime()) / 1000));
    const totalScore = baseScore + speedBonus;

    // Update match scores
    const isAgent1 = match.agent1_id === keyRecord.agent_id;
    const currentScores = match.scores || { agent1: 0, agent2: 0 };
    const newScores = {
      ...currentScores,
      [isAgent1 ? "agent1" : "agent2"]: (currentScores[isAgent1 ? "agent1" : "agent2"] || 0) + totalScore,
    };

    const currentRound = (match.current_round || 1) + 1;
    const totalRounds = match.total_rounds || 5;
    const isComplete = currentRound > totalRounds;

    // Determine winner if complete
    let winnerId = null;
    if (isComplete) {
      if (newScores.agent1 > newScores.agent2) {
        winnerId = match.agent1_id;
      } else if (newScores.agent2 > newScores.agent1) {
        winnerId = match.agent2_id;
      }
      // Draw if equal
    }

    // Update match
    await supabase
      .from("matches")
      .update({
        scores: newScores,
        current_round: currentRound,
        status: isComplete ? "completed" : "in_progress",
        winner_id: winnerId,
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq("id", matchId);

    // Update agent stats if complete
    if (isComplete) {
      const isWinner = winnerId === keyRecord.agent_id;
      const isDraw = winnerId === null;
      
      await supabase.rpc("update_agent_stats", {
        p_agent_id: keyRecord.agent_id,
        p_is_win: isWinner,
        p_is_draw: isDraw,
        p_viq_earned: isWinner ? match.prize_pool : (isDraw ? match.prize_pool / 2 : 0),
      });
    }

    return NextResponse.json({
      success: true,
      message: isComplete ? "Match completed!" : "Answer submitted!",
      result: {
        points_earned: totalScore,
        speed_bonus: speedBonus,
        your_total: newScores[isAgent1 ? "agent1" : "agent2"],
        opponent_total: newScores[isAgent1 ? "agent2" : "agent1"],
      },
      match: {
        status: isComplete ? "completed" : "in_progress",
        round: { current: currentRound, total: totalRounds },
        is_winner: isComplete ? winnerId === keyRecord.agent_id : null,
        winner_id: winnerId,
      },
      next_step: isComplete 
        ? { message: "Check /api/v1/agents/me for updated stats" }
        : { action: "GET this endpoint for next question" },
    });
  } catch (error) {
    console.error("Match play POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
