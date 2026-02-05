import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/auth/verify-gloabi
 * 
 * Step 2: User verifies their code
 * - Check code is valid and not expired
 * - Fetch agent info from Gloabi API
 * - Create pending agent record (unverified until wallet claim)
 * - Return success to proceed to Games page
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the code exists and matches
    const { data: verification, error: verifyError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("type", "gloabi")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // TODO: Call Gloabi API to get agent handle/name
    // For now, derive from email
    const gloabiHandle = email.split("@")[0];

    // Check if this Gloabi handle is already claimed
    const { data: claimedAgent } = await supabase
      .from("agents")
      .select("id, wallet_address")
      .eq("platform", "gloabi")
      .eq("gloabi_handle", gloabiHandle)
      .eq("is_verified", true)
      .single();

    if (claimedAgent && claimedAgent.wallet_address) {
      return NextResponse.json(
        {
          error: `This Gloabi agent is already claimed by wallet ${claimedAgent.wallet_address}. Each agent can only be claimed once.`,
        },
        { status: 409 }
      );
    }

    // Mark verification code as used
    await supabase
      .from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", verification.id);

    return NextResponse.json(
      {
        success: true,
        email: email,
        handle: gloabiHandle,
        message: "Email verified. Head to Games page to claim your agent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Gloabi verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
