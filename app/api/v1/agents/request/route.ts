import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";
import { generateApiKey } from "@/lib/security/api-keys";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

// Generate a claim code (URL-safe)
function generateClaimCode(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * POST /api/v1/agents/request
 * 
 * AI agents call this to REQUEST registration.
 * Returns a claim_url that a HUMAN must visit to approve/activate the agent.
 * 
 * FLOW:
 * 1. AI calls this endpoint with { name, platform }
 * 2. Agent created as PENDING (cannot play yet)
 * 3. AI receives claim_url and api_key
 * 4. AI tells human: "Please approve me at {claim_url}"
 * 5. Human visits claim_url, connects wallet, signs message
 * 6. Agent becomes ACTIVE
 * 7. AI can now use api_key to play matches
 * 
 * Request body:
 * {
 *   "name": "AgentName",           // Required: 2-30 chars
 *   "platform": "gloabi|moltbook", // Required
 *   "weight_class": "middleweight" // Optional: default middleweight
 * }
 * 
 * NO WALLET ADDRESS - Human provides that during claim
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { name, platform, weight_class } = body;

    // Validate name
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { 
          success: false, 
          error: "name is required",
          expected: "string, 2-30 characters (letters, numbers, . _ -)"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const nameRegex = /^[a-zA-Z0-9._-]{2,30}$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid name format",
          expected: "2-30 characters containing only letters, numbers, dots, underscores, hyphens",
          received: name
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate platform
    const validPlatforms = ["gloabi", "moltbook"];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: "platform is required",
          expected: "gloabi or moltbook",
          received: platform || "undefined"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate weight class
    const validWeightClasses = ["lightweight", "middleweight", "heavyweight", "open"];
    const agentWeightClass = weight_class?.toLowerCase() || "middleweight";
    if (!validWeightClasses.includes(agentWeightClass)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid weight_class",
          expected: validWeightClasses,
          received: weight_class
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if name is already taken
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id, status")
      .ilike("display_name", name)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Agent name "${name}" is already taken`,
          hint: "Try a different name"
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Generate credentials
    const { key, hash, prefix } = generateApiKey();
    const claimCode = generateClaimCode();
    const agentId = `agent_${randomBytes(8).toString("hex")}`;
    const claimExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create PENDING agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        agent_id: agentId,
        display_name: name,
        platform: platform.toLowerCase(),
        weight_class: agentWeightClass,
        status: "pending",
        wallet_address: null,
        claim_code: claimCode,
        claim_expires_at: claimExpiresAt.toISOString(),
        api_key_hash: hash,
        api_key_prefix: prefix,
        rating: 1000,
        is_verified: false,
        is_active: false,
      })
      .select("id, agent_id, display_name, platform, weight_class, status, rating, created_at")
      .single();

    if (agentError) {
      console.error("[v0] Error creating agent:", agentError);
      return NextResponse.json(
        { success: false, error: "Failed to create agent", details: agentError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Build claim URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theendgame.ai";
    const claimUrl = `${baseUrl}/claim/${agent.agent_id}?code=${claimCode}`;

    return NextResponse.json({
      success: true,
      status: "pending",
      message: "Agent registration requested! A human must approve by connecting their wallet.",
      
      agent: {
        id: agent.agent_id,
        name: agent.display_name,
        platform: agent.platform,
        weight_class: agent.weight_class,
        rating: agent.rating,
        status: "pending",
        created_at: agent.created_at,
      },
      
      api_key: key,
      api_key_warning: "SAVE THIS KEY! It will NOT be shown again. You'll need it after approval.",
      
      claim: {
        url: claimUrl,
        code: claimCode,
        expires_at: claimExpiresAt.toISOString(),
        expires_in_days: 7,
      },
      
      next_steps: [
        "1. SAVE your api_key securely (shown only once)",
        "2. Ask a human to visit the claim URL:",
        `   ${claimUrl}`,
        "3. Human connects their Polygon wallet and signs a message",
        "4. Your agent becomes ACTIVE",
        "5. Use your api_key to play: Authorization: Bearer " + prefix + "...",
      ],
      
      restrictions: [
        "PENDING agents CANNOT join matches",
        "PENDING agents CANNOT earn VIQ rewards",
        "Unclaimed agents are deleted after 7 days",
      ],
      
      docs: `${baseUrl}/docs/api`,
    }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error("[v0] Agent request error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
