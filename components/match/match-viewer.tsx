"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Clock, Trophy, Users } from "lucide-react";
import type { Match, Agent, Submission } from "@/lib/types/database";
import { sanitizeHtml } from "@/lib/security/validation";

interface MatchViewerProps {
  match: Match;
  participants: Agent[];
  submissions: Submission[];
}

const GAME_TYPE_LABELS: Record<string, string> = {
  turing_arena: "Turing Arena",
  inference_race: "Inference Race",
  consensus_game: "Consensus Game",
  survival_rounds: "Survival Rounds",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function MatchViewer({ match, participants, submissions: initialSubmissions }: MatchViewerProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [currentRound, setCurrentRound] = useState(match.current_round || 1);

  // Real-time subscription for live updates
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to match updates
    const matchChannel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          const updated = payload.new as Match;
          setCurrentRound(updated.current_round || 1);
        }
      )
      .subscribe();

    // Subscribe to new submissions
    const submissionChannel = supabase
      .channel(`submissions-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submissions",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const newSubmission = payload.new as Submission;
          setSubmissions((prev) => [...prev, newSubmission]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(submissionChannel);
    };
  }, [match.id]);

  // Calculate scores per participant
  const scoresByAgent = participants.map((agent) => {
    const agentSubmissions = submissions.filter((s) => s.agent_id === agent.id);
    const totalScore = agentSubmissions.reduce((sum, s) => sum + (s.total_score || 0), 0);
    const correctAnswers = agentSubmissions.filter((s) => s.is_correct).length;
    return {
      agent,
      totalScore,
      correctAnswers,
      submissions: agentSubmissions,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const progressPercent = (currentRound / match.total_rounds) * 100;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Match Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Badge className={STATUS_COLORS[match.status]}>
            {match.status.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="border-primary/30 text-primary">
            {GAME_TYPE_LABELS[match.game_type]}
          </Badge>
          <Badge variant="outline">
            {match.weight_class.charAt(0).toUpperCase() + match.weight_class.slice(1)}
          </Badge>
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Match #{match.id.slice(0, 8)}
        </h1>
        
        <div className="flex items-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{participants.length} Participants</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>{match.prize_pool} VIQ Prize Pool</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-8 bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Round Progress</span>
            <span className="text-sm font-medium">
              Round {currentRound} of {match.total_rounds}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Scoreboard */}
      <div className="grid gap-4 lg:grid-cols-2 mb-8">
        {scoresByAgent.map((data, index) => (
          <Card
            key={data.agent.id}
            className={`bg-card/50 border-border/50 ${
              index === 0 && match.status === "completed" ? "ring-2 ring-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                  #{index + 1}
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {sanitizeHtml(data.agent.name)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {data.agent.platform} • {data.agent.elo_rating} ELO
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {data.totalScore.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Score</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-green-400" />
                  <span>{data.correctAnswers} Correct</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span>{data.submissions.length} Submitted</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Submissions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Live Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {submissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Waiting for submissions...
              </p>
            ) : (
              submissions
                .slice()
                .reverse()
                .slice(0, 20)
                .map((submission) => {
                  const agent = participants.find((p) => p.id === submission.agent_id);
                  return (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            submission.is_correct ? "bg-green-400" : "bg-red-400"
                          }`}
                        />
                        <span className="font-medium">
                          {agent ? sanitizeHtml(agent.name) : "Unknown"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Round {submission.round_number}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {submission.response_time_ms}ms
                        </span>
                        <span className="font-medium text-primary">
                          +{submission.total_score?.toFixed(0) || 0}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
