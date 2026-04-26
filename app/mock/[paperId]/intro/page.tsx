import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createMockAttempt,
  findInProgressAttempt,
} from "@/lib/data/attempts";
import { buildMockPaperPlan } from "@/lib/data/papers";
import { getServerUser } from "@/lib/supabase/auth-server";
import type { MockPaperPlan } from "@/lib/types";

const RULES = [
  "整场模考不可暂停 · 如确需中断，可在 24 小时内回到此卷『继续模考』",
  "模考全程不显示分数，所有反馈集中在交卷后报告页",
  "Part 2 准备时间为 60 秒，可以提前开始独白，但不可延长",
  "麦克风建议使用有线耳麦，环境保持安静、网络稳定",
];

function partSummary(plan: MockPaperPlan) {
  const part1Total = plan.part1Questions.reduce((sum, q) => sum + (q.targetSeconds ?? 50), 0);
  const part3Total = plan.part3Questions.reduce((sum, q) => sum + (q.targetSeconds ?? 60), 0);
  const part2Total = (plan.part2Question.preparationSeconds ?? 60) + (plan.part2Question.targetSeconds ?? 110);

  return [
    {
      name: "Part 1",
      detail: `${plan.part1Questions.length} 道日常问答`,
      seconds: part1Total,
      hint: "短答 + 一个理由/例子，控制 30–60 秒",
    },
    {
      name: "Part 2",
      detail: "1 个 Cue Card · 60 秒准备 · 1.5–2 分钟独白",
      seconds: part2Total,
      hint: "屏幕上会有笔记区，按卡片四点组织",
    },
    {
      name: "Part 3",
      detail: `${plan.part3Questions.length} 道延展讨论`,
      seconds: part3Total,
      hint: "先观点、再理由、再举例，2–3 句",
    },
  ];
}

function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

async function startMockAttemptAction(formData: FormData) {
  "use server";
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const paperId = String(formData.get("paperId") ?? "").trim();
  if (!paperId) {
    redirect("/mock");
  }

  // Run any DB-touching work in try/catch so a missing table (schema not
  // run) or transient Supabase error surfaces as a friendly banner on /mock
  // instead of Next's generic "server error" page. Critically, redirect()
  // throws an internal NEXT_REDIRECT — we keep all redirects OUTSIDE the
  // try block so they're never swallowed.
  let plan = null;
  let existing = null;
  let attempt = null;
  let errorMessage: string | null = null;
  try {
    plan = await buildMockPaperPlan(paperId);
    if (plan) {
      existing = await findInProgressAttempt(user.id, paperId);
      if (!existing) {
        attempt = await createMockAttempt({
          userId: user.id,
          paperId,
          season: plan.paper.season,
        });
      }
    }
  } catch (err) {
    console.error("startMockAttemptAction failed:", err);
    errorMessage = err instanceof Error ? err.message : "未知错误";
  }

  if (errorMessage) {
    redirect(`/mock?error=${encodeURIComponent(errorMessage.slice(0, 200))}`);
  }
  if (!plan) {
    redirect("/mock");
  }
  if (existing) {
    redirect(`/mock/${paperId}/run?attemptId=${existing.id}`);
  }
  if (attempt) {
    redirect(`/mock/${paperId}/run?attemptId=${attempt.id}`);
  }
  redirect("/mock");
}

export default async function MockIntroPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const { paperId } = await params;
  const plan = await buildMockPaperPlan(paperId);
  if (!plan) {
    redirect("/mock");
  }

  const existing = await findInProgressAttempt(user.id, paperId);
  const sections = partSummary(plan);

  return (
    <main className="mock-intro">
      <div className="mock-intro-back">
        <Link href="/mock" className="mock-back-link">
          ← 返回模考大厅
        </Link>
      </div>

      <header className="mock-intro-header">
        <span className="mock-intro-eyebrow">模考说明 · {plan.paper.season}</span>
        <h1>{plan.paper.title}</h1>
        <p className="mock-intro-subtitle">完整 Part 1 → Part 2 → Part 3，预计用时 {formatMinutes(plan.estimatedDurationSeconds)}</p>
      </header>

      <section className="mock-intro-grid">
        <div className="mock-intro-sections">
          <h2>本场流程</h2>
          <ol className="mock-flow-list">
            {sections.map((section) => (
              <li key={section.name} className="mock-flow-item">
                <div className="mock-flow-head">
                  <span className="mock-flow-name">{section.name}</span>
                  <span className="mock-flow-duration">{formatMinutes(section.seconds)}</span>
                </div>
                <p className="mock-flow-detail">{section.detail}</p>
                <p className="mock-flow-hint">💡 {section.hint}</p>
              </li>
            ))}
          </ol>
        </div>

        <aside className="mock-intro-rules">
          <h2>考前须知</h2>
          <ul>
            {RULES.map((rule, idx) => (
              <li key={idx}>
                <span className="mock-rule-num">{String(idx + 1).padStart(2, "0")}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <Link href="/mock/check" className="mock-intro-check-link">
            → 还没测过设备？跳转设备检测
          </Link>
        </aside>
      </section>

      <section className="mock-intro-confirm">
        {existing ? (
          <>
            <p className="mock-confirm-note">
              你已有一场未完成的模考（开始于 {new Date(existing.startedAt).toLocaleString("zh-CN")}），点击下方按钮继续
            </p>
            <Link className="mock-start-button" href={`/mock/${paperId}/run?attemptId=${existing.id}`}>
              继续模考 →
            </Link>
          </>
        ) : (
          <form action={startMockAttemptAction}>
            <input type="hidden" name="paperId" value={paperId} />
            <p className="mock-confirm-note">点击下方按钮即开始计时，请确保此时不会被打扰</p>
            <button type="submit" className="mock-start-button">
              开始模考 →
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
