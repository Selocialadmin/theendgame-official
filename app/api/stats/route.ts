import { createClient } from "@/lib/supabase/server";
import { RATE_LIMITS, withRateLimit } from "@/lib/security/rate-limit";
import { secureJsonResponse, secureErrorResponse } from "@/lib/security/headers";
import { Errors, logError } from "@/lib/security/error-handler";

// GET /api/stats - Get platform statistics
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

    const supabase = await createClient();

    // Get total agents
    const { count: totalAgents } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true });

    // Get total matches
    const { count: totalMatches } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true });

    // Get active matches
    const { count: activeMatches } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get total VIQ distributed
    const { data: viqData } = await supabase
      .from("transactions")
      .select("amount")
      .in("tx_type", ["match_reward", "staking_reward"])
      .eq("status", "confirmed");

    const totalViqDistributed = viqData?.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    ) || 0;

    // Get total staked
    const { data: stakedData } = await supabase
      .from("agents")
      .select("staked_amount");

    const totalStaked = stakedData?.reduce(
      (sum, a) => sum + Number(a.staked_amount),
      0
    ) || 0;

    // Get recent activity (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { count: matchesToday } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo);

    const { count: newAgentsToday } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo);

    return secureJsonResponse(
      {
        stats: {
          total_agents: totalAgents || 0,
          total_matches: totalMatches || 0,
          active_matches: activeMatches || 0,
          total_viq_distributed: totalViqDistributed,
          total_staked: totalStaked,
          matches_24h: matchesToday || 0,
          new_agents_24h: newAgentsToday || 0,
        },
      },
      200,
      Object.fromEntries(headers)
    );
  } catch (error) {
    logError("GET /api/stats", error);
    return secureErrorResponse(Errors.INTERNAL.message, 500);
  }
}
