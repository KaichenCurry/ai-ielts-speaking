import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/auth-server";
import { listMockAttemptsForUser } from "@/lib/data/attempts";
import { getCurrentSeason } from "@/lib/data/papers";

function classifyError(raw: string): { kind: "schema" | "auth" | "fk" | "generic"; hint: string } {
  const lower = raw.toLowerCase();
  if (lower.includes("does not exist") || lower.includes("relation") || lower.includes("undefined table")) {
    return {
      kind: "schema",
      hint: "Supabase 数据库 schema 不完整 —— 请在 Supabase Dashboard → SQL Editor 把最新的 supabase/schema.sql 整份重跑一次（含 mock_papers、mock_attempts 两张新表）",
    };
  }
  if (lower.includes("foreign key") || lower.includes("violates foreign key") || lower.includes("_fkey")) {
    return {
      kind: "fk",
      hint: "试卷数据未同步到数据库（外键约束失败）—— 已在最新版自动修复，请刷新此页面重试 · 仍报错请联系管理员",
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

  // Defensive load — show banner instead of crashing.
  let attempts: Awaited<ReturnType<typeof listMockAttemptsForUser>> = [];
  let dataLoadError: string | null = null;
  try {
    attempts = await listMockAttemptsForUser(user.id, 100);
  } catch (err) {
    console.error("MockHallPage data load failed:", err);
    dataLoadError = err instanceof Error ? err.message : "数据加载失败";
  }

  const season = getCurrentSeason();
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
        <h1>挑你想练的题目，开始模考</h1>
        <p>
          按真实考场节奏完成 Part 1 → Part 2 → Part 3 · 全程不可暂停 · 预计用时 11–14 分钟
        </p>
      </header>

      {/* ERROR BANNER */}
      {finalErrorInfo ? (
        <section className={`hall-alert hall-alert-${finalErrorInfo.kind}`} role="alert">
          <div className="hall-alert-icon" aria-hidden>!</div>
          <div className="hall-alert-body">
            <p className="hall-alert-title">
              {finalErrorInfo.kind === "schema"
                ? "数据库未配置完成"
                : finalErrorInfo.kind === "fk"
                  ? "试卷未同步"
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

      {/* CENTERPIECE — self-pick mock card (the only entry to start a mock) */}
      <Link href="/mock/custom" className="hall-pick">
        <div className="hall-pick-icon" aria-hidden>🎯</div>
        <div className="hall-pick-body">
          <span className="hall-pick-eyebrow">
            <span className="hall-pick-eyebrow-dot" />
            START · 选题模考
          </span>
          <h2 className="hall-pick-title">自选题目模考</h2>
          <p className="hall-pick-desc">
            挑你想练的 Part 1 主题（最多 3 个）和 Part 2 / Part 3 主题，系统按你的选择临时拼一张试卷开始模考
          </p>
          <ul className="hall-pick-bullets">
            <li><span aria-hidden>✓</span> Part 1 多选 1–3 个主题，每个主题 3 道题</li>
            <li><span aria-hidden>✓</span> Part 2 / Part 3 单选 1 个主题，含 1 张 Cue Card + 4–5 道延展讨论</li>
            <li><span aria-hidden>✓</span> 提交后立刻进入模考，全程录音、AI 评分</li>
          </ul>
        </div>
        <div className="hall-pick-cta">
          <span className="hall-pick-cta-label">开始</span>
          <span className="hall-pick-cta-arrow" aria-hidden>→</span>
        </div>
      </Link>

      {/* SECONDARY — device check + history */}
      <section className="hall-quick">
        <Link href="/mock/check" className="hall-quick-link">
          <div className="hall-quick-icon">🎙</div>
          <div className="hall-quick-text">
            <p className="hall-quick-title">考前设备检测</p>
            <p className="hall-quick-desc">麦克风权限 + 录音电平 + 环境噪声</p>
          </div>
        </Link>
        <Link href="/history" className="hall-quick-link">
          <div className="hall-quick-icon">📊</div>
          <div className="hall-quick-text">
            <p className="hall-quick-title">我的报告</p>
            <p className="hall-quick-desc">{totalCompleted} 份已完成 · 含五维分项</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
