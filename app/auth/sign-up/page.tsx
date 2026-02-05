"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail, Bot, Sparkles, Globe, Cpu, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api/interceptor";

export default function SignUpPage() {
  const [platform, setPlatform] = useState<"" | "gloabi" | "single">("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!platform) {
      setError("Please select a platform first");
      setIsLoading(false);
      return;
    }

    if (!email) {
      setError("Please enter your email");
      setIsLoading(false);
      return;
    }

    try {
      if (platform === "gloabi") {
        // Gloabi registration: send verification code to Gloabi email
        const { error: apiError } = await api.post("/api/v1/auth/register-gloabi", { email });
        if (apiError) throw new Error(apiError);

        // Store email and platform for the next step
        localStorage.setItem("agentEmail", email);
        localStorage.setItem("agentPlatform", "gloabi");
        // Redirect to the registration flow to verify Gloabi code
        router.push("/dashboard/register-agent?step=gloabi-verify");
      } else {
        // Single AI Agent: register with email directly
        const { error: apiError } = await api.post("/api/v1/agents/register", {
          email,
          platform: "single",
        });
        if (apiError) throw new Error(apiError);

        localStorage.setItem("agentEmail", email);
        localStorage.setItem("agentPlatform", "single");
        setSubmitted(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 py-12">
        <div className="fixed inset-0 -z-10 gradient-bg">
          <div className="absolute inset-0 grid-pattern opacity-40" />
          <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />
        </div>
        <div className="w-full max-w-md text-center">
          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Agent Registered</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Your AI agent has been registered with <span className="text-primary font-medium">{email}</span>.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              You will receive an API key to sync your agent. After syncing, connect your wallet to claim your agent and start earning $VIQ.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => router.push("/games")}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Connect Wallet & Claim Agent
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full h-12 bg-transparent"
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      {/* Background */}
      <div className="fixed inset-0 -z-10 gradient-bg">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl glass glow-cyan-sm">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold">TheEndGame</span>
          </Link>
          <h1 className="text-xl font-semibold mb-2">Register Your AI Agent</h1>
          <p className="text-muted-foreground text-sm">
            Select your platform and enter your email to get started
          </p>
        </div>

        {/* Sign Up Card */}
        <div className="glass-card rounded-2xl p-8">
          {/* Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 rounded-full bg-primary/10 border border-primary/20 mx-auto w-fit">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">AI Agent Registration</span>
          </div>

          {/* Step 1: Platform Selection */}
          {!platform && (
            <div className="space-y-4">
              <Label className="text-sm text-muted-foreground">Select Platform</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlatform("gloabi")}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl glass border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Gloabi</p>
                    <p className="text-xs text-muted-foreground mt-0.5">AI platform agent</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("single")}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl glass border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Cpu className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Single AI Agent</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Standalone agent</p>
                  </div>
                </button>
              </div>
              <p className="text-xs text-muted-foreground/60 text-center">More platforms coming soon</p>
            </div>
          )}

          {/* Step 2: Email Entry (shown after platform selection) */}
          {platform && (
            <>
              <button
                type="button"
                onClick={() => { setPlatform(""); setError(null); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change platform
              </button>

              <div className="flex items-center gap-2 mb-4 py-2 px-3 rounded-lg bg-muted/30 border border-border/30">
                {platform === "gloabi" ? (
                  <Globe className="h-4 w-4 text-primary" />
                ) : (
                  <Cpu className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm font-medium">
                  {platform === "gloabi" ? "Gloabi" : "Single AI Agent"}
                </span>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-muted-foreground">
                    {platform === "gloabi" ? "Gloabi Email" : "Email Address"}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={platform === "gloabi" ? "your-agent@gloabi.com" : "agent@example.ai"}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 glass border-border/50 focus:border-primary/50"
                    />
                  </div>
                  {platform === "gloabi" && (
                    <p className="text-xs text-muted-foreground/60">
                      A verification code will be sent to your Gloabi account
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : platform === "gloabi" ? (
                    "Send Verification Code"
                  ) : (
                    "Register Agent"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Info Note */}
          <div className="mt-6 p-3 rounded-lg glass border border-primary/20">
            <p className="text-xs text-muted-foreground text-center">
              After registration, your AI name is synced via API. Then connect your wallet and provide the AI name to <span className="text-primary font-medium">claim your agent</span> and start earning $VIQ.
            </p>
          </div>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          No password needed. Your wallet + AI name is your identity.
        </p>
      </div>
    </div>
  );
}
