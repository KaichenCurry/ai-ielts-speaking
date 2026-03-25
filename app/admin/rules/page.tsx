import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { RuleVersionPanel } from "@/components/admin/rule-version-panel";
import { Badge } from "@/components/ui";
import { listPromptVersions } from "@/lib/data/rules";

export default async function RulesPage() {
  const promptVersions = await listPromptVersions();

  return (
    <PageShell
      title="Prompt / 规则版本页"
      description="这一页现在优先展示真实规则版本记录，并支持新增版本，方便后续关联 bad case 和优化方向。"
      actions={
        <Link className="link-button secondary" href="/admin">
          返回后台总览
        </Link>
      }
    >
      <div className="card-grid">
        <SectionCard title="新增规则版本">
          <RuleVersionPanel versions={promptVersions} />
        </SectionCard>
      </div>

      <div className="list-grid">
        {promptVersions.map((version) => (
          <section className="list-item" key={version.id}>
            <div className="list-main">
              <h3>{version.name}</h3>
              <p>{version.description}</p>
              <div className="tag-row">
                <Badge tone={version.status === "current" ? "ok" : undefined}>{version.status}</Badge>
                <Badge>{version.updatedAt}</Badge>
              </div>
            </div>
          </section>
        ))}
      </div>

      <SectionCard title="后续这里会补什么">
        <div className="timeline">
          <div className="timeline-item">记录每次 prompt / 规则更新说明</div>
          <div className="timeline-item">关联异常案例与修改原因</div>
          <div className="timeline-item">支持对比不同版本评分效果</div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
