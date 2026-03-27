import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import {
  listQuestionsWithCompletion,
  syncMarkdownQuestionsToSupabase,
  toggleQuestionActive,
} from "@/lib/data/questions";
import { formatPartLabel } from "@/lib/result-display";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import type { QuestionDifficulty, SpeakingPart } from "@/lib/types";

const PART_OPTIONS: Array<{ value: SpeakingPart; label: string }> = [
  { value: "part1", label: "Part 1" },
  { value: "part2", label: "Part 2" },
  { value: "part3", label: "Part 3" },
];

const DIFFICULTY_OPTIONS: Array<{ value: QuestionDifficulty; label: string }> = [
  { value: "easy", label: "easy" },
  { value: "medium", label: "medium" },
  { value: "hard", label: "hard" },
];

type AdminQuestionSearchParams = {
  part?: string;
  difficulty?: string;
  active?: string;
  success?: string;
  error?: string;
};

function difficultyTone(difficulty: string) {
  if (difficulty === "easy") return "ok" as const;
  if (difficulty === "medium") return undefined;
  return "warn" as const;
}

function parsePart(value: string | undefined): SpeakingPart | undefined {
  return value === "part1" || value === "part2" || value === "part3" ? value : undefined;
}

function parseDifficulty(value: string | undefined): QuestionDifficulty | undefined {
  return value === "easy" || value === "medium" || value === "hard" ? value : undefined;
}

function parseIsActive(value: string | undefined): boolean | undefined {
  if (value === "active") {
    return true;
  }

  if (value === "inactive") {
    return false;
  }

  return undefined;
}

function buildAdminQuestionsHref(searchParams: {
  part?: string;
  difficulty?: string;
  active?: string;
  success?: string;
  error?: string;
}) {
  const params = new URLSearchParams();

  if (searchParams.part) params.set("part", searchParams.part);
  if (searchParams.difficulty) params.set("difficulty", searchParams.difficulty);
  if (searchParams.active) params.set("active", searchParams.active);
  if (searchParams.success) params.set("success", searchParams.success);
  if (searchParams.error) params.set("error", searchParams.error);

  const query = params.toString();
  return query ? `/admin/questions?${query}` : "/admin/questions";
}

function getReturnSearchParams(formData: FormData) {
  return {
    part: String(formData.get("returnPart") ?? "").trim() || undefined,
    difficulty: String(formData.get("returnDifficulty") ?? "").trim() || undefined,
    active: String(formData.get("returnActive") ?? "").trim() || undefined,
  };
}

async function requireAdminAccess() {
  const user = await getServerUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/practice");
  }
}

