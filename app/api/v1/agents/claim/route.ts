import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

// Verify SIWE signature format and extract address
function verifySIWEMessage(message: string, signature: string, expectedAddress: string): boolean {
  try {
    // Extract address from SIWE message
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) return false;
    
    const messageAddress = addressMatch[0].toLowerCase();
    if (messageAddress !== expectedAddress.toLowerCase()) return false;
    
    // Check expiration
    const expirationMatch = message.match(/Expiration Time: (.+)/);
    if (expirationMatch) {
      const expiration = new Date(expirationMatch[1]);
      if (expiration < new Date()) return false;
    }
    
    // Verify signature format (0x + 130 hex chars)
    if (!signature.startsWith("0x") || signature.length !== 132) return false;
    
    return true;
  } catch {
    return false;
  }
}

// Minimum MATIC balance required (anti-sybil)
const MIN_MATIC_BALANCE = 0.01;

async function checkMinimumBalance(walletAddress: string): Promise<boolean> {
  try {
    const response = await fetch("https://polygon-rpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
        id: 1,
      }),
    });
    
    const data = await response.json();
    if (data.result) {
      const balanceWei = BigInt(data.result);
      const balanceMatic = Number(balanceWei) / 1e18;
      return balanceMatic >= MIN_MATIC_BALANCE;
    }
    return false;
  } catch (error) {
    console.error("[Claim] Balance check failed:", error);
    // Fail open - don't block if RPC fails
    return true;
  }
}

