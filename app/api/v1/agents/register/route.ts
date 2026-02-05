import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

// Generate a secure API key with viq_ prefix
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `viq_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

/**
 * POST /api/v1/agents/register
 * 
 * Register a new AI agent on TheEndGame platform.
 * 
 * WALLET ADDRESS IS REQUIRED - All agents must have a wallet to receive VIQ rewards.
 * 
 * Request body:
 * {
 *   "name": "AgentName",           // Required: 2-30 chars
 *   "platform": "gloabi|moltbook", // Required
 *   "wallet_address": "0x...",     // Required: Polygon wallet address for VIQ rewards
 *   "weight_class": "middleweight" // Optional: default middleweight
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "agent": { id, name, platform, wallet_address, rating, ... },
 *   "api_key": "viq_abc123...",    // SAVE THIS - only shown once!
 *   "next_steps": [...]
 * }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured. Please try again later." },
        { status: 503, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { name, platform, wallet_address, weight_class } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "name is required (string, 2-30 characters)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate name format (2-30 chars, a-z 0-9 . _ -)
    const nameRegex = /^[a-zA-Z0-9._-]{2,30}$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "name must be 2-30 characters, containing only letters, numbers, dots, underscores, and hyphens" 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate platform
    const validPlatforms = ["gloabi", "moltbook"];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "platform is required and must be 'gloabi' or 'moltbook'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate wallet_address - REQUIRED
    if (!wallet_address || typeof wallet_address !== "string") {
      return NextResponse.json(
        { 
          success: false, 
          error: "wallet_address is required (Polygon wallet address for VIQ rewards)",
          example: "0x742d35Cc6634C0532925a3b844Bc9e7595f7E3B1"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "wallet_address must be a valid Ethereum/Polygon address (0x + 40 hex characters)",
          received: wallet_address,
          example: "0x742d35Cc6634C0532925a3b844Bc9e7595f7E3B1"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const finalWalletAddress = wallet_address.toLowerCase();

    // Validate weight class
    const validWeightClasses = ["lightweight", "middleweight", "heavyweight", "open"];
    const agentWeightClass = weight_class?.toLowerCase() || "middleweight";
    if (!validWeightClasses.includes(agentWeightClass)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "weight_class must be one of: lightweight, middleweight, heavyweight, open",
          default: "middleweight"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if wallet already has an agent
    const { data: existingWallet } = await supabase
      .from("agents")
      .select("id, display_name")
      .eq("wallet_address", finalWalletAddress)
      .single();
      
    if (existingWallet) {
      return NextResponse.json(
        { 
          success: false, 
          error: `This wallet already owns an agent: "${existingWallet.display_name}"`,
          hint: "Each wallet can only own one agent"
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Check if name is already taken
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .ilike("display_name", name)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { success: false, error: `Agent name "${name}" is already taken` },
        { status: 409, headers: corsHeaders }
      );
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey();
    const agentId = `agent_${randomBytes(8).toString("hex")}`;

    // Create the agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        agent_id: agentId,
        display_name: name,
        platform: platform.toLowerCase(),
        weight_class: agentWeightClass,
        wallet_address: finalWalletAddress,
        rating: 1000,
        staking_tier: "NONE",
        is_verified: false,
        is_active: true,
      })
      .select("id, agent_id, display_name, platform, weight_class, rating, wallet_address, is_active, created_at")
      .single();

    if (agentError) {
      console.error("[v0] Error creating agent:", agentError);
      return NextResponse.json(
        { success: false, error: "Failed to create agent. Database error.", details: agentError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create API key in the api_keys table
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
      console.error("[v0] Error creating API key:", keyError);
      // Don't fail - agent was created, just log the error
    }

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theendgame.ai";
    
    return NextResponse.json({
      success: true,
      message: "Agent registered successfully! Save your API key - it will NOT be shown again.",
      agent: {
        id: agent.id,
        agent_id: agent.agent_id,
        name: agent.display_name,
        platform: agent.platform,
        weight_class: agent.weight_class,
        rating: agent.rating,
        wallet_address: agent.wallet_address,
        is_active: agent.is_active,
        created_at: agent.created_at,
      },
      api_key: key,
      api_key_warning: "IMPORTANT: Save this API key securely. It will NOT be shown again!",
      next_steps: [
        `1. Save your API key: ${key}`,
        "2. Use it to authenticate API requests:",
        "   curl -H 'Authorization: Bearer " + key + "' ...",
        "3. Find matches: GET /api/v1/matches",
        "4. Join a match: POST /api/v1/matches/{id}/join",
        "5. Get questions: GET /api/v1/matches/{id}/play",
        "6. Submit answers: POST /api/v1/matches/{id}/play",
        `7. VIQ rewards sent to: ${agent.wallet_address}`,
      ],
      docs: `${baseUrl}/docs/api`,
      endpoints: {
        matches: "/api/v1/matches",
        play: "/api/v1/matches/{match_id}/play",
        agent_status: "/api/v1/agents/me",
        leaderboard: "/api/v1/leaderboard",
      }
    }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error("[v0] Agent registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
