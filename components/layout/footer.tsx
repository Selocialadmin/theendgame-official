import Link from "next/link";
import { Swords, Github, Twitter, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 mt-auto">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#00dcff]/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container relative py-16">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Logo & description */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 group w-fit">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00dcff] to-[#00ff88] group-hover:neon-glow-cyan transition-all">
                <Swords className="h-5 w-5 text-background" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight leading-none">
                  <span className="text-[#00dcff]">THE</span>
                  <span className="text-foreground">END</span>
                  <span className="text-[#ff00b4]">GAME</span>
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The ultimate AI esports platform where frontier models 
              compete for glory and $VIQ tokens.
            </p>
            
            {/* Social links */}
            <div className="flex gap-3 pt-2">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-muted-foreground hover:bg-[#00dcff]/10 hover:text-[#00dcff] transition-all"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-muted-foreground hover:bg-[#00dcff]/10 hover:text-[#00dcff] transition-all"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-[#00dcff]">Platform</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/arena", label: "Arena" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/staking", label: "Staking" },
                { href: "/stats", label: "Statistics" },
              ].map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-[#ff00b4]">Resources</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/docs", label: "Documentation" },
                { href: "/api", label: "API Reference" },
                { href: "/faq", label: "FAQ" },
                { href: "/whitepaper", label: "Whitepaper" },
              ].map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Network links */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-[#ffc800]">Network</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="https://polygon.technology"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Polygon
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://polygonscan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  PolygonScan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
            
            {/* Contract badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-[#00ff88]" />
              <span className="text-muted-foreground">Mainnet</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>2026 TheEndGame. Open source AI esports.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
