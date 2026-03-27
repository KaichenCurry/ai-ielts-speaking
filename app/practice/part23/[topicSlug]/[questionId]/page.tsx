import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { PracticeWorkspace } from "@/components/practice/practice-workspace";
import { getPart23Part2QuestionId, getPart23TopicBySlug } from "@/lib/data/questions";
import type { PracticeQuestionConfig } from "@/lib/types";

const PART2_HELPER = "按卡片四点组织内容，加入细节和感受，尽量说满 1.5-2 分钟。";
const PART3_HELPER = "先给观点，再补理由或例子，展开 2-3 句，注意逻辑连接。";

export default async function Part23PracticePage({
  params,
}: {
  params: Promise<{ topicSlug: string; questionId: string }>;
}) {
  const { topicSlug, questionId } = await params;
  const topic = await getPart23TopicBySlug(topicSlug);

  if (!topic) {
    notFound();
  }

  const resolvedPart2QuestionId = topic.part2QuestionId || getPart23Part2QuestionId(topic.topicSlug);
  const isPart2 = questionId === resolvedPart2QuestionId;
  const part3Question = topic.part3Questions.find((question) => question.id === questionId) ?? null;

  if (!isPart2 && !part3Question) {
    notFound();
  }

  const config: PracticeQuestionConfig = isPart2
    ? {
        topicSlug: topic.topicSlug,
        topicTitle: topic.topicTitle,
        questionId,
        questionText: topic.part2QuestionCard,
        questionIndex: null,
        questionLabel: "Part 2 Cue Card",
        part: "part2",
        title: `Part 2 · ${topic.topicTitle}`,
        difficulty: topic.part2Difficulty || "medium",
        helper: `Topic: ${topic.topicTitle} · ${topic.part2Helper || PART2_HELPER}`,
      }
    : {
        topicSlug: topic.topicSlug,
        topicTitle: topic.topicTitle,
        questionId: part3Question!.id,
        questionText: part3Question!.questionText,
        questionIndex: part3Question!.questionIndex,
        questionLabel: `Part 3 Question ${part3Question!.questionIndex}`,
        part: "part3",
        title: `Part 3 · ${topic.topicTitle}`,
        difficulty: part3Question!.difficulty || "hard",
        helper: `Topic: ${topic.topicTitle} · Question ${part3Question!.questionIndex} · ${part3Question!.helper || PART3_HELPER}`,
      };

  return (
    <PageShell
      title={config.title}
      description={isPart2 ? "当前是该 Topic 的 Part 2 卡片练习。" : `当前是该 Topic 的 Part 3 Question ${part3Question!.questionIndex}。`}
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href={`/practice/part23/${topic.topicSlug}`}>
            返回 Topic 详情
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
