import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { RadarChart } from "@/components/charts/radar-chart";
import { TrendLine } from "@/components/charts/trend-line";
import { listPracticeSessionsByUserId, listStudents } from "@/lib/data/sessions";
import { formatDate, formatPartLabel, scoreClass } from "@/lib/result-display";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { ScoreBreakdown } from "@/lib/types";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageShell
        title="学生详情"
        description="查看单个学生的完整练习数据和学习轨迹。"
        actions={
          <Link className="link-button secondary" href="/admin/students">
            返回学生列表
          </Link>
        }
      >
        <SectionCard title="数据库未配置">
          <p>当前未配置 Supabase，无法查看学生详情。</p>
          <p className="inline-note">请先配置数据库环境变量。</p>
        </SectionCard>
      </PageShell>
    );
  }

  const sessions = await listPracticeSessionsByUserId(userId);
  const students = await listStudents();
  const student = students.find((item) => item.userId === userId);

  if (sessions.length === 0) {
    notFound();
  }

  const totalSessions = sessions.length;
  const avgScore = sessions.reduce((sum, s) => sum + s.score.total, 0) / totalSessions;
  const bestScore = Math.max(...sessions.map((s) => s.score.total));
  const lowestScore = Math.min(...sessions.map((s) => s.score.total));
  const riskCount = sessions.filter((s) => s.riskFlag).length;
  const pendingAppeals = sessions.filter((s) => s.appealStatus === "submitted").length;

  const avgScoreBreakdown: ScoreBreakdown = {
    total: avgScore,
    fluencyCoherence: sessions.reduce((sum, s) => sum + s.score.fluencyCoherence, 0) / totalSessions,
    lexicalResource: sessions.reduce((sum, s) => sum + s.score.lexicalResource, 0) / totalSessions,
    grammar: sessions.reduce((sum, s) => sum + s.score.grammar, 0) / totalSessions,
    pronunciation: sessions.reduce((sum, s) => sum + s.score.pronunciation, 0) / totalSessions,
    completeness: sessions.reduce((sum, s) => sum + s.score.completeness, 0) / totalSessions,
  };

  const trendPoints = sessions.slice(0, 10).reverse().map((s) => ({
    date: s.createdAt.slice(0, 10),
    total: s.score.total,
    fluencyCoherence: s.score.fluencyCoherence,
    lexicalResource: s.score.lexicalResource,
    grammar: s.score.grammar,
    pronunciation: s.score.pronunciation,
    completeness: s.score.completeness,
    part: s.part,
  }));

  return (
    <PageShell
      title={student?.email || `学生 ${userId.substring(0, 8)}`}
      description="查看该学生的完整练习数据、成绩趋势和会话列表。"
      actions={
        <Link className="link-button secondary" href="/admin/students">
          返回学生列表
        </Link>
      }
    >
      <div className="admin-detail-layout">
        <div className="admin-session-summary-row">
          <div className="kpi-card">
            <p className="kpi-card-value">{totalSessions}</p>
            <p className="kpi-card-label">总练习次数</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{avgScore.toFixed(1)}</p>
            <p className="kpi-card-label">平均分</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{bestScore.toFixed(1)}</p>
            <p className="kpi-card-label">最高分</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{lowestScore.toFixed(1)}</p>
            <p className="kpi-card-label">最低分</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{riskCount}</p>
            <p className="kpi-card-label">风险会话</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{pendingAppeals}</p>
            <p className="kpi-card-label">待处理申诉</p>
          </div>
        </div>

        <div className="admin-detail-two-col">
          <SectionCard title="五维能力雷达图">
            <RadarChart score={avgScoreBreakdown} />
          </SectionCard>

          <SectionCard title="成绩趋势">
            <TrendLine points={trendPoints} />
          </SectionCard>
        </div>

        <SectionCard title="会话列表">
          <p className="inline-note">{`共 ${sessions.length} 条会话`}</p>
          <div className="list-grid" style={{ marginTop: 12 }}>
            {sessions.map((session) => (
              <Link
                className="list-item history-item"
                href={`/admin/students/${userId}/${session.id}`}
                key={session.id}
              >
                <div className="history-score-col">
                  <div className={`history-score ${scoreClass(session.score.total)}`}>
                    {session.score.total.toFixed(1)}
                  </div>
                  <div className="history-score-label">总分</div>
                </div>
                <div className="list-main history-main">
                  <h3>{session.topicTitle}</h3>
                  <p>{formatDate(session.createdAt)}</p>
                  <p className="inline-note" style={{ marginTop: 8 }}>{session.questionText}</p>
                  <div className="tag-row">
                    <Badge>{`${formatPartLabel(session.part)} · ${session.questionLabel}`}</Badge>
                    {session.riskFlag ? <Badge tone="warn">异常候选</Badge> : null}
                    {session.appealStatus === "submitted" ? <Badge tone="warn">申诉待处理</Badge> : null}
                    {session.appealStatus === "reviewed" ? <Badge tone="ok">申诉已处理</Badge> : null}
                    {session.reviewStatus === "flagged" ? <Badge tone="warn">已标记</Badge> : null}
                    {session.reviewStatus === "completed" ? <Badge tone="ok">复核已完成</Badge> : null}
                  </div>
                </div>
                <span className="admin-overview-link">查看详情</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
