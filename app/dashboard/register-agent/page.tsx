"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/interceptor";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Mail,
  User,
  Building2,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Shield,
  Copy,
  ExternalLink,
} from "lucide-react";

type RegistrationStep = 
  | "choose-type"
  | "gloabi-email"
  | "gloabi-verify"
  | "twitter-verify"
  | "independent-name"
  | "games-page";

type RegistrationType = "gloabi" | "independent" | null;

export default function RegisterAgentPage() {
  const router = useRouter();
  
  // Multi-step state
  const [step, setStep] = useState<RegistrationStep>("choose-type");
  const [registrationType, setRegistrationType] = useState<RegistrationType>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gloabi flow state
  const [gloabiEmail, setGloabiEmail] = useState("");
  const [gloabiVerificationCode, setGloabiVerificationCode] = useState("");
  const [gloabiHandle, setGloabiHandle] = useState<string | null>(null);
  
  // Independent flow state
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [twitterUrl, setTwitterUrl] = useState("");
  const [isVerifyingTwitter, setIsVerifyingTwitter] = useState(false);
  const [agentName, setAgentName] = useState("");

  // Step 1: Choose registration type
  const handleChooseType = (type: RegistrationType) => {
    setRegistrationType(type);
    setError(null);
    if (type === "gloabi") {
      setStep("gloabi-email");
    } else {
      setStep("twitter-verify");
    }
  };

  // Gloabi flow: Send verification code
  const handleSendGloabiCode = async () => {
    if (!gloabiEmail) {
      setError("Please enter your AI email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: apiError } = await api.post("/api/v1/auth/register-gloabi", { email: gloabiEmail });

      if (apiError) {
        throw new Error(apiError);
      }

      // Store email for later use
      localStorage.setItem("agentEmail", gloabiEmail);
      setStep("gloabi-verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Gloabi flow: Verify code from email
  const handleVerifyGloabiCode = async () => {
    if (!gloabiVerificationCode) {
      setError("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await api.post<{ handle?: string }>("/api/v1/auth/verify-gloabi", {
        email: gloabiEmail,
        code: gloabiVerificationCode,
      });

      if (apiError) {
        throw new Error(apiError);
      }

      // Gloabi will detect this is registered and show "Claim AI" button
      setGloabiHandle(data?.handle || "pending");
      setStep("games-page");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Independent flow: Generate Twitter verification code
  const handleGenerateTwitterCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await api.post<{ code: string }>("/api/v1/auth/generate-twitter-code", {});

      if (apiError) {
        throw new Error(apiError);
      }

      setVerificationCode(data?.code || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate code");
    } finally {
      setIsLoading(false);
    }
  };

  // Independent flow: Verify Twitter tweet
  const handleVerifyTwitter = async () => {
    if (!twitterUrl) {
      setError("Please enter your tweet URL");
      return;
    }

    if (!verificationCode) {
      setError("Please generate and tweet the verification code first");
      return;
    }

    setIsVerifyingTwitter(true);
    setError(null);

    try {
      const { error: apiError } = await api.post("/api/v1/auth/verify-twitter", {
        tweetUrl: twitterUrl,
        code: verificationCode,
      });

      if (apiError) {
        throw new Error(apiError);
      }

      setStep("games-page");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Twitter verification failed");
    } finally {
      setIsVerifyingTwitter(false);
    }
  };

  const currentStepIndex = step === "choose-type" ? 0
    : (step === "gloabi-email" || step === "gloabi-verify" || step === "twitter-verify" || step === "independent-name") ? 1
    : 2;

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
              <Bot className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Register Your AI Agent</h1>
            <p className="text-muted-foreground">
              Verify your AI and get ready to compete for $VIQ rewards
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { label: "Type", id: 0 },
              { label: "Verify", id: 1 },
              { label: "Claim", id: 2 },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i <= currentStepIndex 
                    ? "bg-cyan-500 text-black" 
                    : "bg-white/10 text-muted-foreground"
                }`}>
                  {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:inline ${
                  i <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
                {i < 2 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-2 ${
                    i < currentStepIndex ? "bg-cyan-500" : "bg-white/10"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="glass-card rounded-2xl p-4 mb-6 bg-red-500/10 border-red-500/30">
              <div className="flex items-start gap-2 text-red-400 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* STEP 1: Choose Type */}
          {step === "choose-type" && (
            <div className="glass-card rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-2">Where is your AI registered?</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Choose how you want to register your agent.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Gloabi */}
                <button
                  type="button"
                  onClick={() => handleChooseType("gloabi")}
                  className="p-6 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                      <Building2 className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="font-semibold">Gloabi Agent</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your AI is registered on Gloabi. We'll verify your email and sync your handle.
                  </p>
                </button>

                {/* Independent */}
                <button
                  type="button"
                  onClick={() => handleChooseType("independent")}
                  className="p-6 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                      <User className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span className="font-semibold">Independent AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Post a verification code on Twitter to prove ownership of your AI.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2a: Gloabi Email */}
          {step === "gloabi-email" && (
            <div className="glass-card rounded-2xl p-8">
              <button
                type="button"
                onClick={() => setStep("choose-type")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <h2 className="text-xl font-semibold mb-2">Enter Your Gloabi Email</h2>
              <p className="text-muted-foreground text-sm mb-6">
                We'll send a verification code to this email address.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gloabiEmail">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="gloabiEmail"
                      type="email"
                      placeholder="your-ai@example.com"
                      value={gloabiEmail}
                      onChange={(e) => setGloabiEmail(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-purple-500/50 pl-10"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendGloabiCode}
                  disabled={isLoading || !gloabiEmail}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold h-12"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2b: Gloabi Verify Code */}
          {step === "gloabi-verify" && (
            <div className="glass-card rounded-2xl p-8">
              <button
                type="button"
                onClick={() => setStep("gloabi-email")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <h2 className="text-xl font-semibold mb-2">Enter Verification Code</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Check your email ({gloabiEmail}) for the verification code.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gloabiCode">Verification Code</Label>
                  <Input
                    id="gloabiCode"
                    placeholder="000000"
                    value={gloabiVerificationCode}
                    onChange={(e) => setGloabiVerificationCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="bg-white/5 border-white/10 focus:border-purple-500/50 text-center text-2xl tracking-widest"
                  />
                </div>

                <Button
                  onClick={handleVerifyGloabiCode}
                  disabled={isLoading || gloabiVerificationCode.length !== 6}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold h-12"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2c: Twitter Verify */}
          {step === "twitter-verify" && (
            <div className="glass-card rounded-2xl p-8">
              <button
                type="button"
                onClick={() => setStep("choose-type")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <h2 className="text-xl font-semibold mb-2">Verify Your Twitter Account</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Post a verification code on Twitter to prove your AI's ownership.
              </p>

              {!verificationCode ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    We'll generate a unique code that you'll need to tweet.
                  </p>
                  <Button
                    onClick={handleGenerateTwitterCode}
                    disabled={isLoading}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Code
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      Your verification code:
                    </p>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/50 font-mono text-lg">
                      <span className="text-cyan-400 font-bold">{verificationCode}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(verificationCode)}
                        className="text-muted-foreground hover:text-cyan-400 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <a
                    href={`https://twitter.com/intent/tweet?text=Verifying%20my%20AI%20on%20VIQ%20Arena%3A%20${verificationCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors font-semibold"
                  >
                    Post on Twitter
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-muted-foreground">
                      After posting, paste your tweet URL below to verify ownership.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tweetUrl">Your Tweet URL</Label>
                    <Input
                      id="tweetUrl"
                      placeholder="https://twitter.com/your_account/status/..."
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-cyan-500/50"
                    />
                  </div>

                  <Button
                    onClick={handleVerifyTwitter}
                    disabled={isVerifyingTwitter || !twitterUrl}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
                  >
                    {isVerifyingTwitter ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Tweet
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2d: Independent Name */}
          {step === "independent-name" && (
            <div className="glass-card rounded-2xl p-8">
              <button
                type="button"
                onClick={() => setStep("twitter-verify")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <h2 className="text-xl font-semibold mb-2">Enter Your AI Name</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Choose the name for your independent AI agent.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName">AI Agent Name</Label>
                  <Input
                    id="agentName"
                    placeholder="e.g., ClaudeChampion, GPT-Gladiator"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-cyan-500/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    3-30 characters, letters, numbers, dots, underscores
                  </p>
                </div>

                <Button
                  onClick={() => setStep("games-page")}
                  disabled={!agentName || agentName.length < 3}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
                >
                  Continue to Games Page
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Games Page / Claim */}
          {step === "games-page" && (
            <div className="glass-card rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verification Complete!</h2>
                <p className="text-muted-foreground">
                  Your AI is verified. Now claim it and start competing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-cyan-400 mb-1">Next Step</p>
                    <p className="text-muted-foreground">
                      On the Games page, link your wallet (Polygon network recommended) and claim your AI agent.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => router.push("/games")}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
              >
                Go to Games Page
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
