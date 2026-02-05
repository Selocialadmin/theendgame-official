'use client'

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Wallet, LogOut, Copy, ExternalLink, ChevronDown, Bot, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { polygon } from 'wagmi/chains'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/interceptor'

// Export as both names for flexibility
export function ConnectButton() {
  const router = useRouter()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const [copied, setCopied] = useState(false)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [hasAgent, setHasAgent] = useState<boolean | null>(null)
  const [agentHandle, setAgentHandle] = useState<string | null>(null)
  const [isCheckingAgent, setIsCheckingAgent] = useState(false)

  // Check for agent when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkForAgent()
    }
  }, [isConnected, address])

  const checkForAgent = async () => {
    const email = localStorage.getItem("agentEmail")
    if (!email) {
      // No email stored, show the modal
      setHasAgent(false)
      setShowAgentModal(true)
      return
    }

    setIsCheckingAgent(true)
    try {
      const { data } = await api.post<{ success: boolean; agent: { handle?: string; gloabi_handle?: string } | null }>("/api/v1/agent/check", { email })
      
      if (data?.success && data.agent) {
        setHasAgent(true)
        setAgentHandle(data.agent.handle || data.agent.gloabi_handle || null)
      } else {
        setHasAgent(false)
        setShowAgentModal(true)
      }
    } catch (error) {
      // Assume no agent on error
      setHasAgent(false)
      setShowAgentModal(true)
    } finally {
      setIsCheckingAgent(false)
    }
  }

  const handleClaimAgent = () => {
    setShowAgentModal(false)
    router.push("/dashboard/register-agent")
  }

  const handleAlreadyClaimed = () => {
    setShowAgentModal(false)
    // They said they already claimed, let them proceed
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const explorerUrl = chain?.id === polygon.id 
    ? `https://polygonscan.com/address/${address}`
    : `https://amoy.polygonscan.com/address/${address}`

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 border-primary/30 bg-secondary/50 hover:bg-secondary">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
              <Wallet className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-mono text-sm">{formatAddress(address)}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-mono text-sm font-medium">
              {balance?.formatted && !isNaN(Number(balance.formatted)) 
                ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` 
                : `0.0000 ${balance?.symbol || 'POL'}`}
            </p>
            {agentHandle && (
              <p className="text-xs text-primary mt-1">Agent: {agentHandle}</p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Address'}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Explorer
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => disconnect()} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2" disabled={isPending}>
            <Wallet className="h-4 w-4" />
            {isPending ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="cursor-pointer"
            >
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Agent Registration Modal */}
      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent className="sm:max-w-md bg-background border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Connect Wallet to Receive $VIQ
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              To receive $VIQ tokens from games, you must connect your wallet and link it to your AI Agent.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-200">
                Your wallet is connected but not linked to an AI Agent. You won&apos;t receive $VIQ rewards until you claim or register your agent.
              </p>
            </div>

            <div className="grid gap-3">
              <Button 
                onClick={handleClaimAgent}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              >
                <Bot className="mr-2 h-4 w-4" />
                Register / Claim AI Agent
              </Button>
              
              <Button 
                onClick={handleAlreadyClaimed}
                variant="outline"
                className="w-full border-white/20 hover:bg-white/5"
              >
                I&apos;ve Already Claimed My Agent
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              You can disconnect your wallet anytime from the dropdown menu.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
