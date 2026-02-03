"use client";

import { useState } from "react";
import { Coins, Shield, TrendingUp, Trophy, Zap, Lock, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectButton } from "@/components/wallet/connect-button";
import { useAccount } from "wagmi";

const STAKING_INFO = [
  {
    icon: TrendingUp,
    title: "Earn Bonus Rewards",
    description: "Stakers receive multiplied rewards on all match winnings, up to 1.5x for Gold tier.",
  },
  {
    icon: Trophy,
    title: "Priority Access",
    description: "Get early access to tournaments, exclusive events, and premium features.",
  },
  {
    icon: Shield,
    title: "Governance Power",
    description: "Gold stakers can vote on platform decisions, game rules, and reward distributions.",
  },
  {
    icon: Lock,
    title: "7-Day Lock Period",
    description: "Staked tokens are locked for 7 days to prevent short-term gaming of rewards.",
  },
];

const TIER_DETAILS = [
  {
    name: "Bronze",
    stake: "1,000 VIQ",
    minStake: 1000,
    multiplier: "1.1x",
    color: "text-amber-600 border-amber-500/30 bg-amber-500/10",
    benefits: ["10% reward bonus", "Priority matchmaking"],
  },
  {
    name: "Silver",
    stake: "10,000 VIQ",
    minStake: 10000,
    multiplier: "1.25x",
    color: "text-gray-300 border-gray-300/30 bg-gray-300/10",
    benefits: ["25% reward bonus", "Exclusive tournaments", "Custom avatar frame"],
  },
  {
    name: "Gold",
    stake: "100,000 VIQ",
    minStake: 100000,
    multiplier: "1.5x",
    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    benefits: ["50% reward bonus", "VIP tournaments", "Governance voting", "Revenue sharing"],
  },
];

export default function StakingPage() {
  const { isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for display (will be replaced by actual contract calls when deployed)
  const mockBalance = "10,000";
  const mockStaked = "0";
  const mockRewards = "0";

  const handleStake = async () => {
    setIsLoading(true);
    // Contract interaction will go here
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleUnstake = async () => {
    setIsLoading(true);
    // Contract interaction will go here
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-card border-cyan/30">
              <Coins className="h-5 w-5 text-cyan" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Staking</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Stake $VIQ tokens to boost your rewards and unlock exclusive benefits. 
            Higher stakes mean bigger multipliers on all your match winnings.
          </p>
        </div>

        {/* What is Staking Section */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan" />
            Why Stake $VIQ?
          </h2>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAKING_INFO.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-4 rounded-xl bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan/10 mb-3">
                    <Icon className="h-5 w-5 text-cyan" />
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier Overview */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold mb-6">Staking Tiers Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {TIER_DETAILS.map((tier) => (
              <div
                key={tier.name}
                className={`p-6 rounded-xl border ${tier.color} text-center`}
              >
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className="text-sm opacity-80 mb-4">Minimum: {tier.stake}</p>
                <div className="text-3xl font-black">{tier.multiplier}</div>
                <p className="text-xs opacity-60 mt-1">Reward Multiplier</p>
              </div>
            ))}
          </div>
        </div>

        {/* Staking Dashboard - Connect Wallet or Manage Stake */}
        {!isConnected ? (
          <div className="glass-card rounded-2xl p-8 max-w-md mx-auto text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan/10 mx-auto mb-4">
              <Wallet className="h-8 w-8 text-cyan" />
            </div>
            <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to start staking VIQ tokens and earning rewards
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Wallet Balance</span>
                  <Coins className="h-4 w-4 text-cyan" />
                </div>
                <p className="text-2xl font-bold">{mockBalance} VIQ</p>
              </div>

              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Staked Amount</span>
                  <Shield className="h-4 w-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-green-400">{mockStaked} VIQ</p>
              </div>

              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Pending Rewards</span>
                  <TrendingUp className="h-4 w-4 text-cyan" />
                </div>
                <p className="text-2xl font-bold text-cyan">{mockRewards} VIQ</p>
              </div>

              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Current Tier</span>
                  <Trophy className="h-4 w-4 text-yellow-400" />
                </div>
                <p className="text-muted-foreground">No tier yet</p>
              </div>
            </div>

            {/* Stake/Unstake and Tiers */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Manage Stake */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-1">Manage Stake</h2>
                <p className="text-sm text-muted-foreground mb-4">Stake or unstake your VIQ tokens</p>
                
                <Tabs defaultValue="stake">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5">
                    <TabsTrigger value="stake">Stake</TabsTrigger>
                    <TabsTrigger value="unstake">Unstake</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="stake" className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Amount to Stake</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className="bg-white/5 border-white/10"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setStakeAmount("10000")}
                          className="border-white/10 bg-transparent"
                        >
                          Max
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Available: {mockBalance} VIQ
                      </p>
                    </div>
                    <Button
                      className="w-full bg-cyan text-background hover:bg-cyan/90"
                      onClick={handleStake}
                      disabled={isLoading || !stakeAmount}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Stake VIQ"
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Contracts not deployed yet - staking will be enabled after launch
                    </p>
                  </TabsContent>

                  <TabsContent value="unstake" className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Amount to Unstake</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={unstakeAmount}
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                          className="bg-white/5 border-white/10"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setUnstakeAmount("0")}
                          className="border-white/10 bg-transparent"
                        >
                          Max
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Staked: {mockStaked} VIQ
                      </p>
                    </div>
                    <Button
                      className="w-full bg-transparent"
                      variant="outline"
                      onClick={handleUnstake}
                      disabled={isLoading || !unstakeAmount}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Unstake VIQ"
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Tier Benefits */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-1">Staking Tiers</h2>
                <p className="text-sm text-muted-foreground mb-4">Unlock benefits by staking more VIQ</p>
                
                <div className="space-y-3">
                  {TIER_DETAILS.map((tier) => (
                    <div
                      key={tier.name}
                      className="p-4 rounded-lg border border-white/10 bg-white/5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={tier.color}>{tier.name}</Badge>
                        <span className="text-sm font-medium">{tier.stake}</span>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {tier.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-cyan" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
