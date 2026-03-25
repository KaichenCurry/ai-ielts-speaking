import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { listPracticeSessions } from "@/lib/data/sessions";

export default async function HistoryPage() {
  const sessions = await listPracticeSessions();

  return (
    <PageShell
      title="历史记录页"
      description="这里现在优先展示真实入库的练习记录；如果本地尚未配置 Supabase，则回退到 mock 数据。"
      actions={
        <Link className="link-button" href="/practice">
          开始新的练习
        </Link>
      }
    >
      <div className="list-grid">
        {sessions.map((session) => (
          <section className="list-item" key={session.id}>
            <div className="list-main">
              <h3>{session.title}</h3>
              <p>{session.createdAt}</p>
              <div className="tag-row">
                <Badge>{session.part.toUpperCase()}</Badge>
                <Badge tone={session.riskFlag ? "warn" : "ok"}>
                  {session.riskFlag ? "有风险标记" : "正常"}
                </Badge>
              </div>
            </div>
            <div className="action-row">
              <Link className="link-button secondary" href={`/result/${session.id}`}>
                查看结果
              </Link>
              <Link className="link-button" href={`/history/${session.id}`}>
                查看详情
              </Link>
            </div>
          </section>
        ))}
      </div>

      <SectionCard title="这一页后续会接什么">
        <ul>
          <li>数据库中的真实练习记录</li>
          <li>按时间、Part、分数等条件筛选</li>
          <li>趋势图和薄弱项变化分析</li>
        </ul>
      </SectionCard>
    </PageShell>
  );
}
