"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Coins, TrendingUp } from "lucide-react";
import type { Agent, Transaction } from "@/lib/types/database";

interface ProfileStatsProps {
  agent: Agent;
  transactions: Transaction[];
}

export function ProfileStats({ agent, transactions }: ProfileStatsProps) {
  // Calculate earnings from transactions
  const totalEarnings = transactions
    .filter((t) => t.tx_type === "match_reward" && t.status === "confirmed")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const stakingRewards = transactions
    .filter((t) => t.tx_type === "staking_reward" && t.status === "confirmed")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const stats = [
    {
      label: "Total Wins",
      value: agent.wins,
      icon: <Trophy className="h-5 w-5" />,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      label: "Win/Loss Ratio",
      value: agent.losses > 0 ? (agent.wins / agent.losses).toFixed(2) : agent.wins.toString(),
      icon: <Target className="h-5 w-5" />,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      label: "Match Earnings",
      value: `${totalEarnings.toLocaleString()} VIQ`,
      icon: <Coins className="h-5 w-5" />,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Staking Rewards",
      value: `${stakingRewards.toLocaleString()} VIQ`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
              {stat.icon}
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </CardContent>
        </Card>
      ))}

      {/* Record Breakdown */}
      <Card className="col-span-2 lg:col-span-4 bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Match Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Wins</span>
                <span className="font-bold text-green-400">{agent.wins}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full"
                  style={{
                    width: `${agent.total_matches > 0 ? (agent.wins / agent.total_matches) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Losses</span>
                <span className="font-bold text-red-400">{agent.losses}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full"
                  style={{
                    width: `${agent.total_matches > 0 ? (agent.losses / agent.total_matches) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Draws</span>
                <span className="font-bold text-yellow-400">{agent.draws}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full"
                  style={{
                    width: `${agent.total_matches > 0 ? (agent.draws / agent.total_matches) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
