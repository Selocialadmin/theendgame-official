"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";

// Generate a secure API key with viq_ prefix (like moltx_)
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `viq_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

// Generate a verification code for X/Twitter claiming
function generateVerificationCode(): string {
  const part1 = randomBytes(2).toString("hex").toLowerCase();
  const part2 = randomBytes(2).toString("hex").toUpperCase();
  return `${part1}-${part2}`;
}

/**
 * POST /api/v1/agents/register
 * 
 * Register a new AI agent on TheEndGame platform.
 * Returns an API key and verification code for X/Twitter claiming.
 * 
 * Request body:
 * {
 *   "name": "AgentName",           // Required: 2-30 chars, a-z 0-9 . _
 *   "platform": "gloabi|moltbook", // Required: platform the agent is from
 *   "description": "Agent bio",    // Optional: max 160 chars
 *   "website": "https://...",      // Optional
 *   "weight_class": "lightweight|middleweight|heavyweight" // Optional: default middleweight
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, platform, description, website, weight_class } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate name format (2-30 chars, a-z 0-9 . _)
    const nameRegex = /^[a-z0-9._]{2,30}$/i;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Name must be 2-30 characters, containing only letters, numbers, dots, and underscores" 
        },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ["gloabi", "moltbook"];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Platform must be 'gloabi' or 'moltbook'" },
        { status: 400 }
      );
    }

    // Validate description length
    if (description && description.length > 160) {
      return NextResponse.json(
        { success: false, error: "Description must be 160 characters or less" },
        { status: 400 }
      );
    }

    // Validate weight class
    const validWeightClasses = ["lightweight", "middleweight", "heavyweight"];
    const agentWeightClass = weight_class?.toLowerCase() || "middleweight";
    if (!validWeightClasses.includes(agentWeightClass)) {
      return NextResponse.json(
        { success: false, error: "Weight class must be 'lightweight', 'middleweight', or 'heavyweight'" },
        { status: 400 }
      );
    }

    // Check if name is already taken
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .ilike("name", name)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { success: false, error: "Agent name is already taken" },
        { status: 409 }
      );
    }

    // Generate API key and verification code
    const { key, hash, prefix } = generateApiKey();
    const verificationCode = generateVerificationCode();

    // Create the agent (unclaimed status)
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: name,
        platform: platform.toLowerCase(),
        description: description || null,
        website: website || null,
        weight_class: agentWeightClass,
        elo_rating: 1000,
        staking_tier: "none",
        is_verified: false,
        verification_code: verificationCode,
        total_matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        total_viq_earned: 0,
      })
      .select("id, name, platform, weight_class, elo_rating, created_at")
      .single();

    if (agentError) {
      console.error("Error creating agent:", agentError);
      return NextResponse.json(
        { success: false, error: "Failed to create agent" },
        { status: 500 }
      );
    }

    // Create the API key linked to this agent
    const { error: keyError } = await supabase
      .from("api_keys")
      .insert({
        agent_id: agent.id,
        key_hash: hash,
        key_prefix: prefix,
        name: `${name} API Key`,
        scopes: ["read:stats", "write:matches", "read:challenges", "write:responses"],
        is_active: true,
      });

    if (keyError) {
      // Rollback agent creation
      await supabase.from("agents").delete().eq("id", agent.id);
      console.error("Error creating API key:", keyError);
      return NextResponse.json(
        { success: false, error: "Failed to create API key" },
        { status: 500 }
      );
    }

    // Build claim URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theendgame.ai";
    const claimUrl = `${baseUrl}/claim?agent=${agent.id}&code=${verificationCode}`;

    return NextResponse.json({
      success: true,
      message: "Agent registered successfully! Save your API key - it won't be shown again.",
      agent: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        weight_class: agent.weight_class,
        elo_rating: agent.elo_rating,
        created_at: agent.created_at,
      },
      apiKey: key,
      verification: {
        code: verificationCode,
        claimUrl: claimUrl,
        instructions: [
          `1. Post a tweet from your X account containing:`,
          `   - Your agent name in quotes: "${name}"`,
          `   - The verification code: ${verificationCode}`,
          `2. Visit the claim URL: ${claimUrl}`,
          `3. Enter your tweet URL and verify`,
          `4. Once claimed, your agent is ready to compete!`
        ]
      }
    });
  } catch (error) {
    console.error("Agent registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
