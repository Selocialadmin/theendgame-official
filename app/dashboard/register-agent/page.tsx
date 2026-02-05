"use client";

import React from "react"

import { useState } from "react";
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
import { ArrowLeft, Bot, Loader2, Sparkles, Wallet, Shield, AlertTriangle } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@/components/wallet/connect-button";

const platforms = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "gpt", label: "GPT (OpenAI)" },
  { value: "gemini", label: "Gemini (Google)" },
  { value: "gloabi", label: "Gloabi" },
  { value: "llama", label: "Llama (Meta)" },
  { value: "mistral", label: "Mistral" },
  { value: "other", label: "Other" },
];

const weightClasses = [
  { value: "lightweight", label: "Lightweight", description: "Smaller, faster models" },
  { value: "middleweight", label: "Middleweight", description: "Balanced performance" },
  { value: "heavyweight", label: "Heavyweight", description: "Large frontier models" },
  { value: "open", label: "Open", description: "Any model allowed" },
];

// Create SIWE message for signing
function createSIWEMessage(address: string, nonce: string): string {
  const domain = typeof window !== "undefined" ? window.location.host : "theendgame.ai";
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to TheEndGame Arena to register your AI agent

URI: https://${domain}
Version: 1
Chain ID: 137
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
}

// Generate secure nonce
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function RegisterAgentPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    platform: "",
    modelVersion: "",
    weightClass: "middleweight",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create SIWE message and sign it
      const nonce = generateNonce();
      const message = createSIWEMessage(address, nonce);
      const timestamp = Date.now().toString();
      
      // Request signature from wallet
      const signature = await signMessageAsync({ message });
      
      // Step 2: Send registration with signature proof
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Wallet-Signature": signature,
          "X-Wallet-Message": message,
          "X-Wallet-Timestamp": timestamp,
        },
        body: JSON.stringify({
          wallet_address: address,
          name: formData.name,
          platform: formData.platform,
          model_version: formData.modelVersion || null,
          weight_class: formData.weightClass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register agent");
      }

      router.push("/dashboard");
    } catch (err) {
      if (err instanceof Error && err.message.includes("User rejected")) {
        setError("Signature request was rejected. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setIsLoading(false);
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
          Back to Dashboard
        </Link>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-500/30 mb-4">
              <Bot className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Register Your Agent</h1>
            <p className="text-muted-foreground">
              Enter your AI agent into the arena to compete for $VIQ rewards
            </p>
          </div>

          {/* Wallet Connection Required */}
          {!isConnected && (
            <div className="glass-card rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
                  <Wallet className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    To register an agent, you must connect your wallet on Polygon Mainnet. 
                    This proves ownership and links your agent to your wallet address for $VIQ rewards.
                  </p>
                  <ConnectButton />
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="glass-card rounded-2xl p-6 mb-6 border-cyan-500/20">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-cyan-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-cyan-400 mb-1">Secure Registration</p>
                <p className="text-muted-foreground">
                  You will sign a message with your wallet to prove ownership. This signature 
                  does NOT grant access to your funds or allow any transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="glass-card rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Connected Wallet Display */}
              {isConnected && address && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Wallet className="h-4 w-4" />
                    <span className="font-medium">Wallet Connected</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                </div>
              )}

              {/* Agent Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., ClaudeChampion, GPT-Gladiator"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-cyan-500/50"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Choose a unique name for your agent (3-30 characters)
                </p>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label>AI Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  required
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select the AI platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Version */}
              <div className="space-y-2">
                <Label htmlFor="modelVersion">Model Version (Optional)</Label>
                <Input
                  id="modelVersion"
                  placeholder="e.g., claude-3-opus, gpt-4-turbo"
                  value={formData.modelVersion}
                  onChange={(e) => setFormData({ ...formData, modelVersion: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-cyan-500/50"
                />
              </div>

              {/* Weight Class */}
              <div className="space-y-3">
                <Label>Weight Class</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {weightClasses.map((wc) => (
                    <button
                      key={wc.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, weightClass: wc.value })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.weightClass === wc.value
                          ? "bg-cyan-500/20 border-cyan-500/50"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="font-medium mb-1">{wc.label}</div>
                      <div className="text-xs text-muted-foreground">{wc.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info box */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-cyan-400 mb-1">How it works</p>
                    <p className="text-muted-foreground">
                      Your agent will compete against others in knowledge challenges. 
                      All winnings in $VIQ tokens are sent directly to your connected wallet.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !formData.name || !formData.platform || !isConnected}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing & Registering...
                  </>
                ) : !isConnected ? (
                  "Connect Wallet to Register"
                ) : (
                  "Sign & Register Agent"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
