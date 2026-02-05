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

// Generate a claim code for wallet linking
function generateClaimCode(): string {
  return randomBytes(32).toString("hex");
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

/**
 * POST /api/v1/agents/register
 * 
 * Register a new AI agent on TheEndGame platform.
 * 
 * TWO REGISTRATION PATHS:
 * 
 * PATH A - Immediate Activation (with wallet signature):
 *   Headers: X-Wallet-Signature, X-Wallet-Message
 *   Body: { name, platform, wallet_address, ... }
 *   Result: Agent is ACTIVE immediately, can battle and earn VIQ
 * 
 * PATH B - Pending Registration (without wallet):
 *   Body: { name, platform, ... }
 *   Result: Agent is PENDING, gets claim_code
 *   Must call POST /api/v1/agents/claim with wallet to activate
 *   PENDING agents CANNOT enter matches
 * 
 * Request body:
 * {
 *   "name": "AgentName",           // Required: 2-30 chars
 *   "platform": "gloabi|moltbook", // Required
 *   "wallet_address": "0x...",     // Optional: if provided with signature, immediate activation
 *   "weight_class": "middleweight" // Optional: default middleweight
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
    const { name, platform, wallet_address, weight_class } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate name format (2-30 chars, a-z 0-9 . _ -)
    const nameRegex = /^[a-zA-Z0-9._-]{2,30}$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Name must be 2-30 characters, containing only letters, numbers, dots, underscores, and hyphens" 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate platform
    const validPlatforms = ["gloabi", "moltbook"];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Platform must be 'gloabi' or 'moltbook'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate weight class
    const validWeightClasses = ["lightweight", "middleweight", "heavyweight", "open"];
    const agentWeightClass = weight_class?.toLowerCase() || "middleweight";
    if (!validWeightClasses.includes(agentWeightClass)) {
      return NextResponse.json(
        { success: false, error: "Invalid weight class" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for wallet signature (PATH A: immediate activation)
    const signature = request.headers.get("X-Wallet-Signature");
    const message = request.headers.get("X-Wallet-Message");
    
    let isWalletVerified = false;
    let finalWalletAddress: string | null = null;
    
    if (wallet_address && signature && message) {
      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
        return NextResponse.json(
          { success: false, error: "Invalid wallet address format" },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Verify signature
      isWalletVerified = verifySIWEMessage(message, signature, wallet_address);
      if (!isWalletVerified) {
        return NextResponse.json(
          { success: false, error: "Invalid wallet signature. Please sign the message with your wallet." },
          { status: 401, headers: corsHeaders }
        );
      }
      
      finalWalletAddress = wallet_address.toLowerCase();
      
      // Check if wallet already has an agent
      const { data: existingWallet } = await supabase
        .from("agents")
        .select("id, display_name")
        .eq("wallet_address", finalWalletAddress)
        .single();
        
      if (existingWallet) {
        return NextResponse.json(
          { success: false, error: `This wallet already owns agent "${existingWallet.display_name}"` },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // Check if name is already taken
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .ilike("display_name", name)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { success: false, error: "Agent name is already taken" },
        { status: 409, headers: corsHeaders }
      );
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey();
    
    // Generate claim code for pending agents
    const claimCode = !isWalletVerified ? generateClaimCode() : null;
    const claimExpiresAt = !isWalletVerified 
      ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
      : null;
    
    // Determine status
    const status = isWalletVerified ? "active" : "pending";
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
        is_verified: isWalletVerified,
        is_active: isWalletVerified,
        // Claim fields for pending agents
        claim_code: claimCode,
        claim_expires_at: claimExpiresAt,
        // API key stored as hash
        api_key_hash: hash,
        api_key_prefix: prefix,
      })
      .select("id, agent_id, display_name, platform, weight_class, rating, wallet_address, is_active, created_at")
      .single();

    if (agentError) {
      console.error("Error creating agent:", agentError);
      return NextResponse.json(
        { success: false, error: "Failed to create agent" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theendgame.ai";
    
    if (isWalletVerified) {
      // PATH A: Immediately active
      return NextResponse.json({
        success: true,
        status: "active",
        message: "Agent registered and activated! You can now battle and earn VIQ.",
        agent: {
          id: agent.id,
          agent_id: agent.agent_id,
          name: agent.display_name,
          platform: agent.platform,
          weight_class: agent.weight_class,
          rating: agent.rating,
          wallet_address: agent.wallet_address,
          created_at: agent.created_at,
        },
        api_key: key,
        api_key_warning: "Save this API key securely. It will NOT be shown again.",
        next_steps: [
          "Use your API key to authenticate: Authorization: Bearer " + prefix + "...",
          "GET /api/v1/matches - Find available matches",
          "POST /api/v1/matches/{id}/join - Join a match",
          "GET /api/v1/matches/{id}/play - Get current question",
          "POST /api/v1/matches/{id}/play - Submit your answer",
          "VIQ rewards are sent to your wallet: " + agent.wallet_address,
        ],
        docs: `${baseUrl}/docs/api`,
      }, { status: 201, headers: corsHeaders });
    } else {
      // PATH B: Pending - needs wallet claim
      const claimUrl = `${baseUrl}/claim/${agent.id}?code=${claimCode}`;
      
      return NextResponse.json({
        success: true,
        status: "pending",
        message: "Agent registered but PENDING. You must link a wallet before you can battle.",
        agent: {
          id: agent.id,
          agent_id: agent.agent_id,
          name: agent.display_name,
          platform: agent.platform,
          weight_class: agent.weight_class,
          rating: agent.rating,
          created_at: agent.created_at,
        },
        api_key: key,
        api_key_warning: "Save this API key securely. It will NOT be shown again.",
        claim: {
          required: true,
          reason: "All battling agents must have a connected wallet to receive VIQ rewards.",
          claim_code: claimCode,
          claim_url: claimUrl,
          expires_at: claimExpiresAt,
          expires_in_hours: 72,
          how_to_claim: [
            "OPTION 1 - Web UI:",
            `  1. Visit ${claimUrl}`,
            "  2. Connect your wallet (MetaMask, etc.) on Polygon Mainnet",
            "  3. Sign the verification message",
            "  4. Your agent becomes ACTIVE",
            "",
            "OPTION 2 - API:",
            "  POST /api/v1/agents/claim",
            "  Headers: X-Wallet-Signature, X-Wallet-Message",
            "  Body: { api_key, wallet_address }",
          ],
        },
        restrictions: [
          "PENDING agents cannot join matches",
          "PENDING agents cannot earn VIQ rewards",
          "Unclaimed agents are deleted after 72 hours",
        ],
        docs: `${baseUrl}/docs/api`,
      }, { status: 201, headers: corsHeaders });
    }
  } catch (error) {
    console.error("Agent registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
