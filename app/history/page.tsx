import Link from "next/link";
import { redirect } from "next/navigation";
import { listMockAttemptsForUser } from "@/lib/data/attempts";
import { listMockPapers } from "@/lib/data/papers";
import { getServerUser } from "@/lib/supabase/auth-server";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  in_progress: { label: "未完成", tone: "warn" },
  submitted: { label: "评分中", tone: "warn" },
  scored: { label: "已评分", tone: "ok" },
  failed: { label: "失败", tone: "danger" },
};

export default async function HistoryPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const [attempts, papers] = await Promise.all([
    listMockAttemptsForUser(user.id, 200),
    listMockPapers(),
  ]);
  // Build a paperId → title lookup so the list can render human-readable
  // titles instead of raw ids like "paper-2026-jan-apr-03" or
  // "custom-abc12345-l2k3j4k5j".
  const paperTitleById = new Map(papers.map((p) => [p.id, p.title]));
  const scoredAttempts = attempts.filter((a) => a.status === "scored");
  const bestScore = scoredAttempts.reduce<number | null>((best, a) => {
    if (a.totalScore == null) return best;
    if (best == null || a.totalScore > best) return a.totalScore;
    return best;
  }, null);
  const avgScore = scoredAttempts.length > 0
    ? scoredAttempts.reduce((s, a) => s + (a.totalScore ?? 0), 0) / scoredAttempts.length
    : null;

  return (
    <main className="history-page">
      <div className="history-back">
        <Link href="/mock" className="mock-back-link">← 返回模考大厅</Link>
      </div>

      <header className="history-header">
        <p className="eyebrow">MY MOCKS</p>
        <h1>我的模考记录</h1>
        <p className="history-desc">每场完整模考的总分、分项与教练反馈都保存在这里</p>
      </header>

      <section className="history-stats">
        <div className="history-stat">
          <p className="history-stat-num">{attempts.length}</p>
          <p className="history-stat-label">模考次数</p>
        </div>
        <div className="history-stat">
          <p className="history-stat-num">{scoredAttempts.length}</p>
          <p className="history-stat-label">已评分</p>
        </div>
        <div className="history-stat">
          <p className="history-stat-num">{bestScore == null ? "—" : bestScore.toFixed(1)}</p>
          <p className="history-stat-label">最高分</p>
        </div>
        <div className="history-stat">
          <p className="history-stat-num">{avgScore == null ? "—" : avgScore.toFixed(1)}</p>
          <p className="history-stat-label">平均分</p>
        </div>
      </section>

      {attempts.length === 0 ? (
        <section className="history-empty">
          <h2>还没有完整模考记录</h2>
          <p>去完成第一场模考吧</p>
          <Link className="link-button" href="/mock">开始模考</Link>
        </section>
      ) : (
        <ol className="history-list">
          {attempts.map((attempt) => {
            const status = STATUS_LABEL[attempt.status] ?? { label: attempt.status, tone: "warn" };
            const targetHref = attempt.status === "scored"
              ? `/report/${attempt.id}`
              : attempt.status === "in_progress"
                ? `/mock/${attempt.paperId}/run?attemptId=${attempt.id}`
                : `/report/${attempt.id}`;
            return (
              <li key={attempt.id} className="history-item">
                <Link href={targetHref} className="history-item-link">
                  <div className="history-item-top">
                    <span className="history-item-paper">{attempt.paperId}</span>
                    <span className={`history-item-status history-item-status-${status.tone}`}>{status.label}</span>
                  </div>
                  <div className="history-item-mid">
                    <p className="history-item-season">{paperTitleById.get(attempt.paperId) ?? attempt.season}</p>
                    <p className="history-item-date">{new Date(attempt.startedAt).toLocaleString("zh-CN")}</p>
                  </div>
                  <div className="history-item-score-row">
                    <span className="history-item-score-label">总分</span>
                    <span className="history-item-score-value">
                      {attempt.totalScore == null ? "—" : attempt.totalScore.toFixed(1)}
                    </span>
                    {attempt.bandScores ? (
                      <span className="history-item-score-breakdown">
                        FC {attempt.bandScores.fluencyCoherence.toFixed(1)} ·
                        LR {attempt.bandScores.lexicalResource.toFixed(1)} ·
                        GR {attempt.bandScores.grammar.toFixed(1)} ·
                        Pr {attempt.bandScores.pronunciation.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
