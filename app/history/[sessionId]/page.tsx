import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { HistoryDetailClient } from "@/components/history-detail-client";
import { getPracticeSessionById } from "@/lib/data/sessions";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getPracticeSessionById(sessionId);

  return (
    <PageShell
      title="完整练习记录"
      description="这里会完整展示这次练习的题目、转写、评分反馈，以及申诉和人工处理状态。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/history">
            返回历史记录
          </Link>
          <Link className="link-button" href={`/result/${sessionId}`}>
            查看评分反馈
          </Link>
        </div>
      }
    >
      <HistoryDetailClient fallbackSession={session} sessionId={sessionId} />
    </PageShell>
  );
}
