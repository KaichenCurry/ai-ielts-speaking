import Link from "next/link";
import { notFound } from "next/navigation";
import { BadCasePanel } from "@/components/admin/bad-case-panel";
import { PageShell, SectionCard } from "@/components/page-shell";
import { ReviewActionPanel } from "@/components/admin/review-action-panel";
import { Badge } from "@/components/ui";
import { listBadCasesBySessionId, listPromptVersions } from "@/lib/data/rules";
import { getPracticeSessionById } from "@/lib/data/sessions";

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getPracticeSessionById(sessionId);

  if (!session) {
    notFound();
  }

  const [promptVersions, badCases] = await Promise.all([
    listPromptVersions(),
    listBadCasesBySessionId(sessionId),
  ]);

  return (
    <PageShell
      title="会话详情 / 复核页"
      description="后台治理页当前已支持复核、申诉状态处理，以及 bad case 沉淀。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/admin/sessions">
            返回会话列表
          </Link>
          <Link className="link-button" href="/admin/rules">
            查看规则版本
          </Link>
        </div>
      }
    >
      <div className="card-grid admin-review-grid">
        <SectionCard title="会话概览">
          <p><strong>标题：</strong>{session.title}</p>
          <p><strong>时间：</strong>{session.createdAt}</p>
          <div className="tag-row">
            <Badge>{session.part.toUpperCase()}</Badge>
            <Badge tone={session.riskFlag ? "warn" : "ok"}>{session.reviewStatus}</Badge>
            <Badge tone={session.appealStatus === "submitted" ? "warn" : "neutral"}>
              申诉：{session.appealStatus}
            </Badge>
          </div>
        </SectionCard>

        <SectionCard title="题目与转写">
          <p><strong>题目：</strong>{session.prompt}</p>
          <p><strong>转写：</strong>{session.transcript}</p>
        </SectionCard>

        <SectionCard title="AI 评分结果">
          <div className="score-grid">
            <div className="score-box"><span>总分</span><strong>{session.score.total}</strong></div>
            <div className="score-box"><span>流利度</span><strong>{session.score.fluencyCoherence}</strong></div>
            <div className="score-box"><span>词汇</span><strong>{session.score.lexicalResource}</strong></div>
            <div className="score-box"><span>语法</span><strong>{session.score.grammar}</strong></div>
            <div className="score-box"><span>发音</span><strong>{session.score.pronunciation}</strong></div>
            <div className="score-box"><span>完整度</span><strong>{session.score.completeness}</strong></div>
          </div>
        </SectionCard>

        <SectionCard title="当前治理信息">
          <div className="placeholder-box">
            <p><strong>风险标记：</strong>{session.riskFlag ? "是" : "否"}</p>
            <p><strong>风险原因：</strong>{session.riskReason ?? "当前无风险原因"}</p>
            <p><strong>申诉状态：</strong>{session.appealStatus}</p>
            <p><strong>申诉备注：</strong>{session.appealNote ?? "当前未填写"}</p>
            <p><strong>申诉时间：</strong>{session.appealedAt ?? "当前未进入申诉流"}</p>
            <p><strong>申诉最近更新时间：</strong>{session.appealUpdatedAt ?? "当前未更新"}</p>
            <p><strong>复核结论：</strong>{session.reviewResult ?? "当前未填写"}</p>
            <p><strong>复核备注：</strong>{session.reviewNote ?? "当前未填写"}</p>
            <p><strong>复核时间：</strong>{session.reviewedAt ?? "当前未复核"}</p>
          </div>
        </SectionCard>

        <SectionCard title="执行治理动作">
          <ReviewActionPanel session={session} />
        </SectionCard>

        <SectionCard title="沉淀 bad case">
          <BadCasePanel session={session} promptVersions={promptVersions} badCases={badCases} />
        </SectionCard>

        <SectionCard title="反馈内容回看">
          <p>{session.feedback.summary}</p>
          <ul>
            {session.feedback.priorities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </PageShell>
  );
}
