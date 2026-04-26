import Link from "next/link";
import { redirect } from "next/navigation";
import { getMockAttemptForUser } from "@/lib/data/attempts";
import { getMockPaper } from "@/lib/data/papers";
import { listSessionsForMockAttempt } from "@/lib/data/sessions";
import { getServerUser } from "@/lib/supabase/auth-server";
import type { PracticeSession, ScoreBreakdown, SpeakingPart } from "@/lib/types";

const DIM_LABELS: Record<keyof ScoreBreakdown, string> = {
  total: "总分",
  fluencyCoherence: "流利度 / 连贯",
  lexicalResource: "词汇资源",
  grammar: "语法准确度",
  pronunciation: "发音",
  completeness: "完整度",
};

const PART_LABELS: Record<SpeakingPart, string> = {
  part1: "Part 1 · 日常问答",
  part2: "Part 2 · Cue Card 独白",
  part3: "Part 3 · 延展讨论",
};

function groupByPart(sessions: PracticeSession[]) {
  const grouped: Record<SpeakingPart, PracticeSession[]> = { part1: [], part2: [], part3: [] };
  for (const s of sessions) grouped[s.part].push(s);
  return grouped;
}

function formatBand(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toFixed(1);
}

function partAverage(sessions: PracticeSession[]) {
  if (sessions.length === 0) return null;
  return sessions.reduce((s, x) => s + x.score.total, 0) / sessions.length;
}

export default async function MockReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const { attemptId } = await params;
  const attempt = await getMockAttemptForUser(attemptId, user.id);
  if (!attempt) {
    redirect("/history");
  }

  const [paper, sessions] = await Promise.all([
    getMockPaper(attempt.paperId),
    listSessionsForMockAttempt(attempt.id),
  ]);
  const grouped = groupByPart(sessions);
  const bandScores = attempt.bandScores;

  // Status: in_progress (shouldn't normally land here) | submitted (still scoring) | scored | failed
  const isScored = attempt.status === "scored";
  const isPending = attempt.status === "submitted" || attempt.status === "in_progress";

  return (
    <main className="report-page">
      <div className="report-back">
        <Link href="/history" className="mock-back-link">← 返回我的模考</Link>
      </div>

      <header className="report-header">
        <span className="eyebrow">MOCK REPORT · {attempt.season}</span>
        <h1>{paper?.title ?? attempt.paperId}</h1>
        <div className="report-header-meta">
          <span>📅 {new Date(attempt.startedAt).toLocaleString("zh-CN")}</span>
          {attempt.scoredAt ? (
            <span>📝 {new Date(attempt.scoredAt).toLocaleString("zh-CN")} 评分完成</span>
          ) : null}
          <span className={`report-status report-status-${attempt.status}`}>
            {attempt.status === "scored" ? "已评分" : attempt.status === "submitted" ? "评分中" : attempt.status === "failed" ? "评分失败" : "进行中"}
          </span>
        </div>
      </header>

      {isPending ? (
        <section className="report-pending-card">
          <p>评分仍在进行中，请稍候片刻后刷新页面如果长时间未完成可联系管理员排查</p>
        </section>
      ) : null}

      {attempt.status === "failed" ? (
        <section className="report-failed-card">
          <h2>评分失败</h2>
          <p>{attempt.summary || "评分流程中断，请重做或联系管理员"}</p>
          <Link className="link-button" href="/mock">返回模考大厅</Link>
        </section>
      ) : null}

      {isScored && bandScores ? (
        <>
          <section className="report-overall">
            <div className="report-overall-score">
              <p className="report-overall-label">整场总分</p>
              <p className="report-overall-num">{formatBand(bandScores.total)}</p>
              <p className="report-overall-scale">/ 9.0</p>
            </div>
            <div className="report-overall-summary">
              <h2>本场综合反馈</h2>
              <p>{attempt.summary ?? "（暂无综合反馈）"}</p>
            </div>
          </section>

          <section className="report-bands">
            <h2 className="report-section-heading">五维分项</h2>
            <div className="report-bands-grid">
              {(Object.keys(DIM_LABELS) as Array<keyof ScoreBreakdown>)
                .filter((k) => k !== "total")
                .map((dim) => {
                  const value = bandScores[dim];
                  const pct = (value / 9) * 100;
                  return (
                    <div key={dim} className="report-band-row">
                      <div className="report-band-row-head">
                        <span className="report-band-label">{DIM_LABELS[dim]}</span>
                        <span className="report-band-value">{formatBand(value)}</span>
                      </div>
                      <div className="report-band-track">
                        <div className="report-band-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="report-parts">
            <h2 className="report-section-heading">分 Part 表现</h2>
            <div className="report-parts-grid">
              {(["part1", "part2", "part3"] as SpeakingPart[]).map((part) => {
                const list = grouped[part];
                const avg = partAverage(list);
                return (
                  <div key={part} className="report-part-card">
                    <div className="report-part-card-head">
                      <span className="report-part-card-tag">{PART_LABELS[part]}</span>
                      <span className="report-part-card-score">{avg == null ? "—" : avg.toFixed(1)}</span>
                    </div>
                    <p className="report-part-card-meta">{list.length} 题</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="report-detail">
            <h2 className="report-section-heading">逐题回顾</h2>
            <ol className="report-detail-list">
              {sessions.map((s) => (
                <li key={s.id} className="report-detail-item">
                  <div className="report-detail-head">
                    <span className="report-detail-tag">{PART_LABELS[s.part]}</span>
                    <span className="report-detail-score">{formatBand(s.score.total)}</span>
                  </div>
                  <p className="report-detail-question">{s.questionText}</p>
                  <p className="report-detail-transcript">{s.transcript}</p>
                  {s.feedback.summary ? (
                    <p className="report-detail-summary">教练反馈：{s.feedback.summary}</p>
                  ) : null}
                  {s.feedback.priorities && s.feedback.priorities.length > 0 ? (
                    <ul className="report-detail-priorities">
                      {s.feedback.priorities.map((p, i) => (
                        <li key={i}>⚠ {p}</li>
                      ))}
                    </ul>
                  ) : null}
                  {s.feedback.sampleAnswer ? (
                    <details className="report-detail-sample">
                      <summary>查看高分示范答案</summary>
                      <p>{s.feedback.sampleAnswer}</p>
                    </details>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}

      <section className="report-actions-row">
        <Link href="/mock" className="link-button">再做一场模考</Link>
        <Link href="/history" className="link-button secondary">查看所有模考</Link>
      </section>
    </main>
  );
}
