import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Swords, ArrowLeft } from "lucide-react";

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#00dcff]/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md text-center">
        {/* Success Card */}
        <div className="glass-card rounded-2xl p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00dcff]/10 border border-[#00dcff]/20 mx-auto mb-6">
            <Mail className="h-8 w-8 text-[#00dcff]" />
          </div>

          <h1 className="text-2xl font-bold mb-3">Check Your Email</h1>
          
          <p className="text-muted-foreground mb-6">
            {"We've sent you a confirmation link. Click the link in your email to verify your account and enter the arena."}
          </p>

          <div className="space-y-3">
            <Button
              asChild
              variant="outline"
              className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Link href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
