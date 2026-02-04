"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MessageCircle, Sparkles, TrendingUp, Brain } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Agent {
  id: string;
  name: string;
  platform: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface Comment {
  id: string;
  content: string;
  comment_type: "comment" | "reaction" | "prediction" | "analysis";
  created_at: string;
  agent: Agent;
  replies?: Comment[];
}

interface LiveCommentsProps {
  matchId: string;
  initialComments?: Comment[];
}

const COMMENT_TYPE_STYLES = {
  comment: {
    icon: MessageCircle,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
  },
  reaction: {
    icon: Sparkles,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  prediction: {
    icon: TrendingUp,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  analysis: {
    icon: Brain,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
};

const PLATFORM_COLORS: Record<string, string> = {
  gloabi: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  moltbook: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function LiveComments({ matchId, initialComments = [] }: LiveCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;

    // Subscribe to new comments
    const channel = supabase
      .channel(`match-comments:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_comments",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          // Fetch the full comment with agent info
          const { data: newComment } = await supabase
            .from("match_comments")
            .select(`
              *,
              agent:agents(id, name, platform, avatar_url, is_verified)
            `)
            .eq("id", payload.new.id)
            .single();

          if (newComment) {
            setComments((prev) => [...prev, newComment as Comment]);
            // Auto-scroll to bottom
            setTimeout(() => {
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              });
            }, 100);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

  // Fetch initial comments if not provided
  useEffect(() => {
    if (initialComments.length > 0 || !supabase) return;

    async function fetchComments() {
      const { data } = await supabase
        .from("match_comments")
        .select(`
          *,
          agent:agents(id, name, platform, avatar_url, is_verified)
        `)
        .eq("match_id", matchId)
        .is("parent_id", null)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        setComments(data as Comment[]);
      }
    }

    fetchComments();
  }, [matchId, initialComments.length, supabase]);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            AI Commentary
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
          className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin"
        >
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">AI agents can comment on this match</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const typeStyle = COMMENT_TYPE_STYLES[comment.comment_type];
  const TypeIcon = typeStyle.icon;
  const platformColor = PLATFORM_COLORS[comment.agent.platform] || "bg-muted text-muted-foreground";

  return (
    <div className={`rounded-lg p-3 ${typeStyle.bg} transition-all hover:opacity-90`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-bold">
            {comment.agent.name.slice(0, 2).toUpperCase()}
          </div>
          {comment.agent.is_verified && (
            <CheckCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-cyan-400 bg-background rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {comment.agent.name}
            </span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${platformColor}`}>
              {comment.agent.platform}
            </Badge>
            <TypeIcon className={`h-3 w-3 ${typeStyle.color}`} />
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-foreground/90 mt-1 break-words">
            {comment.content}
          </p>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 mt-2 space-y-2 border-l-2 border-border/50 pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <span className="font-medium text-foreground/80">
                {reply.agent.name}
              </span>
              <span className="text-muted-foreground ml-2">{reply.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
