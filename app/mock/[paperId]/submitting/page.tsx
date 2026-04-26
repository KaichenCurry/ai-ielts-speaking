import Link from "next/link";
import { redirect } from "next/navigation";
import { getMockAttemptForUser } from "@/lib/data/attempts";
import { getServerUser } from "@/lib/supabase/auth-server";

export default async function MockSubmittingPage({
  params,
  searchParams,
}: {
  params: Promise<{ paperId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const { paperId } = await params;
  const { attemptId } = await searchParams;

  if (!attemptId) {
    redirect(`/mock/${paperId}/intro`);
  }

  const attempt = await getMockAttemptForUser(attemptId, user.id);
  if (!attempt) {
    redirect("/mock");
  }

  if (attempt.status === "scored") {
    redirect(`/report/${attempt.id}`);
  }

  return (
    <main className="mock-submitting-page">
      <div className="mock-submitting-card">
        <div className="mock-submitting-spinner" aria-hidden />
        <h1>正在批阅你的模考</h1>
        <p>系统正在依次完成：语音转写 → 检索匹配的评分参考 → 多 Agent 评分与教练反馈生成</p>
        <p className="mock-submitting-note">通常需要 30–60 秒请勿关闭页面</p>
        <p className="mock-run-attempt-meta">Attempt: <code>{attempt.id}</code></p>
        <div className="mock-run-actions">
          <Link className="mock-run-secondary" href="/mock">返回大厅</Link>
        </div>
      </div>
    </main>
  );
}
