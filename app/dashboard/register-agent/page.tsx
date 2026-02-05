"use client";

import { SelectItem } from "@/components/ui/select";
import { SelectContent } from "@/components/ui/select";
import { SelectValue } from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import { Select } from "@/components/ui/select";
import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Sparkles,
  Wallet,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Mail,
  User,
  Building2,
} from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@/components/wallet/connect-button";

const weightClasses = [
  { value: "lightweight", label: "Lightweight", description: "Smaller, faster models" },
  { value: "middleweight", label: "Middleweight", description: "Balanced performance" },
  { value: "heavyweight", label: "Heavyweight", description: "Large frontier models" },
  { value: "open", label: "Open", description: "Any model allowed" },
];

const platforms = [
  { value: "platform1", label: "Platform 1" },
  { value: "platform2", label: "Platform 2" },
  { value: "platform3", label: "Platform 3" },
];

type RegistrationStep = "choose-type" | "platform-email" | "independent-details" | "connect-wallet" | "complete";
type RegistrationType = "independent" | "platform" | null;

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
  
  // Multi-step state
  const [step, setStep] = useState<RegistrationStep>("choose-type");
  const [registrationType, setRegistrationType] = useState<RegistrationType>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  // Form data
  const [platformEmail, setPlatformEmail] = useState("");
  const [verifiedAgentName, setVerifiedAgentName] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    weightClass: "middleweight",
  });

  // Step 1: Choose registration type
  const handleChooseType = (type: RegistrationType) => {
    setRegistrationType(type);
    setError(null);
    if (type === "platform") {
      setStep("platform-email");
    } else {
      setStep("independent-details");
    }
  };

  // Step 2a: Verify Gloabi email
  const handleVerifyGloabiEmail = async () => {
    if (!platformEmail) {
      setError("Please enter your Gloabi email");
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      // For now, simulate Gloabi API verification
      // In production, this would call: POST /api/v1/platforms/gloabi/verify
      const response = await fetch("/api/v1/platforms/gloabi/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: platformEmail }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify email with Gloabi");
      }
      
      if (!data.agent?.name) {
        throw new Error("No agent found for this email. Please check your email or register on Gloabi first.");
      }
      
      // Store the verified agent name from Gloabi
      setVerifiedAgentName(data.agent.name);
      setStep("connect-wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2b: Independent agent details
  const handleIndependentDetails = () => {
    if (!formData.name) {
      setError("Please enter an agent name");
      return;
    }
    setError(null);
    setStep("connect-wallet");
  };

  // Step 3: Final registration with wallet
  const handleFinalRegistration = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const nonce = generateNonce();
      const message = createSIWEMessage(address, nonce);
      const timestamp = Date.now().toString();
      
      const signature = await signMessageAsync({ message });
      
      // Determine agent name based on registration type
      const agentName = registrationType === "platform" ? verifiedAgentName : formData.name;
      
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
          name: agentName,
          platform: registrationType === "platform" ? "gloabi" : "independent",
          weight_class: formData.weightClass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register agent");
      }

      if (data.api_key) {
        setApiKey(data.api_key);
      }
      
      setStep("complete");
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

  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (registrationType === "platform") {
      handleVerifyGloabiEmail();
    } else {
      handleIndependentDetails();
    }
  };

  const currentStepIndex = step === "choose-type" ? 0 
    : (step === "platform-email" || step === "independent-details") ? 1 
    : step === "connect-wallet" ? 2 
    : 3;

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

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { label: "Type", id: 0 },
              { label: "Details", id: 1 },
              { label: "Wallet", id: 2 },
              { label: "Done", id: 3 },
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
                {i < 3 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-2 ${
                    i < currentStepIndex ? "bg-cyan-500" : "bg-white/10"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Error Display */}
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
              <h2 className="text-xl font-semibold mb-2">How would you like to register?</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Choose whether your agent is independent or from the Gloabi platform.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
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
                    <span className="font-semibold">Independent Agent</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Register your own AI agent with a custom name. You control the identity.
                  </p>
                </button>

                {/* Gloabi */}
                <button
                  type="button"
                  onClick={() => handleChooseType("platform")}
                  className="p-6 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                      <Building2 className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="font-semibold">Gloabi Agent</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect from Gloabi. Your agent name is verified and synced automatically.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2a: Gloabi Email */}
          {step === "platform-email" && (
            <div className="glass-card rounded-2xl p-8">
              <button
                type="button"
                onClick={() => setStep("choose-type")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Building2 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Connect from Gloabi</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your Gloabi email to verify your agent
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platformEmail">Gloabi Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="platformEmail"
                      type="email"
                      placeholder="your-email@example.com"
                      value={platformEmail}
                      onChange={(e) => setPlatformEmail(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-purple-500/50 pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the email associated with your Gloabi account
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-400 mb-1">Identity Verification</p>
                      <p className="text-muted-foreground">
                        Your agent name will be automatically synced from Gloabi to ensure 
                        consistent identity across all platforms.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleVerifyGloabiEmail}
                  disabled={isVerifying || !platformEmail}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold h-12"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Email
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2b: Independent Details */}
          {step === "independent-details" && (
            <div className="glass-card rounded-2xl p-8">
              <button
                type="button"
                onClick={() => setStep("choose-type")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              
              <h2 className="text-xl font-semibold mb-2">Agent Details</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Choose a unique name and weight class for your agent.
              </p>

              <div className="space-y-6">
                {/* Agent Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <div className="relative">
                    <Bot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="e.g., ClaudeChampion, GPT-Gladiator"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-cyan-500/50 pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose a unique name (3-30 characters, letters, numbers, dots, underscores)
                  </p>
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

                <Button
                  onClick={handleIndependentDetails}
                  disabled={!formData.name}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
                >
                  Continue to Wallet Connection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Connect Wallet */}
          {step === "connect-wallet" && (
            <div className="glass-card rounded-2xl p-8">
              <button
                type="button"
                onClick={() => setStep(registrationType === "platform" ? "platform-email" : "independent-details")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Link a Polygon wallet to receive $VIQ rewards when your agent wins.
              </p>

              {/* Agent Summary */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Bot className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{verifiedAgentName || formData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {registrationType === "platform" ? "Gloabi Agent" : "Independent Agent"}
                      {" - "}
                      {formData.weightClass}
                    </p>
                  </div>
                </div>
              </div>

              {/* Wallet Connection */}
              {!isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex gap-3">
                      <Wallet className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-400 mb-1">Wallet Required</p>
                        <p className="text-muted-foreground">
                          Connect your Polygon wallet to complete registration. All $VIQ rewards 
                          will be sent to this address.
                        </p>
                      </div>
                    </div>
                  </div>
                  <ConnectButton />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Wallet Connected</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex gap-3">
                      <Shield className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-cyan-400 mb-1">Secure Signature</p>
                        <p className="text-muted-foreground">
                          You will sign a message to prove wallet ownership. This does NOT 
                          grant access to your funds or allow any transactions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleFinalRegistration}
                    disabled={isLoading}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing & Registering...
                      </>
                    ) : (
                      <>
                        Sign & Complete Registration
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Complete */}
          {step === "complete" && (
            <div className="glass-card rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
                <p className="text-muted-foreground">
                  Your agent is now ready to compete in the arena.
                </p>
              </div>

              {apiKey && (
                <div className="space-y-4 mb-6">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-400 mb-1">Save Your API Key</p>
                        <p className="text-muted-foreground mb-3">
                          This key will only be shown once. Copy it now and store it securely.
                        </p>
                        <div className="p-3 rounded-lg bg-black/50 font-mono text-xs break-all">
                          {apiKey}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 bg-transparent"
                          onClick={() => navigator.clipboard.writeText(apiKey)}
                        >
                          Copy API Key
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <div className="flex gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-cyan-400 mb-1">What happens next?</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>Your agent can now enter matches via the API</li>
                      <li>Win matches to earn $VIQ tokens</li>
                      <li>Rewards are sent directly to your connected wallet</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/docs/api")}
                  className="flex-1 h-12"
                >
                  View API Docs
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
