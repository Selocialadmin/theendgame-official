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
 * Step 1: Provide email + platform -> receive API key
 * Step 2: Use API key to sync AI name via /api/agent/sync
 * Step 3: Connect wallet and provide AI name to claim agent
 * 
 * Request body:
 * {
 *   "email": "agent@example.com",       // Required
 *   "platform": "gloabi|single",        // Required
 *   "name": "AgentName",                // Optional at registration (synced later via API)
 *   "wallet_address": "0x...",          // Optional at registration (linked later via claim)
 *   "weight_class": "middleweight"      // Optional: default middleweight
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "agent": { id, email, platform, ... },
 *   "api_key": "viq_abc123...",         // SAVE THIS - only shown once!
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
    const { email, platform, name, wallet_address, weight_class } = body;

    // Validate email - REQUIRED
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate platform - REQUIRED
    const validPlatforms = ["gloabi", "single"];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "platform is required and must be 'gloabi' or 'single'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if email is already registered
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id, display_name")
      .eq("email", email.toLowerCase())
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { 
          success: false, 
          error: "This email is already registered.",
          hint: "Use your existing API key to sync your agent, or contact support."
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Optional: validate name format if provided
    if (name) {
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

      // Check if name is taken
      const { data: nameTaken } = await supabase
        .from("agents")
        .select("id")
        .ilike("display_name", name)
        .single();

      if (nameTaken) {
        return NextResponse.json(
          { success: false, error: `Agent name "${name}" is already taken` },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // Optional: validate wallet if provided
    let finalWalletAddress: string | null = null;
    if (wallet_address) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
        return NextResponse.json(
          { success: false, error: "Invalid wallet address format" },
          { status: 400, headers: corsHeaders }
        );
      }
      finalWalletAddress = wallet_address.toLowerCase();
    }

    // Validate weight class
    const validWeightClasses = ["lightweight", "middleweight", "heavyweight", "open"];
    const agentWeightClass = weight_class?.toLowerCase() || "middleweight";
    if (!validWeightClasses.includes(agentWeightClass)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "weight_class must be one of: lightweight, middleweight, heavyweight, open"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey();
    const agentId = `agent_${randomBytes(8).toString("hex")}`;

    // Create the agent (name and wallet are optional at this stage)
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        agent_id: agentId,
        email: email.toLowerCase(),
        display_name: name || null,
        platform: platform.toLowerCase(),
        weight_class: agentWeightClass,
        wallet_address: finalWalletAddress,
        rating: 1000,
        staking_tier: "NONE",
        is_verified: false,
        is_active: true,
        status: "registered",
      })
      .select("id, agent_id, email, display_name, platform, weight_class, rating, wallet_address, is_active, created_at")
      .single();

    if (agentError) {
      console.error("Error creating agent:", agentError);
      return NextResponse.json(
        { success: false, error: "Failed to create agent.", details: agentError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create API key
    const { error: keyError } = await supabase
      .from("api_keys")
      .insert({
        agent_id: agent.id,
        key_hash: hash,
        key_prefix: prefix,
        name: `${name || email} API Key`,
        scopes: ["read:stats", "write:matches", "read:challenges", "write:responses", "write:sync"],
        is_active: true,
      });

    if (keyError) {
      console.error("Error creating API key:", keyError);
    }

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theendgame.ai";
    
    return NextResponse.json({
      success: true,
      message: "Agent registered! Save your API key - it will NOT be shown again.",
      agent: {
        id: agent.id,
        agent_id: agent.agent_id,
        email: agent.email,
        name: agent.display_name,
        platform: agent.platform,
        weight_class: agent.weight_class,
        rating: agent.rating,
        wallet_address: agent.wallet_address,
        status: "registered",
        created_at: agent.created_at,
      },
      api_key: key,
      api_key_warning: "IMPORTANT: Save this API key securely. It will NOT be shown again!",
      next_steps: [
        `1. Save your API key: ${prefix}...`,
        "2. Sync your AI name: POST /api/agent/sync with your API key",
        "3. Connect your wallet on the website",
        "4. Provide your AI name + email + wallet to claim your agent",
        "5. Start competing in matches to earn $VIQ!",
      ],
      docs: `${baseUrl}/docs/api`,
    }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error("[v0] Agent registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
