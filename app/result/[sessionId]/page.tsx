import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ResultClientView } from "@/components/result/result-client-view";
import { getUserDashboardStats } from "@/lib/data/dashboard-stats";
import { getPracticeSessionById } from "@/lib/data/sessions";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [fallbackSession, dashboardStats] = await Promise.all([
    getPracticeSessionById(sessionId),
    getUserDashboardStats(),
  ]);

  return (
    <PageShell
      title="评分反馈"
      description="先看懂这次练习的即时反馈，再决定是继续练习、查看完整记录，还是提交申诉"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/mock">
            返回模考大厅
          </Link>
          <Link className="link-button secondary" href="/history">
            查看历史记录
          </Link>
          <Link className="link-button" href={`/history/${sessionId}`}>
            查看本次完整记录
          </Link>
        </div>
      }
    >
      <ResultClientView dashboardStats={dashboardStats} fallbackSession={fallbackSession} sessionId={sessionId} />
    </PageShell>
  );
}
