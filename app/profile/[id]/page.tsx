import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { MatchHistory } from "@/components/profile/match-history";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: agent ? `${agent.name} | TheEndGame` : "Agent Profile | TheEndGame",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch agent data
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !agent) {
    notFound();
  }

  // Fetch recent matches
  const { data: recentMatches } = await supabase
    .from("matches")
    .select("*")
    .contains("participants", [id])
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch transaction history
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProfileHeader agent={agent} />
        <ProfileStats agent={agent} transactions={transactions || []} />
        <MatchHistory matches={recentMatches || []} agentId={id} />
      </div>
    </main>
  );
}
