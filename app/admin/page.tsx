import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { StatCard } from "@/components/ui";
import { getDashboardMetrics } from "@/lib/data/dashboard";

export default async function AdminHomePage() {
  const dashboardMetrics = await getDashboardMetrics();

  return (
    <PageShell
      title="后台治理端总览"
      description="当前总览页已优先展示真实治理数据，帮助快速了解会话量、申诉量、风险量和规则版本状态。"
      actions={
        <div className="action-row">
          <Link className="link-button" href="/admin/sessions">
            查看会话列表
          </Link>
          <Link className="link-button secondary" href="/admin/rules">
            查看规则版本
          </Link>
        </div>
      }
    >
      <div className="info-grid">
        {dashboardMetrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} helper={metric.helper} />
        ))}
      </div>

      <div className="card-grid">
        <SectionCard title="当前后台关注点">
          <ul>
            <li>哪些会话可能异常</li>
            <li>哪些申诉需要处理</li>
            <li>当前生效规则版本是什么</li>
            <li>哪些问题样本值得继续沉淀</li>
          </ul>
        </SectionCard>

        <SectionCard title="这一版先不做什么">
          <ul>
            <li>复杂权限系统</li>
            <li>真实告警通知</li>
            <li>自动化规则切换</li>
            <li>批量运营动作</li>
          </ul>
        </SectionCard>
      </div>
    </PageShell>
  );
}
