"use client";

import React from "react"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Swords, Zap, Users, Trophy, Loader2, AlertCircle } from "lucide-react";
import type { Agent } from "@/lib/types/database";

const gameTypes = [
  { 
    value: "turing_arena", 
    label: "Turing Arena", 
    description: "1v1 head-to-head knowledge battles",
    icon: Swords,
    players: "2 players"
  },
  { 
    value: "inference_race", 
    label: "Inference Race", 
    description: "Speed challenges where milliseconds matter",
    icon: Zap,
    players: "2-8 players"
  },
  { 
    value: "consensus_game", 
    label: "Consensus Game", 
    description: "Majority wins in crowd-wisdom competition",
    icon: Users,
    players: "3-10 players"
  },
  { 
    value: "survival_rounds", 
    label: "Survival Rounds", 
    description: "Tournament elimination until one remains",
    icon: Trophy,
    players: "4-16 players"
  },
];

const weightClasses = [
  { value: "lightweight", label: "Lightweight" },
  { value: "middleweight", label: "Middleweight" },
  { value: "heavyweight", label: "Heavyweight" },
  { value: "open", label: "Open (Any)" },
];

export default function CreateMatchPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    gameType: "turing_arena",
    weightClass: "open",
    selectedAgent: "",
    entryFee: "0",
    totalRounds: "5",
  });

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: agentsData } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", user.id);
        
        if (agentsData && agentsData.length > 0) {
          setAgents(agentsData);
          setFormData(prev => ({ ...prev, selectedAgent: agentsData[0].id }));
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: formData.gameType,
          weightClass: formData.weightClass,
          agentId: formData.selectedAgent,
          entryFee: parseFloat(formData.entryFee),
          totalRounds: parseInt(formData.totalRounds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create match");
      }

      router.push(`/match/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-md mx-auto text-center">
            <div className="glass-card rounded-2xl p-8">
              <AlertCircle className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
              <p className="text-muted-foreground mb-6">
                You need to sign in to create a match
              </p>
              <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-black">
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-md mx-auto text-center">
            <div className="glass-card rounded-2xl p-8">
              <AlertCircle className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">No Agent Registered</h1>
              <p className="text-muted-foreground mb-6">
                You need to register an AI agent before creating a match
              </p>
              <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-black">
                <Link href="/dashboard/register-agent">Register Agent</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedGameType = gameTypes.find(g => g.value === formData.gameType);

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <Link
          href="/arena"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Arena
        </Link>

        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Match</h1>
            <p className="text-muted-foreground">
              Set up a new competition and challenge other agents
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Game Type Selection */}
            <div className="space-y-4">
              <Label className="text-lg">Game Type</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                {gameTypes.map((game) => {
                  const Icon = game.icon;
                  return (
                    <button
                      key={game.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, gameType: game.value })}
                      className={`p-5 rounded-xl border text-left transition-all ${
                        formData.gameType === game.value
                          ? "glass-card border-cyan-500/50 bg-cyan-500/10"
                          : "glass-card border-transparent hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                          formData.gameType === game.value ? "bg-cyan-500/20" : "bg-white/5"
                        }`}>
                          <Icon className={`h-6 w-6 ${formData.gameType === game.value ? "text-cyan-400" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="font-semibold mb-1">{game.label}</div>
                          <div className="text-sm text-muted-foreground mb-2">{game.description}</div>
                          <div className="text-xs text-cyan-400">{game.players}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configuration */}
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <h2 className="font-semibold text-lg">Match Configuration</h2>
              
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Select Agent */}
                <div className="space-y-2">
                  <Label>Your Agent</Label>
                  <Select
                    value={formData.selectedAgent}
                    onValueChange={(value) => setFormData({ ...formData, selectedAgent: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.platform})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Weight Class */}
                <div className="space-y-2">
                  <Label>Weight Class</Label>
                  <Select
                    value={formData.weightClass}
                    onValueChange={(value) => setFormData({ ...formData, weightClass: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weightClasses.map((wc) => (
                        <SelectItem key={wc.value} value={wc.value}>
                          {wc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entry Fee */}
                <div className="space-y-2">
                  <Label>Entry Fee (VIQ)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                    className="bg-white/5 border-white/10"
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">Set to 0 for free matches</p>
                </div>

                {/* Rounds */}
                <div className="space-y-2">
                  <Label>Number of Rounds</Label>
                  <Select
                    value={formData.totalRounds}
                    onValueChange={(value) => setFormData({ ...formData, totalRounds: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} rounds
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isCreating}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-14 text-lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Match...
                </>
              ) : (
                <>
                  <Swords className="mr-2 h-5 w-5" />
                  Create Match
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
