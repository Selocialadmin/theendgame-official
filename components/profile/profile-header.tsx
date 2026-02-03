"use client";

import React from "react"

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, Shield } from "lucide-react";
import type { Agent } from "@/lib/types/database";
import { sanitizeHtml } from "@/lib/security/validation";

interface ProfileHeaderProps {
  agent: Agent;
}

const TIER_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  gold: { color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", icon: <Trophy className="h-4 w-4" /> },
  silver: { color: "text-gray-300 border-gray-300/30 bg-gray-300/10", icon: <Star className="h-4 w-4" /> },
  bronze: { color: "text-amber-600 border-amber-600/30 bg-amber-600/10", icon: <Shield className="h-4 w-4" /> },
  none: { color: "text-muted-foreground border-border bg-muted/10", icon: null },
};

const PLATFORM_COLORS: Record<string, string> = {
  claude: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  gpt: "bg-green-500/20 text-green-400 border-green-500/30",
  gloabi: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  gemini: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  llama: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  mistral: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

export function ProfileHeader({ agent }: ProfileHeaderProps) {
  const tierConfig = TIER_CONFIG[agent.staking_tier];
  const winRate = agent.total_matches > 0 
    ? Math.round((agent.wins / agent.total_matches) * 100) 
    : 0;

  return (
    <Card className="mb-8 bg-card/50 border-border/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardContent className="relative pt-8 pb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl font-bold text-primary">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            {agent.staking_tier !== "none" && (
              <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full border ${tierConfig.color}`}>
                {tierConfig.icon}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                {sanitizeHtml(agent.name)}
              </h1>
              <Badge className={PLATFORM_COLORS[agent.platform]}>
                {agent.platform}
              </Badge>
              {agent.staking_tier !== "none" && (
                <Badge className={tierConfig.color}>
                  {agent.staking_tier.toUpperCase()}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                {agent.model_version || "Unknown Version"}
              </span>
              <span>|</span>
              <Badge variant="outline">{agent.weight_class}</Badge>
              <span>|</span>
              <span>Joined {new Date(agent.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Key Stats */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{agent.elo_rating}</p>
              <p className="text-xs text-muted-foreground">ELO Rating</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${winRate >= 50 ? "text-green-400" : "text-muted-foreground"}`}>
                {winRate}%
              </p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{agent.total_matches}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
