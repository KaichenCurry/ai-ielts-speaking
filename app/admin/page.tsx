import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge, StatCard } from "@/components/ui";
import { getDashboardMetrics } from "@/lib/data/dashboard";
import { listPracticeSessions } from "@/lib/data/sessions";
import { formatDate, formatPartLabel, scoreClass } from "@/lib/result-display";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { PracticeSession } from "@/lib/types";

function getPendingStatusLabels(session: Pick<PracticeSession, "riskFlag" | "appealStatus" | "reviewStatus">) {
  const labels: string[] = [];

  if (session.riskFlag) {
    labels.push("异常候选");
  }

  if (session.appealStatus === "submitted") {
    labels.push("申诉待处理");
  }

  if (session.reviewStatus === "flagged") {
    labels.push("已标记待复核");
  }

  return labels;
}

export default async function AdminHomePage() {
  const isDatabaseReady = isSupabaseConfigured();
  const [dashboardMetrics, pendingSessions, recentSessions] = isDatabaseReady
    ? await Promise.all([
        getDashboardMetrics(),
        listPracticeSessions({ queue: "pending" }),
        listPracticeSessions(),
      ])
    : [[], [], []];
  const pendingQueue = pendingSessions.slice(0, 5);
  const latestSessions = recentSessions.slice(0, 5);
  const queueCount = pendingSessions.length;
  const riskCount = pendingSessions.filter((session) => session.riskFlag).length;
  const appealCount = pendingSessions.filter((session) => session.appealStatus === "submitted").length;
  const flaggedCount = pendingSessions.filter((session) => session.reviewStatus === "flagged").length;

  return (
    <PageShell
      title="后台治理端总览"
      description="优先查看待处理队列、最近练习会话和当前治理指标，快速判断今天先处理什么。"
      actions={
        <div className="action-row">
          <Link className="link-button" href="/admin/students">
            学生管理
          </Link>
          <Link className="link-button secondary" href="/admin/questions">
            管理题库
          </Link>
          <Link className="link-button secondary" href="/admin/rules">
            查看规则版本
          </Link>
        </div>
      }
    >
      {!isDatabaseReady ? (
        <SectionCard title="数据库未配置">
          <p>当前未配置 Supabase，后台总览无法读取真实治理数据。</p>
          <p className="inline-note">请先补齐数据库环境变量，再查看会话量、申诉量和规则版本状态。</p>
        </SectionCard>
      ) : (
        <div className="admin-detail-layout">
          <div className="admin-kpi-row">
            {dashboardMetrics.map((metric) => (
              <StatCard key={metric.label} label={metric.label} value={metric.value} helper={metric.helper} />
            ))}
          </div>

          <SectionCard title="待处理总览">
            <div className="admin-session-summary-row">
              <div className="kpi-card">
                <p className="kpi-card-value">{queueCount}</p>
                <p className="kpi-card-label">当前队列</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{riskCount}</p>
                <p className="kpi-card-label">异常候选</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{appealCount}</p>
                <p className="kpi-card-label">申诉待处理</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{flaggedCount}</p>
                <p className="kpi-card-label">已标记待复核</p>
              </div>
            </div>
            <p className="inline-note" style={{ marginTop: 12 }}>
              优先处理待申诉、异常候选和已标记会话；处理完成后，这些项目会自动从优先队列里减少。
            </p>
          </SectionCard>

          <div className="admin-overview-two-col">
            <SectionCard title="待处理工作队列">
              {pendingQueue.length === 0 ? (
                <p className="inline-note">当前没有待处理项。</p>
              ) : (
                <div className="admin-overview-list">
                  {pendingQueue.map((session) => (
                    <Link
                      className="list-item history-item admin-overview-item"
                      href={session.userId ? `/admin/students/${session.userId}/${session.id}` : "/admin/students"}
                      key={session.id}
                    >
                      <div className="history-score-col">
                        <div className={`history-score ${scoreClass(session.score.total)}`}>{session.score.total.toFixed(1)}</div>
                        <div className="history-score-label">总分</div>
                      </div>
                      <div className="list-main history-main">
                        <h3>{session.topicTitle}</h3>
                        <p>{formatDate(session.createdAt)}</p>
                        <p className="inline-note" style={{ marginTop: 8 }}>{session.questionText}</p>
                        <div className="tag-row">
                          <Badge>{`${formatPartLabel(session.part)} · ${session.questionLabel}`}</Badge>
                          {getPendingStatusLabels(session).map((label) => (
                            <Badge key={label} tone="warn">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <span className="admin-overview-link">优先处理</span>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="最近会话">
              {latestSessions.length === 0 ? (
                <p className="inline-note">暂无练习数据。</p>
              ) : (
                <div className="admin-overview-list">
                  {latestSessions.map((session) => (
                    <Link
                      className="list-item history-item admin-overview-item"
                      href={session.userId ? `/admin/students/${session.userId}` : "/admin/students"}
                      key={session.id}
                    >
                      <div className="history-score-col">
                        <div className={`history-score ${scoreClass(session.score.total)}`}>{session.score.total.toFixed(1)}</div>
                        <div className="history-score-label">总分</div>
                      </div>
                      <div className="list-main history-main">
                        <h3>{session.topicTitle}</h3>
                        <p>{formatDate(session.createdAt)}</p>
                        <p className="inline-note" style={{ marginTop: 8 }}>{session.questionText}</p>
                        <div className="tag-row">
                          <Badge>{`${formatPartLabel(session.part)} · ${session.questionLabel}`}</Badge>
                          <Badge tone={session.riskFlag ? "warn" : "ok"}>
                            {session.riskFlag ? "需关注" : "正常完成"}
                          </Badge>
                        </div>
                      </div>
                      <span className="admin-overview-link">查看详情</span>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </PageShell>
  );
}
