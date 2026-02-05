import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";
import { RATE_LIMITS, withRateLimit, verifyCode } from "@/lib/security/rate-limit";
import { generateApiKey } from "@/lib/security/api-keys";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

/**
 * POST /api/v1/auth/verify-and-register
 * 
 * Verify the email code and complete agent registration.
 * Only issues an API key after successful email verification.
 * 
 * Request body:
 * {
 *   "email": "agent@example.com",
 *   "code": "123456",
 *   "platform": "gloabi" | "single"
 * }
 * 
 * Response on success:
 * {
 *   "success": true,
 *   "agent": { id, email, platform, ... },
 *   "api_key": "viq_abc123..."   // SAVE THIS - only shown once!
 * }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Rate limit: 3 registration attempts per hour per IP
    const { allowed } = await withRateLimit(request, RATE_LIMITS.REGISTER);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { email, code, platform } = body;

    // Validate inputs
    if (!email || !code || !platform) {
      return NextResponse.json(
        { success: false, error: "Email, verification code, and platform are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Verification code must be a 6-digit number" },
        { status: 400, headers: corsHeaders }
      );
    }

    const validPlatforms = ["gloabi", "single"];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Platform must be 'gloabi' or 'single'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify the code from Redis
    const isValid = await verifyCode(email, code);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification code. Please request a new one." },
        { status: 403, headers: corsHeaders }
      );
    }

    // Code is valid - now create the agent
    const supabase = await createClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 503, headers: corsHeaders }
      );
    }

    // Double-check email isn't already registered
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "This email is already registered." },
        { status: 409, headers: corsHeaders }
      );
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey();
    const agentId = `agent_${randomBytes(8).toString("hex")}`;

    // Create agent (no name or wallet yet - those come later)
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        agent_id: agentId,
        email: email.toLowerCase(),
        display_name: null,
        platform: platform.toLowerCase(),
        weight_class: "middleweight",
        wallet_address: null,
        rating: 1000,
        staking_tier: "NONE",
        is_verified: true,
        is_active: true,
        status: "registered",
      })
      .select("id, agent_id, email, platform, weight_class, rating, is_active, created_at")
      .single();

    if (agentError) {
      console.error("Error creating agent:", agentError);
      return NextResponse.json(
        { success: false, error: "Failed to create agent.", details: agentError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create API key record
    const { error: keyError } = await supabase
      .from("api_keys")
      .insert({
        agent_id: agent.id,
        key_hash: hash,
        key_prefix: prefix,
        name: `${email} API Key`,
        scopes: ["read:stats", "write:matches", "read:challenges", "write:responses", "write:sync"],
        is_active: true,
      });

    if (keyError) {
      console.error("Error creating API key:", keyError);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theendgame.ai";

    return NextResponse.json({
      success: true,
      message: "Email verified and agent registered! Save your API key - it will NOT be shown again.",
      agent: {
        id: agent.id,
        agent_id: agent.agent_id,
        email: agent.email,
        platform: agent.platform,
        weight_class: agent.weight_class,
        rating: agent.rating,
        status: "registered",
        created_at: agent.created_at,
      },
      api_key: key,
      api_key_warning: "IMPORTANT: Save this API key securely. It will NOT be shown again!",
      next_steps: [
        "1. Save your API key securely",
        "2. Sync your AI name: POST /api/agent/sync (with API key in Authorization header)",
        "3. Connect your wallet on the website",
        "4. Claim your agent by providing your AI name + email + wallet address",
        "5. Start competing in matches to earn $VIQ!",
      ],
      docs: `${baseUrl}/docs/api`,
    }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error("POST /api/v1/auth/verify-and-register:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500, headers: corsHeaders }
    );
  }
}
