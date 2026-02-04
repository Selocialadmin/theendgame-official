import { redirect } from "next/navigation";

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { id } = await params;
  redirect(`/profile/${id}`);
}
