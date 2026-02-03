import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      <div className="w-full max-w-md text-center">
        {/* Error Card */}
        <div className="glass-card rounded-2xl p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold mb-3">Authentication Error</h1>
          
          <p className="text-muted-foreground mb-6">
            Something went wrong during authentication. Please try again or contact support if the issue persists.
          </p>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full h-12 bg-[#00dcff] text-background hover:bg-[#00dcff]/90"
            >
              <Link href="/auth/login">
                Try Again
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
