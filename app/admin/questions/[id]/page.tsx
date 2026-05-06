import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuestionEditPanel } from "@/components/admin/question-edit-panel";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { deleteCustomQuestion, deriveQuestionSource, getQuestionById, isCustomQuestionId, toggleQuestionActive } from "@/lib/data/questions";
import { formatDate, formatPartLabel } from "@/lib/result-display";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

async function requireAdminAccess() {
  const user = await getServerUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }
}

function buildDetailHref(id: string, searchParams?: { success?: string; error?: string }) {
  const params = new URLSearchParams();

  if (searchParams?.success) params.set("success", searchParams.success);
  if (searchParams?.error) params.set("error", searchParams.error);

  const query = params.toString();
  return query ? `/admin/questions/${id}?${query}` : `/admin/questions/${id}`;
}

function revalidateQuestionPaths(questionId?: string) {
  revalidatePath("/admin/questions");
  revalidatePath("/practice");
  revalidatePath("/practice/part1");
  revalidatePath("/practice/part23");

  if (questionId) {
    revalidatePath(`/admin/questions/${questionId}`);
  }
}

function getSourceLabel(source: ReturnType<typeof deriveQuestionSource>) {
  return source === "custom" ? "自定义" : "Markdown";
}

function getSourceDescription(source: ReturnType<typeof deriveQuestionSource>) {
  return source === "custom" ? "可直接在后台修改并即时生效。" : "来自 Markdown 源题库，当前详情页仅支持只读查看。";
}

async function toggleQuestionActiveAction(formData: FormData) {
  "use server";

  await requireAdminAccess();

  const questionId = String(formData.get("questionId") ?? "").trim();
  const nextActive = String(formData.get("nextActive") ?? "") === "true";

  if (!questionId) {
    redirect("/admin/questions?error=缺少题目 ID。");
  }

  try {
    await toggleQuestionActive(questionId, nextActive);
    revalidateQuestionPaths(questionId);
    redirect(buildDetailHref(questionId, { success: nextActive ? "题目已启用。" : "题目已停用。" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新题目状态失败。";
    redirect(buildDetailHref(questionId, { error: message }));
  }
}

async function deleteQuestionAction(formData: FormData) {
  "use server";

  await requireAdminAccess();

  const questionId = String(formData.get("questionId") ?? "").trim();

  if (!questionId) {
    redirect("/admin/questions?error=缺少题目 ID。");
  }

  try {
    await deleteCustomQuestion(questionId);
    revalidateQuestionPaths(questionId);
    redirect("/admin/questions?success=题目已删除。");
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除题目失败。";
    redirect(buildDetailHref(questionId, { error: message }));
  }
}

export default async function AdminQuestionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireAdminAccess();

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!id || id.length > 200) {
    notFound();
  }

  if (!isSupabaseConfigured()) {
    return (
      <PageShell
        title="题目详情"
        description="题目详情页依赖 Supabase 持久化题库。"
        actions={
          <Link className="link-button secondary" href="/admin/questions">
            返回题库列表
          </Link>
        }
      >
        <SectionCard title="数据库未配置">
          <p>当前未配置 Supabase，无法查看题目详情。</p>
          <p className="inline-note">请先补齐数据库环境变量，再进入题库治理链路。</p>
        </SectionCard>
      </PageShell>
    );
  }

  const question = await getQuestionById(id);

  if (!question) {
    notFound();
  }

  const source = deriveQuestionSource(question.id);
  const isCustom = isCustomQuestionId(question.id);
  const successMessage = resolvedSearchParams?.success?.trim();
  const errorMessage = resolvedSearchParams?.error?.trim();

  return (
    <PageShell
      title="题目详情"
      description="查看题目元信息，并按来源决定是否允许编辑或删除。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/admin/questions">
            返回题库列表
          </Link>
          <form action={toggleQuestionActiveAction}>
            <input name="questionId" type="hidden" value={question.id} />
            <input name="nextActive" type="hidden" value={question.isActive ? "false" : "true"} />
            <button className={`action-button ${question.isActive ? "secondary" : "primary"}`} type="submit">
              {question.isActive ? "停用" : "启用"}
            </button>
          </form>
        </div>
      }
    >
      {errorMessage ? <p className="message-error">{errorMessage}</p> : null}
      {successMessage ? <p className="message-success">{successMessage}</p> : null}

      <div className="admin-detail-layout">
        <div className="admin-detail-two-col">
          <SectionCard title="题目概览">
            <div className="admin-session-summary-row">
              <div className="kpi-card">
                <p className="kpi-card-value">{formatPartLabel(question.part)}</p>
                <p className="kpi-card-label">所属 Part</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{question.difficulty}</p>
                <p className="kpi-card-label">当前难度</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{question.isActive ? "启用中" : "已停用"}</p>
                <p className="kpi-card-label">投放状态</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{getSourceLabel(source)}</p>
                <p className="kpi-card-label">题目来源</p>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <p><strong>Topic：</strong>{question.topic}</p>
              <p><strong>ID：</strong>{question.id}</p>
              <p><strong>创建时间：</strong>{formatDate(question.createdAt)}</p>
            </div>

            <div className="tag-row" style={{ marginTop: 12 }}>
              <Badge tone={source === "custom" ? "ok" : undefined}>{getSourceLabel(source)}</Badge>
              <Badge tone={question.isActive ? "ok" : "warn"}>{question.isActive ? "启用中" : "已停用"}</Badge>
            </div>

            <p className="inline-note" style={{ marginTop: 12 }}>{getSourceDescription(source)}</p>
          </SectionCard>

          <SectionCard title="题目预览">
            <p><strong>题目：</strong>{question.question}</p>
            {question.helper ? <p style={{ marginTop: 12 }}><strong>提示语：</strong>{question.helper}</p> : null}
            {!question.helper ? <p className="inline-note" style={{ marginTop: 12 }}>当前没有配置额外提示语。</p> : null}
            <p className="inline-note" style={{ marginTop: 12 }}>
              {isCustom ? "下方表单可直接修改题目内容、Topic、Part、难度和启用状态。" : "Markdown 题目只在此处预览；如需修改，请回到源 Markdown 文件后重新同步。"}
            </p>
          </SectionCard>
        </div>

        <SectionCard title={isCustom ? "编辑题目" : "题目内容（只读）"}>
          {isCustom ? (
            <QuestionEditPanel question={question} />
          ) : (
            <div className="placeholder-box compact">
              <p><strong>题目：</strong>{question.question}</p>
              {question.helper ? <p><strong>提示语：</strong>{question.helper}</p> : null}
              <p className="inline-note">来自 Markdown 文件，内容只读；如需修改，请回到源 Markdown 后重新同步。</p>
            </div>
          )}
        </SectionCard>

        {isCustom ? (
          <SectionCard title="危险操作">
            <p>删除后将从题库中移除该题；若已有练习记录，系统会阻止删除并提示改为停用。</p>
            <form action={deleteQuestionAction} style={{ marginTop: 16 }}>
              <input name="questionId" type="hidden" value={question.id} />
              <button className="action-button danger" type="submit">
                删除此题目
              </button>
            </form>
          </SectionCard>
        ) : null}
      </div>
    </PageShell>
  );
}
