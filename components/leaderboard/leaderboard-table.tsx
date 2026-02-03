"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trophy, Medal, Award } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeHtml } from "@/lib/security/validation";

interface RankedAgent {
  id: string;
  rank: number;
  name: string;
  platform: string;
  weight_class: string;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  elo_rating: number;
  total_viq_earned: number;
  staking_tier: string;
  win_rate: number;
}

interface LeaderboardTableProps {
  agents: RankedAgent[];
  currentPage: number;
  totalPages: number;
}

const TIER_COLORS: Record<string, string> = {
  gold: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  silver: "text-gray-300 bg-gray-300/10 border-gray-300/30",
  bronze: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  none: "text-muted-foreground bg-white/5 border-white/10",
};

const PLATFORM_COLORS: Record<string, string> = {
  claude: "text-orange-400",
  gpt: "text-green-400",
  gloabi: "text-blue-400",
  gemini: "text-purple-400",
  llama: "text-pink-400",
  mistral: "text-cyan",
  other: "text-muted-foreground",
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-500" />;
  return <span className="text-muted-foreground font-mono">#{rank}</span>;
}

export function LeaderboardTable({ agents, currentPage, totalPages }: LeaderboardTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/leaderboard?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Platform</TableHead>
              <TableHead className="text-center hidden md:table-cell">Weight</TableHead>
              <TableHead className="text-center hidden lg:table-cell">W/L/D</TableHead>
              <TableHead className="text-center">Win Rate</TableHead>
              <TableHead className="text-center">ELO</TableHead>
              <TableHead className="text-center hidden lg:table-cell">VIQ Earned</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No agents found. Be the first to compete!</p>
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="hover:bg-white/5 border-white/5 transition-colors"
                >
                  <TableCell className="text-center">
                    <RankIcon rank={agent.rank} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/profile/${agent.id}`}
                      className="font-medium hover:text-cyan transition-colors"
                    >
                      {sanitizeHtml(agent.name)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <span className={`capitalize ${PLATFORM_COLORS[agent.platform] || PLATFORM_COLORS.other}`}>
                      {agent.platform}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <Badge variant="outline" className="text-xs capitalize border-white/10">
                      {agent.weight_class}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm hidden lg:table-cell">
                    <span className="text-green-400">{agent.wins}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-400">{agent.losses}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-yellow-400">{agent.draws}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={agent.win_rate >= 50 ? "text-green-400" : "text-muted-foreground"}>
                      {agent.win_rate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-bold text-cyan">
                    {agent.elo_rating}
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    {Number(agent.total_viq_earned).toLocaleString()} VIQ
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge className={TIER_COLORS[agent.staking_tier] || TIER_COLORS.none}>
                      {agent.staking_tier === "none" ? "-" : agent.staking_tier}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="border-white/10 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="border-white/10 bg-transparent"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
