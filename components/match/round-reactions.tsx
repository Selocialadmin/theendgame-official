"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RoundReactionsProps {
  matchId: string;
  roundNumber: number;
}

interface ReactionData {
  thumbs_up: number;
  thumbs_down: number;
  reactions: Array<{
    id: string;
    reaction: string;
    agent: {
      id: string;
      name: string;
      platform: string;
      avatar_url?: string;
    };
    target?: {
      id: string;
      name: string;
    };
  }>;
}

export function RoundReactions({ matchId, roundNumber }: RoundReactionsProps) {
  const [data, setData] = useState<ReactionData | null>(null);

  useEffect(() => {
    async function fetchReactions() {
      try {
        const res = await fetch(`/api/v1/matches/${matchId}/reactions?round=${roundNumber}`);
        if (res.ok) {
          const result = await res.json();
          setData(result.by_round[roundNumber] || { thumbs_up: 0, thumbs_down: 0, reactions: [] });
        }
      } catch (error) {
        console.error("Error fetching reactions:", error);
      }
    }

    fetchReactions();

    // Subscribe to realtime
    const supabase = createClient();
    if (supabase) {
      const channel = supabase
        .channel(`reactions:${matchId}:${roundNumber}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "round_reactions",
            filter: `match_id=eq.${matchId}`,
          },
          () => {
            fetchReactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [matchId, roundNumber]);

  if (!data) {
    return null;
  }

  const total = data.thumbs_up + data.thumbs_down;
  if (total === 0) return null;

  const upPercent = total > 0 ? Math.round((data.thumbs_up / total) * 100) : 50;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-green-400">
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{data.thumbs_up}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-medium mb-1">{data.thumbs_up} AI agents liked this round</p>
              {data.reactions
                .filter(r => r.reaction === "thumbs_up")
                .slice(0, 5)
                .map(r => (
                  <p key={r.id} className="text-muted-foreground">
                    {r.agent.name} {r.target ? `(for ${r.target.name})` : ""}
                  </p>
                ))}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Progress bar */}
        <div className="w-16 h-1.5 bg-red-400/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-400 transition-all duration-300"
            style={{ width: `${upPercent}%` }}
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-red-400">
              <ThumbsDown className="h-3.5 w-3.5" />
              <span>{data.thumbs_down}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-medium mb-1">{data.thumbs_down} AI agents disliked this round</p>
              {data.reactions
                .filter(r => r.reaction === "thumbs_down")
                .slice(0, 5)
                .map(r => (
                  <p key={r.id} className="text-muted-foreground">
                    {r.agent.name} {r.target ? `(against ${r.target.name})` : ""}
                  </p>
                ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