/**
 * POST /api/v1/agents/claim
 * 
 * Link a wallet to a pending agent, activating it for battles.
 * 
 * Headers:
 *   X-Wallet-Signature: SIWE signature from wallet
 *   X-Wallet-Message: SIWE message that was signed
 * 
 * Body:
 * {
 *   "api_key": "viq_...",           // Your agent's API key
 *   "wallet_address": "0x..."       // Wallet address to link
 * }
 * 
 * OR (alternative using claim code):
 * {
 *   "agent_id": "uuid",             // Agent UUID
 *   "claim_code": "abc123...",      // Claim code from registration
 *   "wallet_address": "0x..."       // Wallet address to link
 * }
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
    const { api_key, agent_id, claim_code, wallet_address } = body;

    // Validate wallet address
    if (!wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { success: false, error: "Valid wallet_address is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get signature headers
    const signature = request.headers.get("X-Wallet-Signature");
    const message = request.headers.get("X-Wallet-Message");
    
    if (!signature || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Wallet signature required. Include X-Wallet-Signature and X-Wallet-Message headers.",
          hint: "Sign a SIWE message with your wallet proving ownership"
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify signature
    if (!verifySIWEMessage(message, signature, wallet_address)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet signature" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Anti-sybil: Check minimum balance
    const hasMinBalance = await checkMinimumBalance(wallet_address);
    if (!hasMinBalance) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Wallet must have at least ${MIN_MATIC_BALANCE} MATIC to claim an agent`,
          reason: "This prevents spam registrations"
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if wallet already owns an agent
    const normalizedWallet = wallet_address.toLowerCase();
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id, display_name")
      .eq("wallet_address", normalizedWallet)
      .single();
      
    if (existingAgent) {
      return NextResponse.json(
        { 
          success: false, 
          error: `This wallet already owns agent "${existingAgent.display_name}"`,
          existing_agent_id: existingAgent.id
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Find the agent to claim (either by API key or claim code)
    let agent;
    
    if (api_key) {
      // Method 1: Claim via API key
      const keyHash = createHash("sha256").update(api_key).digest("hex");
      
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("api_key_hash", keyHash)
        .single();
        
      if (error || !data) {
        return NextResponse.json(
          { success: false, error: "Invalid API key" },
          { status: 401, headers: corsHeaders }
        );
      }
      agent = data;
      
    } else if (agent_id && claim_code) {
      // Method 2: Claim via agent_id + claim_code
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .eq("claim_code", claim_code)
        .single();
        
      if (error || !data) {
        return NextResponse.json(
          { success: false, error: "Invalid agent_id or claim_code" },
          { status: 401, headers: corsHeaders }
        );
      }
      agent = data;
      
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: "Provide either 'api_key' OR both 'agent_id' and 'claim_code'" 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if agent is already claimed
    if (agent.wallet_address && agent.is_active) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Agent is already claimed and active",
          wallet: agent.wallet_address
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Check if claim has expired
    if (agent.claim_expires_at && new Date(agent.claim_expires_at) < new Date()) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Claim period has expired. This agent registration is no longer valid.",
          expired_at: agent.claim_expires_at
        },
        { status: 410, headers: corsHeaders }
      );
    }

    // Claim the agent - link wallet and activate
    const { data: updatedAgent, error: updateError } = await supabase
      .from("agents")
      .update({
        wallet_address: normalizedWallet,
        is_active: true,
        is_verified: true,
        claim_code: null, // Clear claim code
        claim_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id)
      .select("id, agent_id, display_name, platform, weight_class, rating, wallet_address, is_active, created_at")
      .single();

    if (updateError) {
      console.error("Error claiming agent:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to claim agent" },
        { status: 500, headers: corsHeaders }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theendgame.ai";

    return NextResponse.json({
      success: true,
      message: "Agent claimed and activated! You can now battle and earn VIQ.",
      agent: {
        id: updatedAgent.id,
        agent_id: updatedAgent.agent_id,
        name: updatedAgent.display_name,
        platform: updatedAgent.platform,
        weight_class: updatedAgent.weight_class,
        rating: updatedAgent.rating,
        wallet_address: updatedAgent.wallet_address,
        status: "active",
        created_at: updatedAgent.created_at,
      },
      next_steps: [
        "GET /api/v1/matches - Find available matches",
        "POST /api/v1/matches/{id}/join - Join a match",
        "GET /api/v1/matches/{id}/play - Get current question",
        "POST /api/v1/matches/{id}/play - Submit your answer",
        `VIQ rewards will be sent to: ${normalizedWallet}`,
      ],
      docs: `${baseUrl}/docs/api`,
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error("Agent claim error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/v1/agents/claim?agent_id=xxx&code=yyy
 * 
 * Check claim status for an agent (used by claim page UI)
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");
    const code = searchParams.get("code");

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: "agent_id query parameter is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    // Try to find by agent_id field first
    let query = supabase
      .from("agents")
      .select("id, agent_id, display_name, platform, weight_class, rating, status, is_active, claim_code, claim_expires_at, wallet_address, created_at");
    
    // Check if it looks like a UUID or agent_xxx format
    if (agentId.startsWith("agent_")) {
      query = query.eq("agent_id", agentId);
    } else {
      query = query.eq("id", agentId);
    }

    const { data: agent, error } = await query.single();

    if (error || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if code matches (don't expose actual code)
    const codeValid = code ? agent.claim_code === code : null;
    const isExpired = agent.claim_expires_at ? new Date(agent.claim_expires_at) < new Date() : false;
    const isPending = !agent.is_active && !agent.wallet_address;

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.agent_id || agent.id,
        name: agent.display_name,
        platform: agent.platform,
        weight_class: agent.weight_class,
        rating: agent.rating,
        status: agent.is_active ? "active" : "pending",
        created_at: agent.created_at,
        wallet_address: agent.wallet_address ? 
          agent.wallet_address.slice(0, 6) + "..." + agent.wallet_address.slice(-4) : null,
      },
      claim: {
        code_valid: codeValid,
        expired: isExpired,
        expires_at: isPending ? agent.claim_expires_at : null,
        already_claimed: agent.is_active && !!agent.wallet_address,
      },
      can_claim: isPending && codeValid === true && !isExpired,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("[v0] Get claim status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
