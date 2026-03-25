import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";

export default function HomePage() {
  return (
    <PageShell
      title="AI 雅思口语练习与治理平台"
      description="当前是第一步 Web MVP 骨架版本：先把学生端与后台端的主页面结构、路由和假数据流搭起来，为后续接入录音、ASR、AI 评分和数据库打底。"
      actions={
        <div className="action-row">
          <Link className="link-button" href="/practice">
            进入学生端
          </Link>
          <Link className="link-button secondary" href="/admin">
            进入后台端
          </Link>
        </div>
      }
    >
      <div className="hero-grid">
        <section className="hero-card">
          <p className="eyebrow">Student MVP</p>
          <h2>学生端核心闭环</h2>
          <p>练习入口 → 练习进行 → 结果反馈 → 历史记录，先验证学生能否顺利完成一次完整练习。</p>
        </section>
        <section className="hero-card">
          <p className="eyebrow">Admin MVP</p>
          <h2>后台治理闭环</h2>
          <p>数据概览 → 会话列表 → 复核详情 → 规则版本，先验证平台是否具备最小治理视图。</p>
        </section>
      </div>

      <div className="card-grid">
        <SectionCard title="当前这一步要达成什么">
          <ul>
            <li>建立 Next.js Web 工程底座</li>
            <li>明确学生端与后台端页面结构</li>
            <li>用 mock data 先跑通演示链路</li>
            <li>为后续接入 AI 评分链路预留结构</li>
          </ul>
        </SectionCard>

        <SectionCard title="下一步将接什么">
          <ul>
            <li>真实录音与转写流程</li>
            <li>AI 评分 prompt 与结构化输出</li>
            <li>数据库表与历史记录持久化</li>
            <li>后台异常标记与复核动作</li>
          </ul>
        </SectionCard>
      </div>
    </PageShell>
  );
}
