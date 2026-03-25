import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, SectionCard } from "@/components/page-shell";
import { AppealActionPanel } from "@/components/result/appeal-action-panel";
import { Badge } from "@/components/ui";
import { getPracticeSessionById } from "@/lib/data/sessions";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getPracticeSessionById(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <PageShell
      title="历史详情页"
      description="展示单次练习的题目、转写、评分和申诉状态。当前优先读取真实持久化数据。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/history">
            返回历史记录
          </Link>
          <Link className="link-button" href={`/result/${session.id}`}>
            返回结果页
          </Link>
        </div>
      }
    >
      <div className="card-grid">
        <SectionCard title="练习元信息">
          <p><strong>标题：</strong>{session.title}</p>
          <p><strong>时间：</strong>{session.createdAt}</p>
          <div className="tag-row">
            <Badge>{session.part.toUpperCase()}</Badge>
            <Badge tone={session.riskFlag ? "warn" : "ok"}>{session.reviewStatus}</Badge>
          </div>
        </SectionCard>

        <SectionCard title="原题目">
          <p>{session.prompt}</p>
        </SectionCard>

        <SectionCard title="转写内容">
          <p>{session.transcript}</p>
        </SectionCard>

        <SectionCard title="分数概览">
          <div className="score-grid">
            <div className="score-box"><span>总分</span><strong>{session.score.total}</strong></div>
            <div className="score-box"><span>流利度</span><strong>{session.score.fluencyCoherence}</strong></div>
            <div className="score-box"><span>词汇</span><strong>{session.score.lexicalResource}</strong></div>
            <div className="score-box"><span>语法</span><strong>{session.score.grammar}</strong></div>
            <div className="score-box"><span>发音</span><strong>{session.score.pronunciation}</strong></div>
            <div className="score-box"><span>完整度</span><strong>{session.score.completeness}</strong></div>
          </div>
        </SectionCard>

        <SectionCard title="申诉与复核状态">
          <p><strong>申诉状态：</strong>{session.appealStatus}</p>
          <p><strong>复核状态：</strong>{session.reviewStatus}</p>
          <p><strong>风险说明：</strong>{session.riskReason ?? "当前无风险说明"}</p>
        </SectionCard>

        <SectionCard title="提交申诉">
          <AppealActionPanel session={session} />
        </SectionCard>
      </div>
    </PageShell>
  );
}
