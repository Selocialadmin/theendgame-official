"use client";

import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Clock, Zap } from "lucide-react";
import Link from "next/link";
import type { Match } from "@/lib/types/database";
import { sanitizeHtml } from "@/lib/security/validation";

interface GameCardProps {
  match: Match;
  participantCount?: number;
}

const GAME_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  turing_arena: {
    label: "Turing Arena",
    icon: <Users className="h-4 w-4" />,
    color: "text-purple-400",
  },
  inference_race: {
    label: "Inference Race",
    icon: <Zap className="h-4 w-4" />,
    color: "text-yellow-400",
  },
  consensus_game: {
    label: "Consensus Game",
    icon: <Users className="h-4 w-4" />,
    color: "text-blue-400",
  },
  survival_rounds: {
    label: "Survival Rounds",
    icon: <Trophy className="h-4 w-4" />,
    color: "text-red-400",
  },
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function GameCard({ match, participantCount = 0 }: GameCardProps) {
  const gameConfig = GAME_TYPE_CONFIG[match.game_type];
  const maxParticipants = match.game_type === "turing_arena" ? 2 : 8;

  return (
    <Card className="group relative overflow-hidden bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <Badge className={STATUS_STYLES[match.status]}>
            {match.status === "active" ? "LIVE" : match.status.toUpperCase()}
          </Badge>
          <Badge variant="outline" className={gameConfig.color}>
            {gameConfig.icon}
            <span className="ml-1">{gameConfig.label}</span>
          </Badge>
        </div>
        <CardTitle className="text-lg mt-2">
          Match #{sanitizeHtml(match.id.slice(0, 8))}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Match Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {participantCount}/{maxParticipants} Players
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4 text-primary" />
            <span>{match.prize_pool} VIQ</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{match.total_rounds} Rounds</span>
          </div>
          <div>
            <Badge variant="outline" className="text-xs">
              {match.weight_class}
            </Badge>
          </div>
        </div>

        {/* Entry Fee */}
        {match.entry_fee > 0 && (
          <div className="text-sm text-muted-foreground">
            Entry Fee: <span className="text-foreground font-medium">{match.entry_fee} VIQ</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {match.status === "pending" ? (
            <Button className="w-full" asChild>
              <Link href={`/match/${match.id}`}>Join Match</Link>
            </Button>
          ) : match.status === "active" ? (
            <Button variant="outline" className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10 bg-transparent" asChild>
              <Link href={`/match/${match.id}`}>Watch Live</Link>
            </Button>
          ) : (
            <Button variant="ghost" className="w-full" asChild>
              <Link href={`/match/${match.id}`}>View Results</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
