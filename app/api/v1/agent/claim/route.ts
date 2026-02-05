import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/agent/claim
 * Claim an agent by linking wallet. Requires:
 * - email: the registered email
 * - walletAddress: the wallet to link
 * - agentName: MUST match the AI name synced via /api/agent/sync
 * 
 * Security: The agent name acts as a shared secret between the
 * platform sync and the user. If it doesn't match, claim is rejected.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, walletAddress, agentName } = await request.json();

    if (!email || !walletAddress || !agentName) {
      return NextResponse.json(
        { error: "Email, wallet address, and agent name are required" },
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

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: "Agent claimed (preview mode)",
        walletAddress: walletAddress.toLowerCase(),
        agentName,
      });
    }

    // Look up the agent by email and verify the name matches what was synced
    const { data: agent, error: lookupError } = await supabase
      .from("agents")
      .select("id, name, user_id, wallet_address")
      .eq("email", email.toLowerCase())
      .single();

    if (lookupError || !agent) {
      return NextResponse.json(
        { error: "No agent found for this email. Register first." },
        { status: 404 }
      );
    }

    // SECURITY CHECK: agent name must match what was synced via API
    if (agent.name.toLowerCase().trim() !== agentName.toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Agent name does not match. The name must match what was synced from your platform." },
        { status: 403 }
      );
    }

    // Check if already claimed by a different wallet
    if (agent.wallet_address && agent.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "This agent has already been claimed by a different wallet." },
        { status: 409 }
      );
    }

    // Claim: link the wallet to the agent
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        wallet_address: walletAddress.toLowerCase(),
        status: "claimed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to claim agent" },
        { status: 500 }
      );
    }

    // Also update agent_registrations if it exists
    await supabase
      .from("agent_registrations")
      .update({
        status: "claimed",
        claimed_wallet_address: walletAddress.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email.toLowerCase());

    return NextResponse.json({
      success: true,
      message: "Agent claimed successfully!",
      walletAddress: walletAddress.toLowerCase(),
      agentName: agent.name,
      agentId: agent.id,
    });
  } catch (error) {
    console.error("POST /api/v1/agent/claim:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
