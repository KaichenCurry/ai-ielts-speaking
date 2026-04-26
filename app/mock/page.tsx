import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/auth-server";
import { listMockAttemptsForUser } from "@/lib/data/attempts";
import { getCurrentSeason, listMockPapersWithPreview, type MockPaperPreview } from "@/lib/data/papers";
import type { MockAttempt } from "@/lib/types";

function difficultyClass(d: string) {
  if (d === "easy") return "paper-tag-easy";
  if (d === "hard") return "paper-tag-hard";
  return "paper-tag-medium";
}
function difficultyLabel(d: string) {
  if (d === "easy") return "基础";
  if (d === "hard") return "进阶";
  return "标准";
}

type DecoratedPaper = MockPaperPreview & {
  inProgressAttempt: MockAttempt | null;
  completedCount: number;
  bestScore: number | null;
};

function decorate(papers: MockPaperPreview[], attempts: MockAttempt[]): DecoratedPaper[] {
  const byPaper = new Map<string, MockAttempt[]>();
  for (const a of attempts) {
    const list = byPaper.get(a.paperId) ?? [];
    list.push(a);
    byPaper.set(a.paperId, list);
  }
  return papers.map((paper) => {
    const list = byPaper.get(paper.id) ?? [];
    const inProgress = list.find((a) => a.status === "in_progress") ?? null;
    const scored = list.filter((a) => a.status === "scored");
    const bestScore = scored.reduce<number | null>((best, a) => {
      if (a.totalScore == null) return best;
      if (best == null || a.totalScore > best) return a.totalScore;
      return best;
    }, null);
    return {
      ...paper,
      inProgressAttempt: inProgress,
      completedCount: scored.length,
      bestScore,
    };
  });
}

function classifyError(raw: string): { kind: "schema" | "auth" | "generic"; hint: string } {
  const lower = raw.toLowerCase();
  if (lower.includes("does not exist") || lower.includes("relation") || lower.includes("undefined table")) {
    return {
      kind: "schema",
      hint: "Supabase 数据库 schema 不完整 —— 请在 Supabase Dashboard → SQL Editor 把最新的 supabase/schema.sql 整份重跑一次（含 mock_papers、mock_attempts 两张新表）",
    };
  }
  if (lower.includes("anonymous")) {
    return {
      kind: "auth",
      hint: "Supabase 还没启用访客模式 —— Authentication → Sign In / Providers → Anonymous Sign-Ins 开启",
    };
  }
  return { kind: "generic", hint: raw };
}

