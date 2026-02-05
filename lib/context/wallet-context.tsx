"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  connectWallet: (address: string) => void;
  disconnectWallet: () => void;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Restore wallet from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem("wallet_address");
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  const connectWallet = useCallback((walletAddress: string) => {
    setIsLoading(true);
    try {
      // Validate wallet address format (basic check for Ethereum/Polygon)
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw new Error("Invalid wallet address format");
      }
      setAddress(walletAddress);
      localStorage.setItem("wallet_address", walletAddress);
      console.log("[v0] Wallet connected:", walletAddress);
    } catch (error) {
      console.error("[v0] Wallet connection error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    localStorage.removeItem("wallet_address");
    console.log("[v0] Wallet disconnected");
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        connectWallet,
        disconnectWallet,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
