"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Clock, Zap, Swords, Eye } from "lucide-react";
import Link from "next/link";
import type { Match } from "@/lib/types/database";
import { sanitizeHtml } from "@/lib/security/validation";

interface MatchCardProps {
  match: Match;
  participantCount?: number;
}

const GAME_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; gradient: string }> = {
  turing_arena: {
    label: "Turing Arena",
    icon: Swords,
    color: "#ff00b4",
    gradient: "from-[#ff00b4] to-[#ff6b6b]",
  },
  inference_race: {
    label: "Inference Race",
    icon: Zap,
    color: "#ffc800",
    gradient: "from-[#ffc800] to-[#ff8c00]",
  },
  consensus_game: {
    label: "Consensus",
    icon: Users,
    color: "#00dcff",
    gradient: "from-[#00dcff] to-[#0088ff]",
  },
  survival_rounds: {
    label: "Survival",
    icon: Trophy,
    color: "#00ff88",
    gradient: "from-[#00ff88] to-[#00cc6a]",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  pending: { label: "WAITING", color: "#ffc800", pulse: false },
  active: { label: "LIVE", color: "#00ff88", pulse: true },
  completed: { label: "ENDED", color: "#888888", pulse: false },
  cancelled: { label: "CANCELLED", color: "#ff4444", pulse: false },
};

export function MatchCard({ match, participantCount = 0 }: MatchCardProps) {
  const gameConfig = GAME_TYPE_CONFIG[match.game_type];
  const statusConfig = STATUS_CONFIG[match.status];
  const maxParticipants = match.game_type === "turing_arena" ? 2 : 8;
  const Icon = gameConfig?.icon || Swords;

  return (
    <Link href={`/match/${match.id}`} className="block group">
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden h-full">
        {/* Background gradient based on game type */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${gameConfig?.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
        />
        
        {/* Status indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {statusConfig?.pulse && (
              <span className="relative flex h-2 w-2">
                <span 
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: statusConfig.color }}
                />
                <span 
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusConfig.color }}
                />
              </span>
            )}
            <span 
              className="text-xs font-mono font-bold tracking-wider"
              style={{ color: statusConfig?.color }}
            >
              {statusConfig?.label}
            </span>
          </div>
          <Badge 
            variant="outline" 
            className="text-xs border-white/10 bg-white/5"
            style={{ color: gameConfig?.color }}
          >
            <Icon className="h-3 w-3 mr-1" />
            {gameConfig?.label}
          </Badge>
        </div>

        {/* Match ID */}
        <div className="mb-4">
          <h3 className="text-lg font-bold group-hover:text-[#00dcff] transition-colors">
            Match #{sanitizeHtml(match.id.slice(0, 8))}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            {match.weight_class.toUpperCase()} CLASS
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{participantCount}</span>/{maxParticipants}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-[#ffc800]" />
            <span className="text-[#ffc800] font-mono font-medium">{match.prize_pool} VIQ</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{match.current_round}</span>/{match.total_rounds}
            </span>
          </div>
          {match.entry_fee > 0 && (
            <div className="text-sm text-muted-foreground">
              Fee: <span className="text-foreground font-mono">{match.entry_fee}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="pt-2">
          {match.status === "pending" ? (
            <Button 
              className="w-full bg-gradient-to-r from-[#00dcff] to-[#00ff88] text-background hover:opacity-90 font-semibold"
            >
              Join Match
            </Button>
          ) : match.status === "active" ? (
            <Button 
              variant="outline" 
              className="w-full border-[#00ff88]/50 text-[#00ff88] hover:bg-[#00ff88]/10 bg-transparent font-semibold"
            >
              <Eye className="h-4 w-4 mr-2" />
              Watch Live
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground"
            >
              View Results
            </Button>
          )}
        </div>

        {/* Bottom accent line */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, transparent, ${gameConfig?.color}, transparent)` }}
        />
      </div>
    </Link>
  );
}
