"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, TrendingUp, Shield, Trophy, Loader2, Wallet } from "lucide-react";
import { ConnectButton } from "@/components/wallet/connect-button";
import { CONTRACTS, VIQ_TOKEN_ABI, STAKING_ABI } from "@/lib/contracts/config";

const STAKING_TIERS = [
  {
    name: "Bronze",
    minStake: 1000,
    multiplier: 1.1,
    color: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    benefits: ["10% reward bonus", "Priority matchmaking"],
  },
  {
    name: "Silver",
    minStake: 5000,
    multiplier: 1.25,
    color: "text-gray-300 border-gray-300/30 bg-gray-300/10",
    benefits: ["25% reward bonus", "Exclusive tournaments", "Custom avatar frame"],
  },
  {
    name: "Gold",
    minStake: 10000,
    multiplier: 1.5,
    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    benefits: ["50% reward bonus", "VIP tournaments", "Governance voting", "Revenue sharing"],
  },
];

export function StakingDashboard() {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  // Read VIQ balance
  const { data: viqBalance } = useReadContract({
    address: CONTRACTS.VIQ_TOKEN as `0x${string}`,
    abi: VIQ_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read staked amount
  const { data: stakedAmount } = useReadContract({
    address: CONTRACTS.STAKING as `0x${string}`,
    abi: STAKING_ABI,
    functionName: "stakedBalance",
    args: address ? [address] : undefined,
  });

  // Read pending rewards
  const { data: pendingRewards } = useReadContract({
    address: CONTRACTS.STAKING as `0x${string}`,
    abi: STAKING_ABI,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
  });

  // Write functions
  const { writeContract: stake, data: stakeHash, isPending: isStaking } = useWriteContract();
  const { writeContract: unstake, data: unstakeHash, isPending: isUnstaking } = useWriteContract();
  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();

  // Transaction receipts
  const { isLoading: isStakeConfirming } = useWaitForTransactionReceipt({ hash: stakeHash });
  const { isLoading: isUnstakeConfirming } = useWaitForTransactionReceipt({ hash: unstakeHash });
  const { isLoading: isClaimConfirming } = useWaitForTransactionReceipt({ hash: claimHash });

  const formattedBalance = viqBalance ? formatEther(viqBalance as bigint) : "0";
  const formattedStaked = stakedAmount ? formatEther(stakedAmount as bigint) : "0";
  const formattedRewards = pendingRewards ? formatEther(pendingRewards as bigint) : "0";

  // Determine current tier
  const stakedNumber = parseFloat(formattedStaked);
  const currentTier = STAKING_TIERS.slice().reverse().find((t) => stakedNumber >= t.minStake);

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    try {
      stake({
        address: CONTRACTS.VIQ_TOKEN as `0x${string}`,
        abi: VIQ_TOKEN_ABI,
        functionName: "approve",
        args: [CONTRACTS.STAKING, parseEther(stakeAmount)],
      });
    } catch (error) {
      console.error("Stake error:", error);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    try {
      unstake({
        address: CONTRACTS.STAKING as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "unstake",
        args: [parseEther(unstakeAmount)],
      });
    } catch (error) {
      console.error("Unstake error:", error);
    }
  };

  const handleClaim = async () => {
    try {
      claim({
        address: CONTRACTS.STAKING as `0x${string}`,
        abi: STAKING_ABI,
        functionName: "claimRewards",
      });
    } catch (error) {
      console.error("Claim error:", error);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass-card rounded-xl p-8 max-w-md mx-auto text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan/10 mx-auto mb-4">
          <Wallet className="h-8 w-8 text-cyan" />
        </div>
        <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
        <p className="text-muted-foreground mb-6">
          Connect your wallet to access staking features
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Wallet Balance</span>
            <Coins className="h-4 w-4 text-cyan" />
          </div>
          <p className="text-2xl font-bold">{parseFloat(formattedBalance).toLocaleString()} VIQ</p>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Staked Amount</span>
            <Shield className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">
            {parseFloat(formattedStaked).toLocaleString()} VIQ
          </p>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Pending Rewards</span>
            <TrendingUp className="h-4 w-4 text-cyan" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-cyan">
              {parseFloat(formattedRewards).toLocaleString()} VIQ
            </p>
            {parseFloat(formattedRewards) > 0 && (
              <Button
                size="sm"
                onClick={handleClaim}
                disabled={isClaiming || isClaimConfirming}
                className="bg-cyan text-background hover:bg-cyan/90"
              >
                {isClaiming || isClaimConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Claim"
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Current Tier</span>
            <Trophy className="h-4 w-4 text-yellow-400" />
          </div>
          {currentTier ? (
            <Badge className={`${currentTier.color} text-base px-3 py-1`}>{currentTier.name}</Badge>
          ) : (
            <p className="text-muted-foreground">No tier yet</p>
          )}
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
                    onClick={() => setStakeAmount(formattedBalance)}
                    className="border-white/10 bg-transparent"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {parseFloat(formattedBalance).toLocaleString()} VIQ
                </p>
              </div>
              <Button
                className="w-full bg-cyan text-background hover:bg-cyan/90"
                onClick={handleStake}
                disabled={isStaking || isStakeConfirming || !stakeAmount}
              >
                {isStaking || isStakeConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isStaking ? "Confirming..." : "Processing..."}
                  </>
                ) : (
                  "Stake VIQ"
                )}
              </Button>
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
                    onClick={() => setUnstakeAmount(formattedStaked)}
                    className="border-white/10 bg-transparent"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Staked: {parseFloat(formattedStaked).toLocaleString()} VIQ
                </p>
              </div>
              <Button
                className="w-full bg-transparent border-white/20"
                variant="outline"
                onClick={handleUnstake}
                disabled={isUnstaking || isUnstakeConfirming || !unstakeAmount}
              >
                {isUnstaking || isUnstakeConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isUnstaking ? "Confirming..." : "Processing..."}
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
            {STAKING_TIERS.map((tier) => {
              const isActive = currentTier?.name === tier.name;
              const isUnlocked = stakedNumber >= tier.minStake;

              return (
                <div
                  key={tier.name}
                  className={`p-4 rounded-lg border transition-all ${
                    isActive
                      ? `${tier.color} border-current`
                      : isUnlocked
                      ? "border-white/10 bg-white/5"
                      : "border-white/5 bg-white/[0.02] opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={tier.color}>{tier.name}</Badge>
                      {isActive && (
                        <Badge variant="outline" className="text-xs border-cyan/50 text-cyan">
                          Current
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {tier.minStake.toLocaleString()} VIQ
                    </span>
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