async function syncMarkdownQuestionsAction(formData: FormData) {
  "use server";

  await requireAdminAccess();

  const returnSearchParams = getReturnSearchParams(formData);

  try {
    const result = await syncMarkdownQuestionsToSupabase();
    revalidatePath("/admin/questions");
    revalidatePath("/practice");
    revalidatePath("/practice/part1");
    revalidatePath("/practice/part23");
    redirect(
      buildAdminQuestionsHref({
        ...returnSearchParams,
        success: `已同步 ${result.syncedCount} 道 Markdown 题目到 Supabase。`,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步 Markdown 题库失败。";
    redirect(buildAdminQuestionsHref({ ...returnSearchParams, error: message }));
  }
}

async function toggleQuestionActiveAction(formData: FormData) {
  "use server";

  await requireAdminAccess();

  const returnSearchParams = getReturnSearchParams(formData);
  const questionId = String(formData.get("questionId") ?? "").trim();
  const nextActive = String(formData.get("nextActive") ?? "") === "true";

  if (!questionId) {
    redirect(buildAdminQuestionsHref({ ...returnSearchParams, error: "缺少题目 ID。" }));
  }

  try {
    await toggleQuestionActive(questionId, nextActive);
    revalidatePath("/admin/questions");
    revalidatePath("/practice");
    revalidatePath("/practice/part1");
    revalidatePath("/practice/part23");
    redirect(
      buildAdminQuestionsHref({
        ...returnSearchParams,
        success: nextActive ? "题目已启用。" : "题目已停用。",
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新题目状态失败。";
    redirect(buildAdminQuestionsHref({ ...returnSearchParams, error: message }));
  }
}

function HiddenReturnFields({ searchParams }: { searchParams?: AdminQuestionSearchParams }) {
  return (
    <>
      <input name="returnPart" type="hidden" value={searchParams?.part ?? ""} />
      <input name="returnDifficulty" type="hidden" value={searchParams?.difficulty ?? ""} />
      <input name="returnActive" type="hidden" value={searchParams?.active ?? ""} />
    </>
  );
}

function getQuestionSourceLabel(question: {
  source: "markdown" | "custom";
  isPersisted: boolean;
}) {
  if (!question.isPersisted) {
    return "待同步";
  }

  return question.source === "custom" ? "自定义" : "Markdown 已落库";
}

function renderQuestionList(
  questions: Awaited<ReturnType<typeof listQuestionsWithCompletion>>,
  resolvedSearchParams: AdminQuestionSearchParams | undefined,
  supabaseConfigured: boolean,
) {
  return (
    <div className="list-grid admin-question-list">
      {questions.map((question) => (
        <section
          className={`list-item admin-question-item ${question.isActive ? "is-active" : "is-inactive"}`}
          key={question.id}
        >
          <div className="list-main">
            <h3>{question.question}</h3>
            <p className="inline-note">{question.topic}</p>
            <p>{question.helper}</p>
            <p className="inline-note" style={{ marginTop: -2, marginBottom: 10 }}>
              {getQuestionSourceLabel(question)}
            </p>
            <div className="tag-row">
              <Badge>{formatPartLabel(question.part)}</Badge>
              <Badge tone={difficultyTone(question.difficulty)}>{question.difficulty}</Badge>
              <Badge tone={question.isCompleted ? "ok" : "warn"}>{question.isCompleted ? "已完成" : "未完成"}</Badge>
            </div>
          </div>

          <div className="action-row">
            {question.isPersisted ? (
              <Link className="link-button secondary" href={`/admin/questions/${question.id}`}>
                详情
              </Link>
            ) : (
              <Badge tone="warn">需先同步后查看详情</Badge>
            )}
            {supabaseConfigured && question.isPersisted ? (
              <form action={toggleQuestionActiveAction}>
                <HiddenReturnFields searchParams={resolvedSearchParams} />
                <input name="questionId" type="hidden" value={question.id} />
                <input name="nextActive" type="hidden" value={question.isActive ? "false" : "true"} />
                <button className={`action-button ${question.isActive ? "secondary" : "primary"}`} type="submit">
                  {question.isActive ? "停用" : "启用"}
                </button>
              </form>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupQuestionsByPart(questions: Awaited<ReturnType<typeof listQuestionsWithCompletion>>) {
  return PART_OPTIONS.map((option) => ({
    part: option.value,
    label: option.label,
    questions: questions.filter((question) => question.part === option.value),
  })).filter((group) => group.questions.length > 0);
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams?: Promise<AdminQuestionSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const part = parsePart(resolvedSearchParams?.part);
  const difficulty = parseDifficulty(resolvedSearchParams?.difficulty);
  const isActive = parseIsActive(resolvedSearchParams?.active);
  const supabaseConfigured = isSupabaseConfigured();

  const questions = await listQuestionsWithCompletion({ part, difficulty, isActive });
  const completedCount = questions.filter((question) => question.isCompleted).length;
  const activeCount = questions.filter((question) => question.isActive).length;
  const persistedCount = questions.filter((question) => question.isPersisted).length;
  const successMessage = resolvedSearchParams?.success?.trim();
  const errorMessage = resolvedSearchParams?.error?.trim();
  const hasActiveFilter = part !== undefined || difficulty !== undefined || isActive !== undefined;
  const groupedQuestions = hasActiveFilter ? [] : groupQuestionsByPart(questions);

  return (
    <PageShell
      title="题库管理"
      description="优先使用你上传的 Markdown 题库；同步到 Supabase 后，后台可以直接做启用 / 停用管理。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/admin">
            返回后台总览
          </Link>
          <Link className="link-button secondary" href="/admin/rules">
            查看规则版本
          </Link>
          {supabaseConfigured ? (
            <Link className="link-button" href="/admin/questions/new">
              新建题目
            </Link>
          ) : null}
          {supabaseConfigured ? (
            <form action={syncMarkdownQuestionsAction}>
              <HiddenReturnFields searchParams={resolvedSearchParams} />
              <button className="action-button primary" type="submit">
                同步 Markdown 题库
              </button>
            </form>
          ) : null}
        </div>
      }
    >
      {errorMessage ? <p className="message-error">{errorMessage}</p> : null}
      {successMessage ? <p className="message-success">{successMessage}</p> : null}

      <SectionCard title="题库概览">
        <div className="admin-session-summary-row">
          <div className="kpi-card">
            <p className="kpi-card-value">{questions.length}</p>
            <p className="kpi-card-label">总题数</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{activeCount}</p>
            <p className="kpi-card-label">启用中</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{completedCount}</p>
            <p className="kpi-card-label">已完成</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-value">{persistedCount}</p>
            <p className="kpi-card-label">已落库</p>
          </div>
        </div>
        <p className="inline-note" style={{ marginTop: 12 }}>
          {supabaseConfigured
            ? persistedCount === questions.length && questions.length > 0
              ? "当前列表已经全部同步到 Supabase，可直接启用或停用。"
              : "当前列表里还有未落库题目。先点上方“同步 Markdown 题库”，再进行启用或停用。"
            : "当前仅按 Markdown 题库只读展示；配置 Supabase service role 后才能落库和启停。"}
        </p>
      </SectionCard>

      <SectionCard title="筛选题目">
        <form className="form-grid" method="get">
          <label className="form-field">
            <span>Part</span>
            <select name="part" defaultValue={part ?? ""}>
              <option value="">全部</option>
              {PART_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>难度</span>
            <select name="difficulty" defaultValue={difficulty ?? ""}>
              <option value="">全部</option>
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>状态</span>
            <select name="active" defaultValue={resolvedSearchParams?.active ?? ""}>
              <option value="">全部</option>
              <option value="active">启用中</option>
              <option value="inactive">已停用</option>
            </select>
          </label>

          <div className="form-field">
            <span>操作</span>
            <div className="action-row">
              <button className="action-button primary" type="submit">
                应用筛选
              </button>
              <Link className="link-button secondary" href="/admin/questions">
                重置
              </Link>
            </div>
          </div>
        </form>
      </SectionCard>

      {questions.length === 0 ? (
        <section className="placeholder-box compact">当前筛选条件下没有题目。</section>
      ) : hasActiveFilter ? (
        renderQuestionList(questions, resolvedSearchParams, supabaseConfigured)
      ) : (
        <div className="admin-question-groups">
          {groupedQuestions.map((group) => (
            <SectionCard key={group.part} title={`${group.label} · ${group.questions.length} 道题`}>
              {renderQuestionList(group.questions, resolvedSearchParams, supabaseConfigured)}
            </SectionCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}
