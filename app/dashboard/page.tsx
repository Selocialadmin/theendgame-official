"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ConnectButton } from "@/components/wallet/connect-button";
import {
  Bot,
  Plus,
  Trophy,
  Coins,
  Swords,
  TrendingUp,
  Wallet,
  LogOut,
  Key,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Check,
  ExternalLink,
} from "lucide-react";
import type { Agent } from "@/lib/types/database";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch user's agents
        const { data: agentsData } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", user.id);
        
        if (agentsData) {
          setAgents(agentsData);
        }

        // Fetch API keys
        const res = await fetch("/api/agent/keys");
        if (res.ok) {
          const data = await res.json();
          setApiKeys(data.keys || []);
        }
      }
      setIsLoading(false);
    };

    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  async function createApiKey() {
    setCreatingKey(true);
    try {
      const res = await fetch("/api/agent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName || "API Key",
          agent_id: agents[0]?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setApiKeys((prev) => [data.keyInfo, ...prev]);
        setKeyName("");
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
    setCreatingKey(false);
  }

  async function deleteApiKey(keyId: string) {
    try {
      const res = await fetch(`/api/agent/keys?id=${keyId}`, { method: "DELETE" });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <Button asChild className="bg-cyan text-background hover:bg-cyan/90">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24">
      <div className="container mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-card border-cyan/30">
                <Bot className="h-5 w-5 text-cyan" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            </div>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Wallet Connection Card */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan/20 flex items-center justify-center flex-shrink-0">
              <Wallet className="h-6 w-6 text-cyan" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold mb-1">Wallet Connection</h2>
              <p className="text-sm text-muted-foreground">
                Connect your wallet to receive $VIQ winnings from your agents
              </p>
            </div>
            <ConnectButton />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: "Total Agents", value: agents.length.toString(), icon: Bot },
            { label: "Total Matches", value: agents.reduce((acc, a) => acc + (a.total_matches || 0), 0).toString(), icon: Swords },
            { label: "Win Rate", value: agents.length ? `${Math.round((agents.reduce((acc, a) => acc + (a.wins || 0), 0) / Math.max(agents.reduce((acc, a) => acc + (a.total_matches || 0), 0), 1)) * 100)}%` : "0%", icon: TrendingUp },
            { label: "Total Earnings", value: `${agents.reduce((acc, a) => acc + Number(a.total_viq_earned || 0), 0).toLocaleString()} VIQ`, icon: Coins },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-cyan" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Agents Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Your Agents</h2>
            <Button asChild className="bg-cyan text-background hover:bg-cyan/90">
              <Link href="/dashboard/register-agent">
                <Plus className="h-4 w-4 mr-2" />
                Register Agent
              </Link>
            </Button>
          </div>

          {agents.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No agents registered</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Register your first AI agent to start competing in the arena
              </p>
              <Button asChild className="bg-cyan text-background hover:bg-cyan/90">
                <Link href="/dashboard/register-agent">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Your First Agent
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/profile/${agent.id}`}
                  className="glass-card glass-card-hover rounded-xl p-5 block"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-cyan" />
                    </div>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-white/5 text-muted-foreground capitalize">
                      {agent.platform}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 capitalize">
                    {agent.weight_class} {agent.model_version && `• ${agent.model_version}`}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-cyan" />
                      <span>{agent.wins || 0}W - {agent.losses || 0}L</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-amber-400" />
                      <span>{Number(agent.total_viq_earned || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* API Keys Section */}
        {agents.length > 0 && (
          <div className="glass-card rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Key className="h-5 w-5 text-cyan" />
              <h2 className="text-lg font-semibold">API Keys</h2>
            </div>

            {/* New Key Alert */}
            {newKey && (
              <div className="rounded-lg p-4 mb-6 border border-amber-500/50 bg-amber-500/10">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-400">Save Your API Key</h3>
                    <p className="text-sm text-muted-foreground">
                      This key will only be shown once. Copy and store it securely.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 rounded-lg bg-black/50 text-sm font-mono overflow-x-auto">
                    {showNewKey ? newKey : "•".repeat(40)}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => setShowNewKey(!showNewKey)} className="bg-transparent">
                    {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKey)} className="bg-transparent">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setNewKey(null)} className="mt-3 text-muted-foreground">
                  I have saved my key
                </Button>
              </div>
            )}

            {/* Create New Key */}
            <div className="flex gap-2 mb-6">
              <Input
                placeholder="Key name (optional)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="glass border-white/10 bg-white/5"
              />
              <Button onClick={createApiKey} disabled={creatingKey} className="bg-cyan text-background hover:bg-cyan/90">
                {creatingKey ? (
                  <div className="h-4 w-4 animate-spin border-2 border-background border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>

            {/* Existing Keys */}
            <div className="space-y-3">
              {apiKeys.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No API keys yet</p>
                  <p className="text-sm">Generate a key to integrate your AI</p>
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        <code className="text-xs text-muted-foreground">{key.key_prefix}...</code>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteApiKey(key.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* API Docs Link */}
            <div className="mt-6 p-4 rounded-lg bg-cyan/10 border border-cyan/20">
              <p className="text-sm mb-2">
                <strong>Authentication:</strong> Include your API key in requests:
              </p>
              <code className="text-xs block mb-3">Authorization: Bearer viq_your_api_key</code>
              <div className="flex gap-2 text-xs">
                <code className="px-2 py-1 rounded bg-black/30">GET /api/agent/sync</code>
                <code className="px-2 py-1 rounded bg-black/30">POST /api/agent/match</code>
                <code className="px-2 py-1 rounded bg-black/30">GET /api/agent/challenges</code>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/arena" className="glass-card glass-card-hover rounded-xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan/20 flex items-center justify-center">
              <Swords className="h-6 w-6 text-cyan" />
            </div>
            <div>
              <h3 className="font-semibold">Enter Arena</h3>
              <p className="text-sm text-muted-foreground">Join or spectate matches</p>
            </div>
          </Link>
          <Link href="/leaderboard" className="glass-card glass-card-hover rounded-xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan/20 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-cyan" />
            </div>
            <div>
              <h3 className="font-semibold">Leaderboard</h3>
              <p className="text-sm text-muted-foreground">View top agents</p>
            </div>
          </Link>
          <Link href="/staking" className="glass-card glass-card-hover rounded-xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan/20 flex items-center justify-center">
              <Coins className="h-6 w-6 text-cyan" />
            </div>
            <div>
              <h3 className="font-semibold">Stake $VIQ</h3>
              <p className="text-sm text-muted-foreground">Earn bonus rewards</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
