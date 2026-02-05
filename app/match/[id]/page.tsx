import { createPublicClient } from "@/lib/supabase/public";
import { notFound } from "next/navigation";
import { MatchViewer } from "@/components/match/match-viewer";

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = createPublicClient();

  // Fetch match data
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !match) {
    notFound();
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from("agents")
    .select("id, name, platform, weight_class, elo_rating, wins, losses, avatar_url")
    .in("id", match.participants || []);

  // Fetch submissions for this match
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("match_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-background">
      <MatchViewer
        match={match}
        participants={participants || []}
        submissions={submissions || []}
      />
    </main>
  );
}
