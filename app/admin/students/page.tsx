import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { listStudents } from "@/lib/data/sessions";
import { formatDate, scoreClass } from "@/lib/result-display";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AdminStudentsPage() {
  const isDatabaseReady = isSupabaseConfigured();
  const students = isDatabaseReady ? await listStudents() : [];

  const totalStudents = students.length;
  const totalSessions = students.reduce((sum, s) => sum + s.sessionCount, 0);
  const studentsWithRisk = students.filter((s) => s.riskCount > 0).length;
  const studentsWithAppeals = students.filter((s) => s.pendingAppeals > 0).length;

  return (
    <PageShell
      title="学生管理"
      description="按学生查看练习数据，点击进入学生详情页查看完整学习轨迹。"
      actions={
        <Link className="link-button secondary" href="/admin">
          返回总览
        </Link>
      }
    >
      {!isDatabaseReady ? (
        <SectionCard title="数据库未配置">
          <p>当前未配置 Supabase，无法查看学生数据。</p>
          <p className="inline-note">请先配置数据库环境变量。</p>
        </SectionCard>
      ) : students.length === 0 ? (
        <section className="placeholder-box compact">
          当前数据库里还没有学生练习记录。
        </section>
      ) : (
        <>
          <div className="admin-session-summary-row">
            <div className="kpi-card">
              <p className="kpi-card-value">{totalStudents}</p>
              <p className="kpi-card-label">总学生数</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-card-value">{totalSessions}</p>
              <p className="kpi-card-label">总会话数</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-card-value">{studentsWithRisk}</p>
              <p className="kpi-card-label">有风险学生</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-card-value">{studentsWithAppeals}</p>
              <p className="kpi-card-label">有待处理申诉</p>
            </div>
          </div>

          <p className="inline-note">{`共 ${students.length} 位学生`}</p>
          <div className="list-grid">
            {students.map((student) => (
              <Link
                className="list-item history-item"
                href={`/admin/students/${student.userId}`}
                key={student.userId}
              >
                <div className="history-score-col">
                  <div className={`history-score ${scoreClass(student.avgScore)}`}>
                    {student.avgScore.toFixed(1)}
                  </div>
                  <div className="history-score-label">平均分</div>
                </div>
                <div className="list-main history-main">
                  <h3>{student.email || student.userId.substring(0, 8)}</h3>
                  <p>最近活跃：{formatDate(student.lastActive)}</p>
                  <p className="inline-note" style={{ marginTop: 8 }}>
                    练习 {student.sessionCount} 次 · 最高分 {student.bestScore.toFixed(1)}
                  </p>
                  <div className="tag-row">
                    {student.riskCount > 0 ? (
                      <Badge tone="warn">风险 {student.riskCount} 次</Badge>
                    ) : null}
                    {student.pendingAppeals > 0 ? (
                      <Badge tone="warn">待处理申诉 {student.pendingAppeals}</Badge>
                    ) : null}
                  </div>
                </div>
                <span className="admin-overview-link">查看详情</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
