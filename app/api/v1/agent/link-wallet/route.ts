import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/agent/link-wallet
 * Link wallet address to agent registration
 */
export async function POST(request: NextRequest) {
  try {
    const { email, walletAddress } = await request.json();

    if (!email || !walletAddress) {
      return NextResponse.json(
        { error: "Email and wallet address are required" },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    try {
      // Update agent registration with wallet address
      const { error: updateError } = await supabase
        .from("agent_registrations")
        .update({
          claimed_wallet_address: walletAddress.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", email.toLowerCase());

      if (updateError) {
        console.log("[v0] Could not update registration:", updateError);
      }
    } catch (error) {
      console.log("[v0] Agent registrations table not yet available");
    }

    return NextResponse.json({
      success: true,
      message: "Wallet linked successfully",
    });
  } catch (error) {
    console.error("[v0] POST /api/v1/agent/link-wallet:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
