import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadCasePanel } from "@/components/admin/bad-case-panel";
import { PageShell, SectionCard } from "@/components/page-shell";
import { ReviewActionPanel } from "@/components/admin/review-action-panel";
import { Badge } from "@/components/ui";
import { listBadCasesBySessionId, listPromptVersions } from "@/lib/data/rules";
import { getPracticeSessionById, listStudents, updatePracticeSessionGovernance } from "@/lib/data/sessions";
import { scoreClass } from "@/lib/result-display";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function appealStatusLabel(status: string) {
  if (status === "submitted") return "待处理";
  if (status === "reviewed") return "已处理";
  return "无申诉";
}

function reviewStatusLabel(status: string) {
  if (status === "flagged") return "已标记";
  if (status === "completed") return "已完成";
  return "待复核";
}

async function requireAdminAccess() {
  const user = await getServerUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect("/practice");
  }
}

export default async function AdminStudentSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; sessionId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { userId, sessionId } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  const successMessage = resolved?.success?.trim();
  const errorMessage = resolved?.error?.trim();

  if (!isSupabaseConfigured()) {
    return (
      <PageShell
        title="会话详情 / 复核页"
        description="后台治理页只展示真实数据库会话；未配置数据库时不会回退到假数据。"
        actions={
          <div className="action-row">
            <Link className="link-button secondary" href={`/admin/students/${userId}`}>
              返回学生详情
            </Link>
            <Link className="link-button" href="/admin/rules">
              查看规则版本
            </Link>
          </div>
        }
      >
        <SectionCard title="数据库未配置">
          <p>当前未配置 Supabase，无法查看治理会话详情。</p>
          <p className="inline-note">请先补齐数据库环境变量，再进入后台复核链路。</p>
        </SectionCard>
      </PageShell>
    );
  }

  const session = await getPracticeSessionById(sessionId);

  if (!session || session.userId !== userId) {
    notFound();
  }

  const [promptVersions, badCases, students] = await Promise.all([
    listPromptVersions(),
    listBadCasesBySessionId(sessionId),
    listStudents(),
  ]);
  const student = students.find((item) => item.userId === userId);

  const hasPendingAppeal = session.appealStatus === "submitted";

  async function resolveAppealAction(formData: FormData) {
    "use server";

    await requireAdminAccess();

    const sessionId = String(formData.get("sessionId") ?? "").trim();
    if (!sessionId) {
      redirect(`/admin/students/${userId}`);
    }

    const session = await getPracticeSessionById(sessionId);
    if (!session || session.userId !== userId) {
      redirect(`/admin/students/${userId}`);
    }

    try {
      await updatePracticeSessionGovernance({
        sessionId,
        riskFlag: session.riskFlag,
        riskReason: session.riskReason ?? "",
        appealStatus: "reviewed",
        appealNote: session.appealNote ?? "",
        reviewStatus: session.reviewStatus,
        reviewResult: session.reviewResult ?? "",
        reviewNote: session.reviewNote ?? "",
      });
      revalidatePath(`/admin/students/${userId}/${sessionId}`);
      revalidatePath(`/admin/students/${userId}`);
      revalidatePath("/admin/students");
      redirect(`/admin/students/${userId}/${sessionId}?success=申诉已标记为处理完成。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败。";
      redirect(`/admin/students/${userId}/${sessionId}?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <PageShell
      title="会话详情 / 复核页"
      description="查看会话全貌，执行复核治理操作，或将问题样本沉淀为 bad case。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href={`/admin/students/${userId}`}>
            返回学生详情
          </Link>
          <Link className="link-button secondary" href="/admin/rules">
            查看规则版本
          </Link>
        </div>
      }
    >
      {errorMessage ? <p className="message-error">{errorMessage}</p> : null}
      {successMessage ? <p className="message-success">{successMessage}</p> : null}

      <div className="admin-detail-layout">
        <div className="admin-detail-two-col">
          <SectionCard title="会话概览">
            <p><strong>学生：</strong>{student?.email || session.userId?.slice(0, 8) || "未知"}</p>
            <p><strong>Topic：</strong>{session.topicTitle}</p>
            <p><strong>题目：</strong>{session.questionText}</p>
            <p><strong>题目标识：</strong>{session.questionLabel}</p>
            <p><strong>练习时间：</strong>{formatDate(session.createdAt)}</p>
            {session.riskReason ? (
              <p><strong>风险原因：</strong>{session.riskReason}</p>
            ) : null}
            {session.appealNote && session.appealStatus !== "none" ? (
              <p><strong>学生申诉内容：</strong>{session.appealNote}</p>
            ) : null}
            {session.appealedAt ? (
              <p><strong>申诉时间：</strong>{formatDate(session.appealedAt)}</p>
            ) : null}
            <div className="tag-row" style={{ marginTop: 12 }}>
              <Badge>{session.part.toUpperCase()}</Badge>
              <Badge tone={session.riskFlag ? "warn" : "ok"}>
                {session.riskFlag ? "异常候选" : "正常"}
              </Badge>
              <Badge tone={hasPendingAppeal ? "warn" : undefined}>
                申诉：{appealStatusLabel(session.appealStatus)}
              </Badge>
              <Badge tone={session.reviewStatus === "completed" ? "ok" : session.reviewStatus === "flagged" ? "warn" : undefined}>
                复核：{reviewStatusLabel(session.reviewStatus)}
              </Badge>
            </div>

            {hasPendingAppeal ? (
              <form action={resolveAppealAction} style={{ marginTop: 16 }}>
                <input name="sessionId" type="hidden" value={session.id} />
                <button className="action-button primary" type="submit">
                  一键标记申诉已处理
                </button>
              </form>
            ) : null}
          </SectionCard>

          <SectionCard title="AI 评分结果">
            <div className="score-grid admin-score-grid">
              <div className={`score-box score-total ${scoreClass(session.score.total)}`}><span>总分</span><strong>{session.score.total}</strong></div>
              <div className={`score-box ${scoreClass(session.score.fluencyCoherence)}`}><span>流利度</span><strong>{session.score.fluencyCoherence}</strong></div>
              <div className={`score-box ${scoreClass(session.score.lexicalResource)}`}><span>词汇</span><strong>{session.score.lexicalResource}</strong></div>
              <div className={`score-box ${scoreClass(session.score.grammar)}`}><span>语法</span><strong>{session.score.grammar}</strong></div>
              <div className={`score-box ${scoreClass(session.score.pronunciation)}`}><span>发音</span><strong>{session.score.pronunciation}</strong></div>
              <div className={`score-box ${scoreClass(session.score.completeness)}`}><span>完整度</span><strong>{session.score.completeness}</strong></div>
            </div>
            {session.feedback.summary ? (
              <p style={{ marginTop: 16 }}><strong>教练总结：</strong>{session.feedback.summary}</p>
            ) : null}
            {session.feedback.strengths.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <p><strong>优点</strong></p>
                <ul className="muted-list">
                  {session.feedback.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {session.feedback.priorities.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <p><strong>优先改进项</strong></p>
                <ul className="muted-list">
                  {session.feedback.priorities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {session.feedback.nextStep ? (
              <p style={{ marginTop: 12 }}><strong>下一步：</strong>{session.feedback.nextStep}</p>
            ) : null}
          </SectionCard>
        </div>

        <SectionCard title="转写原文">
          <p className="inline-note" style={{ lineHeight: 1.8 }}>{session.transcript}</p>
        </SectionCard>

        <div className="admin-detail-two-col">
          <SectionCard title="执行治理动作">
            <ReviewActionPanel session={session} userId={userId} />
          </SectionCard>

          <SectionCard title="沉淀 bad case">
            <BadCasePanel session={session} promptVersions={promptVersions} badCases={badCases} />
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
