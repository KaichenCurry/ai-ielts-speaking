import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { PracticeWorkspace } from "@/components/practice/practice-workspace";
import { getQuestionConfig } from "@/lib/mock-data";

export default async function PracticePartPage({
  params,
}: {
  params: Promise<{ part: string }>;
}) {
  const { part } = await params;
  const current = getQuestionConfig(part);

  if (!current) {
    notFound();
  }

  return (
    <PageShell
      title={current.title}
      description="这一版已接入真实浏览器录音能力，并通过 mock API 模拟转写与评分提交链路。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/practice">
            返回 Part 选择
          </Link>
          <Link className="link-button secondary" href="/history">
            查看历史记录
          </Link>
        </div>
      }
    >
      <PracticeWorkspace config={current} />
    </PageShell>
  );
}
