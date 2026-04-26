import Link from "next/link";
import { redirect } from "next/navigation";
import { createMockAttempt } from "@/lib/data/attempts";
import {
  createCustomMockPaper,
  getTopicCatalog,
} from "@/lib/data/papers";
import { getServerUser } from "@/lib/supabase/auth-server";

async function startCustomMockAction(formData: FormData) {
  "use server";
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const part1Slugs = formData.getAll("part1").map((v) => String(v).trim()).filter(Boolean);
  const part23Slug = String(formData.get("part23") ?? "").trim();

  // Same defensive pattern as the intro server action: do all DB work
  // inside try/catch and only redirect outside, so a missing table /
  // schema mismatch lands on /mock with a banner instead of a generic 500.
  let paper = null;
  let attempt = null;
  let errorMessage: string | null = null;
  try {
    paper = await createCustomMockPaper({
      userId: user.id,
      part1TopicSlugs: part1Slugs,
      part23TopicSlug: part23Slug,
    });
    attempt = await createMockAttempt({
      userId: user.id,
      paperId: paper.id,
      season: paper.season,
    });
  } catch (err) {
    console.error("startCustomMockAction failed:", err);
    errorMessage = err instanceof Error ? err.message : "未知错误";
  }

  if (errorMessage) {
    redirect(`/mock?error=${encodeURIComponent(errorMessage.slice(0, 200))}`);
  }
  if (paper && attempt) {
    redirect(`/mock/${paper.id}/run?attemptId=${attempt.id}`);
  }
  redirect("/mock");
}

export default async function CustomMockPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const catalog = await getTopicCatalog();

  return (
    <main className="picker">
      <div className="picker-back">
        <Link href="/mock" className="mock-back-link">← 返回模考大厅</Link>
      </div>

      <header className="picker-head">
        <span className="sb-eyebrow sb-eyebrow-orange">
          <span className="sb-eyebrow-dot" />
          自选题目模考
        </span>
        <h1>挑你想练的题目</h1>
        <p>
          选 1–3 个 Part 1 主题（每主题 3 题），再选一个 Part 2 / Part 3 主题<br />
          系统会按你的选择临时拼一张试卷开始模考
        </p>
      </header>

      <form action={startCustomMockAction} className="picker-form">
        {/* PART 1 — multi-select up to 3 */}
        <section className="picker-section">
          <header className="picker-section-head">
            <div>
              <h2>Part 1 主题</h2>
              <p>选 1–3 个，每个主题会出 3 道题</p>
            </div>
            <span className="picker-count" id="picker-p1-count">最多 3 个</span>
          </header>
          <div className="picker-grid">
            {catalog.part1.map((topic) => (
              <label key={topic.topicSlug} className="picker-chip">
                <input
                  type="checkbox"
                  name="part1"
                  value={topic.topicSlug}
                />
                <span className="picker-chip-body">
                  <span className="picker-chip-title">{topic.topicTitle}</span>
                  <span className="picker-chip-meta">{topic.questionCount} 道题</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* PART 2/3 — single select */}
        <section className="picker-section">
          <header className="picker-section-head">
            <div>
              <h2>Part 2 / Part 3 主题</h2>
              <p>选 1 个，包含 1 张 Cue Card + 4–5 道 Part 3 延展讨论</p>
            </div>
            <span className="picker-count">必选 1 个</span>
          </header>
          <div className="picker-grid">
            {catalog.part23.map((topic) => (
              <label key={topic.topicSlug} className="picker-chip picker-chip-radio">
                <input
                  type="radio"
                  name="part23"
                  value={topic.topicSlug}
                  required
                />
                <span className="picker-chip-body">
                  <span className="picker-chip-title">{topic.topicTitle}</span>
                  <span className="picker-chip-meta">{topic.questionCount} 道题</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="picker-footer">
          <p className="picker-footer-note">
            提交后会立刻进入模考 · 请确保有 12–15 分钟不被打扰
          </p>
          <div className="picker-footer-actions">
            <Link href="/mock" className="sb-btn sb-btn-ghost">取消</Link>
            <button type="submit" className="sb-btn sb-btn-accent sb-btn-lg">
              开始自选模考 →
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
