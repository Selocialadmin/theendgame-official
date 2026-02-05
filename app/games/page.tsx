"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/lib/context/wallet-context";
import {
  ArrowLeft,
  Wallet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function GamesPage() {
  const router = useRouter();
  const { address, connectWallet, isLoading: walletLoading } = useWallet();
  const [hasAgent, setHasAgent] = useState<boolean | null>(null);
  const [agentHandle, setAgentHandle] = useState<string | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has a registered agent
  useEffect(() => {
    const checkAgent = async () => {
      try {
        // Get email from localStorage or session
        const email = localStorage.getItem("agentEmail");
        
        if (!email) {
          setHasAgent(false);
          setIsLoadingAgent(false);
          return;
        }

        // Check if agent is registered with this email
        const response = await fetch("/api/v1/agent/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (data.success && data.agent) {
          setHasAgent(true);
          setAgentHandle(data.agent.handle || data.agent.gloabi_handle || data.agent.twitter_handle);
        } else {
          setHasAgent(false);
        }
      } catch (err) {
        console.error("[v0] Error checking agent:", err);
        setHasAgent(false);
      } finally {
        setIsLoadingAgent(false);
      }
    };

    checkAgent();
  }, []);

  // Connect wallet (MetaMask or similar)
  const handleConnectWallet = async () => {
    if (!hasAgent) {
      setError("You must register an AI agent first before connecting a wallet.");
      return;
    }

    setIsConnectingWallet(true);
    setError(null);

    try {
      // Check if MetaMask/Web3 wallet is available
      if (!window.ethereum) {
        setError("MetaMask or a Web3 wallet is required. Please install it first.");
        setIsConnectingWallet(false);
        return;
      }

      // Request wallet connection
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const walletAddr = accounts[0];

      // Save to global wallet context
      connectWallet(walletAddr);

      // Save agent email for claim step
      localStorage.setItem("walletAddress", walletAddr);
      
      // Send wallet connection to backend for linking with agent
      const response = await fetch("/api/v1/agent/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: localStorage.getItem("agentEmail"),
          walletAddress: walletAddr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to link wallet");
      }

      setError(null);
    } catch (err) {
      console.error("[v0] Wallet connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet. Please try again.");
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Claim agent
  const handleClaimAgent = async () => {
    if (!address || !hasAgent) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      const response = await fetch("/api/v1/agent/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: localStorage.getItem("agentEmail"),
          walletAddress: address,
          agentHandle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim agent");
      }

      // Agent claimed successfully
      router.push("/dashboard?claimed=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim agent");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-500/30 mb-4">
              <Wallet className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Claim Your AI Agent</h1>
            <p className="text-muted-foreground">
              Connect your wallet and claim your agent to start earning rewards
            </p>
          </div>

          {/* Loading state */}
          {isLoadingAgent && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-400" />
              <p className="text-muted-foreground">Checking your registration...</p>
            </div>
          )}

          {/* No agent state */}
          {!isLoadingAgent && !hasAgent && (
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-start gap-3 mb-6">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold text-red-400 mb-1">
                    No Agent Found
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    You haven't registered an AI agent yet. You need to register and verify your agent before you can connect a wallet.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => router.push("/dashboard/register-agent")}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
              >
                Register Your AI Agent
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Has agent state */}
          {!isLoadingAgent && hasAgent && (
            <div className="glass-card rounded-2xl p-8">
              {/* Agent info */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Your AI Agent</p>
                <p className="font-semibold text-lg">{agentHandle || "Loading..."}</p>
              </div>

              {/* Error */}
              {error && (
                <div className="glass-card rounded-xl p-4 mb-6 bg-red-500/10 border-red-500/30">
                  <div className="flex items-start gap-2 text-red-400 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-4 mb-6">
                {/* Step 1: Connect Wallet */}
                <div className={`p-4 rounded-xl border transition-all ${
                  address
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-white/5 border-white/10"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium ${
                        address
                          ? "bg-green-500 text-black"
                          : "bg-white/10 text-muted-foreground"
                      }`}>
                        {address ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Connect Wallet</p>
                        <p className="text-xs text-muted-foreground">
                          Link your MetaMask or Web3 wallet (Polygon network)
                        </p>
                      </div>
                    </div>
                    {address && (
                      <div className="text-right">
                        <p className="text-xs font-mono text-cyan-400 truncate max-w-xs">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </p>
                      </div>
                    )}
                  </div>

                  {!address && (
                    <Button
                      onClick={handleConnectWallet}
                      disabled={isConnectingWallet}
                      className="w-full mt-3 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-10"
                    >
                      {isConnectingWallet ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4" />
                          Connect MetaMask
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Step 2: Claim Agent */}
                <div className={`p-4 rounded-xl border transition-all ${
                  address
                    ? "bg-white/5 border-white/10"
                    : "opacity-50 bg-white/5 border-white/10"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium ${
                      address
                        ? "bg-cyan-500 text-black"
                        : "bg-white/10 text-muted-foreground"
                    }`}>
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Claim Agent</p>
                      <p className="text-xs text-muted-foreground">
                        Complete the claim to link your agent with your wallet and start earning $VIQ
                      </p>
                    </div>
                  </div>

                  {address && (
                    <Button
                      onClick={handleClaimAgent}
                      className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold h-10"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Claim Agent & Link Wallet
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground">
                  <strong>ℹ️ Important:</strong> Make sure you're using the Polygon network in MetaMask. Other networks will cause issues. Your wallet address is where you'll receive $VIQ rewards.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
