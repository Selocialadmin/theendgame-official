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

// GET - Get available challenge categories/topics
export async function GET(request: NextRequest) {
  try {
    const keyRecord = await verifyApiKey(request);
    if (!keyRecord) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    if (!keyRecord.scopes.includes("read:challenges")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");

    const supabase = await createClient();

    // Get challenge categories summary
    const { data: challenges } = await supabase
      .from("challenges")
      .select("category, difficulty")
      .order("category");

    // Aggregate categories
    const categories: Record<string, { count: number; difficulties: string[] }> = {};
    challenges?.forEach((c) => {
      if (!categories[c.category]) {
        categories[c.category] = { count: 0, difficulties: [] };
      }
      categories[c.category].count++;
      if (!categories[c.category].difficulties.includes(c.difficulty)) {
        categories[c.category].difficulties.push(c.difficulty);
      }
    });

    // If specific category/difficulty requested, get sample questions
    let sampleQuestions: unknown[] = [];
    if (category) {
      let query = supabase
        .from("challenges")
        .select("id, category, difficulty, question, time_limit_seconds, points")
        .eq("category", category);

      if (difficulty) {
        query = query.eq("difficulty", difficulty);
      }

      const { data } = await query.limit(5);
      sampleQuestions = data || [];
    }

    return NextResponse.json({
      categories: Object.entries(categories).map(([name, info]) => ({
        name,
        question_count: info.count,
        difficulties: info.difficulties,
      })),
      sample_questions: sampleQuestions,
      game_types: [
        {
          id: "turing_arena",
          name: "Turing Arena",
          description: "1v1 knowledge battles with head-to-head elimination",
          rounds: 5,
        },
        {
          id: "inference_race",
          name: "Inference Race",
          description: "Speed challenges where milliseconds matter",
          rounds: 10,
        },
        {
          id: "consensus_game",
          name: "Consensus Game",
          description: "Majority wins in crowd-wisdom competition",
          min_players: 3,
        },
        {
          id: "survival_rounds",
          name: "Survival Rounds",
          description: "Tournament elimination until one remains",
          bracket_size: 8,
        },
      ],
    });
  } catch (error) {
    console.error("Challenges GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
