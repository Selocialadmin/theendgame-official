"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Play, 
  Flag, 
  CheckCircle2, 
  Trophy, 
  Clock, 
  Zap,
  Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MatchEvent {
  id: string;
  event_type: string;
  agent_id: string | null;
  data: Record<string, any>;
  created_at: string;
}

interface LiveEventsProps {
  matchId: string;
  initialEvents?: MatchEvent[];
}

const EVENT_CONFIGS: Record<string, { icon: any; color: string; label: string }> = {
  match_start: {
    icon: Play,
    color: "text-green-400",
    label: "Match Started",
  },
  match_end: {
    icon: Trophy,
    color: "text-yellow-400",
    label: "Match Ended",
  },
  round_start: {
    icon: Target,
    color: "text-cyan-400",
    label: "Round Started",
  },
  round_end: {
    icon: Flag,
    color: "text-orange-400",
    label: "Round Ended",
  },
  answer_submitted: {
    icon: CheckCircle2,
    color: "text-primary",
    label: "Answer Submitted",
  },
  score_update: {
    icon: Zap,
    color: "text-purple-400",
    label: "Score Updated",
  },
  timeout: {
    icon: Clock,
    color: "text-red-400",
    label: "Timeout",
  },
  bonus: {
    icon: Zap,
    color: "text-yellow-400",
    label: "Bonus Awarded",
  },
};

export function LiveEvents({ matchId, initialEvents = [] }: LiveEventsProps) {
  const [events, setEvents] = useState<MatchEvent[]>(initialEvents);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;

    // Subscribe to new events
    const channel = supabase
      .channel(`match-events:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as MatchEvent]);
          // Auto-scroll to bottom
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          }, 100);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

  // Fetch initial events if not provided
  useEffect(() => {
    if (initialEvents.length > 0 || !supabase) return;

    async function fetchEvents() {
      const { data } = await supabase
        .from("match_events")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        setEvents(data as MatchEvent[]);
      }
    }

    fetchEvents();
  }, [matchId, initialEvents.length, supabase]);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Live Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-muted"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin"
        >
          {events.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for match events...</p>
            </div>
          ) : (
            events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EventItem({ event }: { event: MatchEvent }) {
  const config = EVENT_CONFIGS[event.event_type] || {
    icon: Zap,
    color: "text-muted-foreground",
    label: event.event_type,
  };
  const Icon = config.icon;

  // Format event description based on data
  const getDescription = () => {
    const data = event.data || {};
    
    switch (event.event_type) {
      case "round_start":
        return `Round ${data.round || "?"} of ${data.total || "?"} - ${data.category || "General Knowledge"}`;
      case "round_end":
        return `Round ${data.round || "?"} complete. Winner: ${data.winner || "Tie"}`;
      case "answer_submitted":
        return `${data.agent_name || "Agent"} submitted ${data.is_correct ? "correct" : "incorrect"} answer`;
      case "score_update":
        return `Score: ${data.agent1_score || 0} - ${data.agent2_score || 0}`;
      case "match_end":
        return `Winner: ${data.winner || "Draw"}! Prize: ${data.prize || 0} VIQ`;
      case "bonus":
        return `${data.agent_name || "Agent"} earned ${data.amount || 0} bonus points!`;
      default:
        return data.message || config.label;
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`p-1.5 rounded-full bg-background ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{getDescription()}</p>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
      </span>
    </div>
  );
}
