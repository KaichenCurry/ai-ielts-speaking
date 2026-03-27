import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { PracticeWorkspace } from "@/components/practice/practice-workspace";
import { getPart1QuestionById } from "@/lib/data/questions";
import type { PracticeQuestionConfig } from "@/lib/types";

const PART1_HELPER = "用 2-4 句话直接回答，补一个原因或例子，尽量自然流畅。";

export default async function Part1PracticePage({
  params,
}: {
  params: Promise<{ topicSlug: string; questionId: string }>;
}) {
  const { topicSlug, questionId } = await params;
  const question = await getPart1QuestionById(topicSlug, questionId);

  if (!question) {
    notFound();
  }

  const config: PracticeQuestionConfig = {
    topicSlug: question.topicSlug,
    topicTitle: question.topicTitle,
    questionId: question.id,
    questionText: question.questionText,
    questionIndex: question.questionIndex,
    questionLabel: `Part 1 Question ${question.questionIndex}`,
    part: "part1",
    title: `Part 1 · ${question.topicTitle}`,
    difficulty: question.difficulty || "easy",
    helper: `Topic: ${question.topicTitle} · Question ${question.questionIndex} · ${question.helper || PART1_HELPER}`,
  };

  return (
    <PageShell
      title={`Part 1 · ${question.topicTitle}`}
      description={`当前是 Question ${question.questionIndex}。录音完成后 AI 会自动转写并评分。`}
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href={`/practice/part1/${question.topicSlug}`}>
            返回 Question 列表
          </Link>
          <Link className="link-button secondary" href="/history">
            查看历史记录
          </Link>
        </div>
      }
    >
      <PracticeWorkspace config={config} />
    </PageShell>
  );
}
