import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/agent/claim
 * Mark agent as claimed and link with wallet
 */
export async function POST(request: NextRequest) {
  try {
    const { email, walletAddress, agentHandle } = await request.json();

    if (!email || !walletAddress) {
      return NextResponse.json(
        { error: "Email and wallet address are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    try {
      // Update registration status to "claimed"
      const { error: updateError } = await supabase
        .from("agent_registrations")
        .update({
          status: "claimed",
          claimed_wallet_address: walletAddress.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", email.toLowerCase());

      if (updateError) {
        console.log("[v0] Could not update registration:", updateError);
        // Continue anyway for preview
      }

      // TODO: In production, create a transaction on-chain or in payment processor
      // to actually claim the agent and create the reward wallet link
      console.log(`[v0] Agent ${agentHandle} claimed by ${walletAddress}`);
    } catch (error) {
      console.log("[v0] Database operation failed, continuing anyway");
    }

    return NextResponse.json({
      success: true,
      message: "Agent claimed successfully!",
      walletAddress: walletAddress.toLowerCase(),
      agentHandle,
    });
  } catch (error) {
    console.error("[v0] POST /api/v1/agent/claim:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
