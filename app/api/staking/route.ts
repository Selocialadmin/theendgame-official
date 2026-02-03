import { createClient } from "@/lib/supabase/server";
import { RATE_LIMITS, withRateLimit } from "@/lib/security/rate-limit";
import { secureJsonResponse, secureErrorResponse } from "@/lib/security/headers";
import { validateInput, stakingSchema, walletAddressSchema } from "@/lib/security/validation";
import { Errors, logError } from "@/lib/security/error-handler";
import { verifyWalletOwnership } from "@/lib/security/auth";

// GET /api/staking?wallet_address=0x... - Get staking info for a wallet
export async function GET(request: Request) {
  try {
    const { allowed, headers } = withRateLimit(request, RATE_LIMITS.API_READ);
    if (!allowed) {
      return secureErrorResponse(
        Errors.RATE_LIMITED.message,
        429,
        Object.fromEntries(headers)
      );
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");

    // Validate wallet address
    const addressResult = validateInput(walletAddressSchema, walletAddress);
    if (!addressResult.success) {
      return secureErrorResponse(addressResult.error, 400);
    }

    const supabase = await createClient();

    // Get agent by wallet address
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, staking_tier, staked_amount, total_viq_earned")
      .eq("wallet_address", addressResult.data)
      .single();

    if (agentError || !agent) {
      return secureJsonResponse({
        staking: {
          tier: "none",
          staked_amount: 0,
          total_earned: 0,
        },
      });
    }

    // Get staking transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("agent_id", agent.id)
      .in("tx_type", ["stake", "unstake", "staking_reward"])
      .order("created_at", { ascending: false })
      .limit(20);

    return secureJsonResponse(
      {
        staking: {
          tier: agent.staking_tier,
          staked_amount: agent.staked_amount,
          total_earned: agent.total_viq_earned,
        },
        transactions: transactions || [],
      },
      200,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("GET /api/staking", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}

// POST /api/staking - Record staking action (after on-chain confirmation)
export async function POST(request: Request) {
  try {
    const { allowed, headers } = withRateLimit(request, RATE_LIMITS.STAKING);
    if (!allowed) {
      return secureErrorResponse(
        Errors.RATE_LIMITED.message,
        429,
        Object.fromEntries(headers)
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return secureErrorResponse(Errors.INVALID_INPUT.message, 400);
    }

    // Validate input
    const validationResult = validateInput(stakingSchema, body);
    if (!validationResult.success) {
      return secureErrorResponse(validationResult.error, 400);
    }

    const { wallet_address, amount, action } = validationResult.data;

    // Verify wallet ownership
    const isOwner = await verifyWalletOwnership(request, wallet_address);
    if (!isOwner) {
      return secureErrorResponse(Errors.INVALID_SIGNATURE.message, 401);
    }

    const supabase = await createClient();

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, staked_amount")
      .eq("wallet_address", wallet_address)
      .single();

    if (agentError || !agent) {
      return secureErrorResponse(Errors.AGENT_NOT_FOUND.message, 404);
    }

    // Calculate new staked amount
    const currentStaked = Number(agent.staked_amount) || 0;
    let newStakedAmount: number;

    if (action === "stake") {
      newStakedAmount = currentStaked + amount;
    } else {
      if (amount > currentStaked) {
        return secureErrorResponse(Errors.INSUFFICIENT_BALANCE.message, 400);
      }
      newStakedAmount = currentStaked - amount;
    }

    // Determine new tier
    let newTier = "none";
    if (newStakedAmount >= 10000) newTier = "gold";
    else if (newStakedAmount >= 5000) newTier = "silver";
    else if (newStakedAmount >= 1000) newTier = "bronze";

    // Update agent
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        staked_amount: newStakedAmount,
        staking_tier: newTier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);

    if (updateError) {
      logError("POST /api/staking - update agent", updateError);
      return secureErrorResponse(Errors.DATABASE.message, 500);
    }

    // Record transaction
    const { error: txError } = await supabase.from("transactions").insert({
      agent_id: agent.id,
      tx_type: action,
      amount: action === "stake" ? amount : -amount,
      status: "pending", // Will be updated when on-chain tx is confirmed
    });

    if (txError) {
      logError("POST /api/staking - insert transaction", txError);
      // Don't fail the request, agent was updated
    }

    return secureJsonResponse(
      {
        success: true,
        staking: {
          tier: newTier,
          staked_amount: newStakedAmount,
        },
      },
      200,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("POST /api/staking", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}
