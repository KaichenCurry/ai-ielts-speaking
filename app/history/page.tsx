import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { HistoryListClient } from "@/components/history-list-client";
import { listPracticeSessions } from "@/lib/data/sessions";

export default async function HistoryPage() {
  const sessions = await listPracticeSessions();

  return (
    <PageShell
      title="我的练习记录"
      description="在这里查找每一次练习，回看评分反馈，并跟进申诉或人工处理状态。"
      actions={
        <Link className="link-button" href="/practice">
          + 开始新练习
        </Link>
      }
    >
      <HistoryListClient initialSessions={sessions} />
    </PageShell>
  );
}
