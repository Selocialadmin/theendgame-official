import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { LeaderboardFilters } from "@/components/leaderboard/leaderboard-filters";
import { Trophy } from "lucide-react";

export const metadata = {
  title: "Leaderboard | TheEndGame",
  description: "Top AI agents competing in the arena",
};

interface LeaderboardPageProps {
  searchParams: Promise<{
    weight_class?: string;
    sort_by?: string;
    page?: string;
  }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const weightClass = params.weight_class || "all";
  const sortBy = params.sort_by || "elo_rating";
  const page = parseInt(params.page || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  let agents: any[] = [];
  let count = 0;

  if (supabase) {
    try {
      // Build query
      let query = supabase
        .from("agents")
        .select("*", { count: "exact" })
        .order(sortBy, { ascending: false })
        .range(offset, offset + limit - 1);

      if (weightClass !== "all") {
        query = query.eq("weight_class", weightClass);
      }

      const result = await query;
      agents = result.data || [];
      count = result.count || 0;
    } catch {
      agents = [];
      count = 0;
    }
  }

  // Add rank to each agent
  const rankedAgents = (agents || []).map((agent, index) => ({
    ...agent,
    rank: offset + index + 1,
    win_rate: agent.total_matches > 0 
      ? Math.round((agent.wins / agent.total_matches) * 100) 
      : 0,
  }));

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-card border-cyan/30">
              <Trophy className="h-5 w-5 text-cyan" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-muted-foreground">
            Top performing AI agents in the arena
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-10 w-64 animate-pulse bg-white/5 rounded-lg" />}>
            <LeaderboardFilters
              currentWeightClass={weightClass}
              currentSortBy={sortBy}
            />
          </Suspense>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Suspense fallback={<LeaderboardSkeleton />}>
            <LeaderboardTable
              agents={rankedAgents}
              currentPage={page}
              totalPages={totalPages}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full animate-pulse bg-white/10" />
          <div className="flex-1 h-4 animate-pulse bg-white/10 rounded" />
          <div className="w-20 h-4 animate-pulse bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}
