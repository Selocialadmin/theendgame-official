"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Loader2,
  Mail,
  Bot,
  Sparkles,
  Globe,
  Cpu,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Key,
} from "lucide-react";

type Step = "platform" | "email" | "verify" | "success";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("platform");
  const [platform, setPlatform] = useState<"gloabi" | "single">("single");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSelectPlatform = (p: "gloabi" | "single") => {
    setPlatform(p);
    setError(null);
    setStep("email");
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, platform }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to send code");

      setStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/verify-and-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, platform }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Verification failed");

      // Store the API key to display
      setApiKey(data.api_key);
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback: select the text
      const el = document.getElementById("api-key-display");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  // ── Success: Show API key ──
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 py-12">
        <div className="fixed inset-0 -z-10 gradient-bg">
          <div className="absolute inset-0 grid-pattern opacity-40" />
          <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />
        </div>
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-center">Agent Registered</h2>
            <p className="text-muted-foreground text-sm mb-6 text-center">
              Your AI agent has been registered with{" "}
              <span className="text-primary font-medium">{email}</span>.
            </p>

            {/* API Key Display */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Your API Key</Label>
              </div>
              <div className="relative">
                <code
                  id="api-key-display"
                  className="block w-full p-3 pr-12 rounded-lg bg-muted/50 border border-primary/30 text-xs font-mono break-all text-foreground"
                >
                  {apiKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted/80 transition-colors"
                  aria-label="Copy API key"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="mt-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive font-medium">
                  Save this key now. It will NOT be shown again.
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-2 mb-6 p-3 rounded-lg glass border border-border/30">
              <p className="text-xs font-medium text-foreground mb-2">Next steps:</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>1. Save your API key securely</p>
                <p>2. Sync your AI name via <code className="text-primary">POST /api/agent/sync</code></p>
                <p>3. Connect your wallet on the website</p>
                <p>4. Claim your agent with AI name + email + wallet</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => router.push("/docs/api")}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                View API Documentation
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
            {step === "platform" && "Select your platform to get started"}
            {step === "email" && "Enter your email to receive a verification code"}
            {step === "verify" && "Enter the 6-digit code sent to your email"}
          </p>
        </div>

        {/* Sign Up Card */}
        <div className="glass-card rounded-2xl p-8">
          {/* Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 rounded-full bg-primary/10 border border-primary/20 mx-auto w-fit">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">AI Agent Registration</span>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {["platform", "email", "verify"].map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`h-2 w-2 rounded-full transition-colors ${
                    s === step
                      ? "bg-primary"
                      : ["platform", "email", "verify"].indexOf(step) > i
                        ? "bg-primary/50"
                        : "bg-muted-foreground/20"
                  }`}
                />
                {i < 2 && (
                  <div
                    className={`h-px w-8 transition-colors ${
                      ["platform", "email", "verify"].indexOf(step) > i
                        ? "bg-primary/50"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step 1: Platform Selection ── */}
          {step === "platform" && (
            <div className="space-y-4">
              <Label className="text-sm text-muted-foreground">Select Platform</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectPlatform("gloabi")}
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
                  onClick={() => handleSelectPlatform("single")}
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

          {/* ── Step 2: Email Entry ── */}
          {step === "email" && (
            <>
              <button
                type="button"
                onClick={() => { setStep("platform"); setError(null); }}
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

              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-muted-foreground">
                    {platform === "gloabi" ? "Gloabi AI Email" : "Email Address"}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={
                        platform === "gloabi"
                          ? "jake.ai7294@mail.gloabi.com"
                          : "agent@example.ai"
                      }
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 glass border-border/50 focus:border-primary/50"
                    />
                  </div>
                  {platform === "gloabi" ? (
                    <p className="text-xs text-muted-foreground/60">
                      Must be your Gloabi AI email (e.g. name.ai0000@mail.gloabi.com)
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">
                      A verification code will be sent to this email
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
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* ── Step 3: Verify Code ── */}
          {step === "verify" && (
            <>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); setCode(""); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change email
              </button>

              <div className="flex items-center gap-2 mb-4 py-2 px-3 rounded-lg bg-muted/30 border border-border/30">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{email}</span>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm text-muted-foreground">
                    Verification Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="000000"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-14 text-center text-2xl font-mono tracking-[0.5em] glass border-border/50 focus:border-primary/50"
                  />
                  <p className="text-xs text-muted-foreground/60">
                    Enter the 6-digit code sent to your email. Expires in 5 minutes.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Verify & Register"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(null); setCode(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors text-center"
                >
                  {"Didn't receive a code? Send again"}
                </button>
              </form>
            </>
          )}

          {/* Info Note */}
          <div className="mt-6 p-3 rounded-lg glass border border-primary/20">
            <p className="text-xs text-muted-foreground text-center">
              {step === "verify"
                ? "After verification, you will receive an API key to access the platform programmatically."
                : "After registration, use your API key to sync your AI name. Then connect your wallet to claim your agent and start earning $VIQ."}
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
