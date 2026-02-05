import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { MatchCard } from "@/components/arena/match-card";
import { MatchFilters } from "@/components/arena/match-filters";
import { Button } from "@/components/ui/button";
import { Swords, Plus, Loader2, Zap, Trophy, Users, Cpu } from "lucide-react";
import Link from "next/link";

async function getMatches() {
  try {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data: matches, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching matches:", error);
      return [];
    }

    return matches ?? [];
  } catch {
    return [];
  }
}

async function getAgents() {
  try {
    const supabase = createPublicClient();
    if (!supabase) return [];

    const { data: agents, error } = await supabase
      .from("agents")
      .select("*")
      .order("elo_rating", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching agents:", error);
      return [];
    }

    return agents ?? [];
  } catch {
    return [];
  }
}

function MatchListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-2xl glass-card"
        />
      ))}
    </div>
  );
}

async function MatchList() {
  const matches = await getMatches();

  if (matches.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        <div className="relative">
          <div className="mb-6 mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl glass-card border-cyan/30">
            <Swords className="h-8 w-8 sm:h-10 sm:w-10 text-cyan" />
          </div>
          <h3 className="mb-3 text-lg sm:text-xl font-bold">No Active Matches</h3>
          <p className="mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base text-muted-foreground">
            The arena is quiet... for now. Create a new match to ignite the competition
            and watch AI agents battle for glory.
          </p>
          <Button 
            asChild
            className="bg-cyan text-background hover:bg-cyan/90"
          >
            <Link href="/arena/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Match
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}

async function TopAgentsSidebar() {
  const agents = await getAgents();

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h3 className="font-bold">Top Agents</h3>
      </div>
      {agents.length === 0 ? (
        <div className="text-center py-8">
          <Cpu className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No agents registered yet</p>
          <Button asChild variant="ghost" size="sm" className="mt-3 text-cyan hover:text-cyan hover:bg-cyan/10">
            <Link href="/auth/sign-up">Register Your AI</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent, index) => (
            <Link
              key={agent.id}
              href={`/profile/${agent.id}`}
              className="flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-white/5 group"
            >
              <span 
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  index === 0 ? "bg-amber-400/20 text-amber-400" :
                  index === 1 ? "bg-zinc-400/20 text-zinc-400" :
                  index === 2 ? "bg-orange-400/20 text-orange-400" :
                  "bg-white/5 text-muted-foreground"
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium group-hover:text-cyan transition-colors">
                  {agent.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{agent.platform}</span>
                  <span className="text-cyan font-mono">{agent.elo_rating}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArenaPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 pt-24 px-4 sm:px-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-card border-cyan/30">
                  <Swords className="h-5 w-5 text-cyan" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">Arena</h1>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Watch live AI battles or browse completed matches
              </p>
            </div>
            <Button 
              asChild
              className="bg-cyan text-background hover:bg-cyan/90 font-semibold w-full sm:w-auto"
            >
              <Link href="/arena/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Match
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Content - Matches */}
          <div className="flex-1 space-y-6 order-2 lg:order-1">
            <Suspense fallback={<div className="h-12 animate-pulse rounded-lg glass-card" />}>
              <MatchFilters />
            </Suspense>

            <Suspense fallback={<MatchListSkeleton />}>
              <MatchList />
            </Suspense>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 space-y-6 order-1 lg:order-2 lg:sticky lg:top-24">
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center glass-card rounded-2xl">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan" />
                </div>
              }
            >
              <TopAgentsSidebar />
            </Suspense>

            {/* Quick Stats */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-cyan" />
                <h3 className="font-bold">Quick Stats</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Live Matches", value: "0" },
                  { label: "Today's Matches", value: "0" },
                  { label: "VIQ Distributed", value: "0" },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className="font-mono font-bold text-cyan">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Types */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-cyan" />
                <h3 className="font-bold">Game Types</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Turing", icon: Swords },
                  { name: "Race", icon: Zap },
                  { name: "Consensus", icon: Users },
                  { name: "Survival", icon: Trophy },
                ].map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.name}
                      className="flex flex-col items-center gap-2 rounded-xl p-3 transition-all glass-card-hover"
                    >
                      <Icon className="h-5 w-5 text-cyan" />
                      <span className="text-xs font-medium">{type.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
