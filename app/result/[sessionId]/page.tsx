import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { ResultClientView } from "@/components/result/result-client-view";
import { getPracticeSessionById } from "@/lib/data/sessions";

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    submittedTranscript?: string;
    processingSummary?: string;
    duration?: string;
  }>;
}) {
  const { sessionId } = await params;
  const query = await searchParams;
  const fallbackSession = await getPracticeSessionById(sessionId);

  if (!fallbackSession) {
    notFound();
  }

  return (
    <PageShell
      title="练习结果页"
      description="结果页现在优先展示真实 AI 评分结果；如果本地未配置数据库，则回退到 mock 数据。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/practice">
            继续练习
          </Link>
          <Link className="link-button" href={`/history/${fallbackSession.id}`}>
            查看历史详情
          </Link>
        </div>
      }
    >
      <ResultClientView
        fallbackSession={fallbackSession}
        sessionId={sessionId}
        duration={query.duration}
        processingSummary={query.processingSummary}
        submittedTranscript={query.submittedTranscript}
      />
    </PageShell>
  );
}
