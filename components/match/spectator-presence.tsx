"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Users } from "lucide-react";

interface SpectatorPresenceProps {
  matchId: string;
}

interface PresenceData {
  total: number;
  humans: { count: number };
  agents: {
    count: number;
    by_platform: Record<string, number>;
    list: Array<{
      id: string;
      name: string;
      platform: string;
      avatar_url?: string;
    }>;
  };
}

// Platform colors for dots
const PLATFORM_COLORS: Record<string, string> = {
  gloabi: "bg-cyan-400",
  moltbook: "bg-amber-400",
  human: "bg-blue-400",
  unknown: "bg-gray-400",
};

export function SpectatorPresence({ matchId }: SpectatorPresenceProps) {
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [sessionId] = useState(() => 
    typeof window !== "undefined" 
      ? localStorage.getItem("spectator_session") || crypto.randomUUID()
      : crypto.randomUUID()
  );

  // Save session ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("spectator_session", sessionId);
    }
  }, [sessionId]);

  // Fetch presence data
  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/presence`);
      if (res.ok) {
        const data = await res.json();
        setPresence(data);
      }
    } catch (error) {
      console.error("Error fetching presence:", error);
    }
  }, [matchId]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(`/api/v1/matches/${matchId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          spectator_type: "human",
        }),
      });
    } catch (error) {
      console.error("Error sending heartbeat:", error);
    }
  }, [matchId, sessionId]);

  useEffect(() => {
    // Initial fetch and heartbeat
    fetchPresence();
    sendHeartbeat();

    // Set up intervals
    const heartbeatInterval = setInterval(sendHeartbeat, 10000); // Every 10 seconds
    const fetchInterval = setInterval(fetchPresence, 5000); // Every 5 seconds

    // Subscribe to realtime changes
    const supabase = createClient();
    if (supabase) {
      const channel = supabase
        .channel(`presence:${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_spectators",
            filter: `match_id=eq.${matchId}`,
          },
          () => {
            fetchPresence();
          }
        )
        .subscribe();

      return () => {
        clearInterval(heartbeatInterval);
        clearInterval(fetchInterval);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(fetchInterval);
    };
  }, [matchId, fetchPresence, sendHeartbeat]);

  if (!presence) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Eye className="h-4 w-4" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  // Generate dots for visualization
  const dots: Array<{ type: string; platform?: string; name?: string }> = [];
  
  // Add human dots
  for (let i = 0; i < Math.min(presence.humans.count, 20); i++) {
    dots.push({ type: "human" });
  }
  
  // Add agent dots
  presence.agents.list.forEach(agent => {
    dots.push({ type: "agent", platform: agent.platform, name: agent.name });
  });

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{presence.total}</span>
          <span className="text-xs text-muted-foreground">watching</span>
        </div>

        {/* Dots visualization */}
        <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
          {dots.slice(0, 30).map((dot, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={`w-2 h-2 rounded-full ${
                    dot.type === "human" 
                      ? PLATFORM_COLORS.human 
                      : PLATFORM_COLORS[dot.platform || "unknown"]
                  } animate-pulse`}
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {dot.type === "human" ? "Human spectator" : `${dot.name || "Agent"} (${dot.platform})`}
              </TooltipContent>
            </Tooltip>
          ))}
          {presence.total > 30 && (
            <span className="text-xs text-muted-foreground ml-1">+{presence.total - 30}</span>
          )}
        </div>

        {/* Breakdown */}
        <div className="flex items-center gap-3 border-l border-border/50 pl-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs text-muted-foreground">{presence.humans.count}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Human spectators</TooltipContent>
          </Tooltip>

          {presence.agents.by_platform.gloabi > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs text-muted-foreground">{presence.agents.by_platform.gloabi}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Gloabi agents watching</TooltipContent>
            </Tooltip>
          )}

          {presence.agents.by_platform.moltbook > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-muted-foreground">{presence.agents.by_platform.moltbook}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Moltbook agents watching</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
