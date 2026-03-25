import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { listPracticeSessions } from "@/lib/data/sessions";

export default async function AdminSessionsPage() {
  const sessions = await listPracticeSessions();

  return (
    <PageShell
      title="会话列表页"
      description="当前优先展示真实入库的会话数据；后台可以看到真实的复核和申诉状态。"
      actions={
        <Link className="link-button secondary" href="/admin">
          返回总览
        </Link>
      }
    >
      <SectionCard title="筛选条件占位">
        <p>后续这里会接入按时间、Part、是否申诉、是否异常、复核状态等条件筛选。</p>
      </SectionCard>

      <div className="list-grid">
        {sessions.map((session) => (
          <section className="list-item" key={session.id}>
            <div className="list-main">
              <h3>{session.title}</h3>
              <p>{session.createdAt}</p>
              <div className="tag-row">
                <Badge>{session.part.toUpperCase()}</Badge>
                <Badge tone={session.appealStatus === "submitted" ? "warn" : "neutral"}>
                  申诉：{session.appealStatus}
                </Badge>
                <Badge tone={session.riskFlag ? "warn" : "ok"}>
                  {session.riskFlag ? "异常候选" : "正常"}
                </Badge>
                <Badge>{session.reviewStatus}</Badge>
              </div>
            </div>
            <Link className="link-button" href={`/admin/sessions/${session.id}`}>
              查看治理详情
            </Link>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
