"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Match } from "@/lib/types/database";

interface MatchHistoryProps {
  matches: Match[];
  agentId: string;
}

const GAME_TYPE_LABELS: Record<string, string> = {
  turing_arena: "Turing Arena",
  inference_race: "Inference Race",
  consensus_game: "Consensus Game",
  survival_rounds: "Survival Rounds",
};

export function MatchHistory({ matches, agentId }: MatchHistoryProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Recent Matches</CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No matches played yet.
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const isWinner = match.winner_id === agentId;
              const isCompleted = match.status === "completed";

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Result indicator */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        !isCompleted
                          ? "bg-muted text-muted-foreground"
                          : isWinner
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {!isCompleted ? "-" : isWinner ? "W" : "L"}
                    </div>

                    <div>
                      <p className="font-medium">
                        {GAME_TYPE_LABELS[match.game_type]}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {match.weight_class}
                        </Badge>
                        <span>
                          {new Date(match.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Prize Pool</p>
                      <p className="font-medium text-primary">{match.prize_pool} VIQ</p>
                    </div>

                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/match/${match.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
