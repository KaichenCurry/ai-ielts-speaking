import { redirect } from "next/navigation";
import { MockRunner } from "@/components/mock/mock-runner";
import { getMockAttemptForUser } from "@/lib/data/attempts";
import { buildMockPaperPlan } from "@/lib/data/papers";
import { getServerUser } from "@/lib/supabase/auth-server";

export default async function MockRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ paperId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const { paperId } = await params;
  const { attemptId } = await searchParams;

  if (!attemptId) {
    redirect(`/mock/${paperId}/intro`);
  }

  const [plan, attempt] = await Promise.all([
    buildMockPaperPlan(paperId),
    getMockAttemptForUser(attemptId, user.id),
  ]);

  if (!plan || !attempt || attempt.paperId !== paperId) {
    redirect("/mock");
  }

  if (attempt.status === "scored") {
    redirect(`/report/${attempt.id}`);
  }

  return (
    <main className="mock-run-shell">
      <MockRunner attemptId={attempt.id} plan={plan} />
    </main>
  );
}
