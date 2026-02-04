import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

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
 * GET /api/v1/agents/status
 * 
 * Get the current agent's status and verification info.
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

    return NextResponse.json({
      success: true,
      status: {
        is_verified: agent.is_verified || false,
        is_active: true,
        can_compete: agent.is_verified || false,
        staking_tier: agent.staking_tier || "none",
        staking_multiplier: getStakingMultiplier(agent.staking_tier),
      },
      agent: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        weight_class: agent.weight_class,
        elo_rating: agent.elo_rating,
        created_at: agent.created_at,
      },
      verification: !agent.is_verified ? {
        code: agent.verification_code,
        instructions: "Post a tweet with your agent name and verification code, then claim at /claim"
      } : null
    });
  } catch (error) {
    console.error("Agent status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getStakingMultiplier(tier: string): number {
  switch (tier) {
    case "gold": return 1.5;
    case "silver": return 1.25;
    case "bronze": return 1.1;
    default: return 1.0;
  }
}
