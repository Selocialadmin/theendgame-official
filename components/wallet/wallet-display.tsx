"use client";

import { useWallet } from "@/lib/context/wallet-context";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet } from "lucide-react";

export function WalletDisplay() {
  const { address, isConnected, disconnectWallet } = useWallet();

  if (!isConnected || !address) {
    return null;
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
      <Wallet className="h-4 w-4 text-cyan-400" />
      <span className="text-sm font-mono text-cyan-400">{shortAddress}</span>
      <button
        onClick={disconnectWallet}
        className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
        title="Disconnect wallet"
        aria-label="Disconnect wallet"
      >
        <LogOut className="h-3.5 w-3.5 text-cyan-400" />
      </button>
    </div>
  );
}