export default async function MockHallPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearch = searchParams ? await searchParams : undefined;
  const errorRaw = resolvedSearch?.error?.toString().trim() ?? "";
  const errorInfo = errorRaw ? classifyError(errorRaw) : null;

  // Don't crash the whole page if the data layer throws — surface a setup
  // banner instead, so the user knows what to fix in Supabase / Vercel.
  let papers: Awaited<ReturnType<typeof listMockPapersWithPreview>> = [];
  let attempts: Awaited<ReturnType<typeof listMockAttemptsForUser>> = [];
  let dataLoadError: string | null = null;
  try {
    [papers, attempts] = await Promise.all([
      listMockPapersWithPreview(),
      listMockAttemptsForUser(user.id, 100),
    ]);
  } catch (err) {
    console.error("MockHallPage data load failed:", err);
    dataLoadError = err instanceof Error ? err.message : "数据加载失败";
  }

  const season = getCurrentSeason();
  const decorated = decorate(papers, attempts);
  const recentInProgress = attempts.find((a) => a.status === "in_progress");
  const totalCompleted = attempts.filter((a) => a.status === "scored").length;
  const finalErrorInfo = errorInfo ?? (dataLoadError ? classifyError(dataLoadError) : null);

  return (
    <div className="hall">
      {/* HEADER */}
      <header className="hall-head">
        <span className="sb-eyebrow sb-eyebrow-orange">
          <span className="sb-eyebrow-dot" />
          {season.zhLabel} · 当季题季
        </span>
        <h1>选一张试卷开始模考</h1>
        <p>
          每张卷固定 1 个 Part 2/3 主题与对应 Part 1 高频问答 · 全程不可暂停 · 预计用时 11–14 分钟<br />
          想自己挑题目？点下方「自选题目模考」
        </p>
      </header>

      {/* ERROR BANNER — surfaces setup or data-layer failures */}
      {finalErrorInfo ? (
        <section className={`hall-alert hall-alert-${finalErrorInfo.kind}`} role="alert">
          <div className="hall-alert-icon" aria-hidden>!</div>
          <div className="hall-alert-body">
            <p className="hall-alert-title">
              {finalErrorInfo.kind === "schema"
                ? "数据库未配置完成"
                : finalErrorInfo.kind === "auth"
                  ? "访客模式未启用"
                  : "操作未能完成"}
            </p>
            <p className="hall-alert-hint">{finalErrorInfo.hint}</p>
            {finalErrorInfo.kind === "generic" ? (
              <details className="hall-alert-details">
                <summary>查看技术细节</summary>
                <code>{errorRaw || dataLoadError}</code>
              </details>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* RESUME BANNER */}
      {recentInProgress ? (
        <section className="hall-resume">
          <div className="hall-resume-info">
            <span className="hall-resume-tag">UNFINISHED · 未完成模考</span>
            <h3 className="hall-resume-title">{recentInProgress.paperId}</h3>
            <p className="hall-resume-when">
              开始于 {new Date(recentInProgress.startedAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <Link
            className="sb-btn sb-btn-accent"
            href={`/mock/${recentInProgress.paperId}/run?attemptId=${recentInProgress.id}`}
          >
            继续模考 →
          </Link>
        </section>
      ) : null}

      {/* QUICK LINKS — custom mock + check + history */}
      <section className="hall-quick">
        <Link href="/mock/custom" className="hall-quick-link hall-quick-link-feature">
          <div className="hall-quick-icon">🎯</div>
          <div className="hall-quick-text">
            <p className="hall-quick-title">自选题目模考</p>
            <p className="hall-quick-desc">挑你想练的 Part 1 + Part 2/3 主题，临时拼卷</p>
          </div>
          <span className="hall-quick-arrow">→</span>
        </Link>
        <Link href="/mock/check" className="hall-quick-link">
          <div className="hall-quick-icon">🎙</div>
          <div className="hall-quick-text">
            <p className="hall-quick-title">考前设备检测</p>
            <p className="hall-quick-desc">麦克风权限 + 录音电平</p>
          </div>
        </Link>
        <Link href="/history" className="hall-quick-link">
          <div className="hall-quick-icon">📊</div>
          <div className="hall-quick-text">
            <p className="hall-quick-title">我的报告</p>
            <p className="hall-quick-desc">{totalCompleted} 份已完成</p>
          </div>
        </Link>
      </section>

      {/* PAPER GRID */}
      <header className="hall-section-head">
        <h2>本期推荐试卷</h2>
        <p className="hall-section-helper">
          系统按当季题库自动组卷，每张卷主题固定
        </p>
      </header>

      {decorated.length === 0 ? (
        <div className="hall-empty">
          <h3>当季还没有可用试卷</h3>
          <p>请联系管理员补齐题库，或试试上方的自选题目模考</p>
        </div>
      ) : (
        <div className="hall-grid">
          {decorated.map((paper, index) => {
            const num = String(index + 1).padStart(2, "0");
            return (
              <Link
                key={paper.id}
                href={`/mock/${paper.id}/intro`}
                className="paper"
              >
                <div className="paper-top">
                  <span className="paper-num">PAPER · {num}</span>
                  <span className={`paper-tag ${difficultyClass(paper.difficulty)}`}>
                    {difficultyLabel(paper.difficulty)}
                  </span>
                </div>
                <h3 className="paper-title">{paper.title}</h3>

                {/* Topic preview — what this paper actually drills */}
                <div className="paper-topics">
                  <div className="paper-topics-row">
                    <span className="paper-topics-label">P1</span>
                    <span className="paper-topics-value">
                      {paper.part1TopicTitles.length > 0
                        ? paper.part1TopicTitles.join(" · ")
                        : "—"}
                    </span>
                  </div>
                  <div className="paper-topics-row">
                    <span className="paper-topics-label paper-topics-label-accent">P2/3</span>
                    <span className="paper-topics-value">{paper.part23TopicTitle}</span>
                  </div>
                </div>

                <div className="paper-stats">
                  {paper.inProgressAttempt ? (
                    <span className="paper-status paper-status-progress">未完成</span>
                  ) : paper.completedCount > 0 ? (
                    <span className="paper-status paper-status-done">
                      已完成 × {paper.completedCount}
                    </span>
                  ) : (
                    <span className="paper-status paper-status-new">未尝试</span>
                  )}
                  {paper.bestScore != null ? (
                    <span className="paper-best">最高 {paper.bestScore.toFixed(1)}</span>
                  ) : null}
                </div>
                <div className="paper-cta">
                  <span>进入考前说明</span>
                  <span className="paper-cta-arrow">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
