import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { getPart23TopicBySlugWithProgress } from "@/lib/data/questions";

type Part23TopicDetailSearchParams = {
  completion?: string;
};

type PracticeItem = {
  id: string;
  label: string;
  title: string;
  href: string;
  isCompleted: boolean;
};

function parseCompletionFilter(value: string | undefined): "completed" | "pending" | undefined {
  return value === "completed" || value === "pending" ? value : undefined;
}

export default async function Part23TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicSlug: string }>;
  searchParams?: Promise<Part23TopicDetailSearchParams>;
}) {
  const [{ topicSlug }, resolved] = await Promise.all([params, searchParams]);
  const completionFilter = parseCompletionFilter(resolved?.completion);
  const topic = await getPart23TopicBySlugWithProgress(topicSlug);

  if (!topic) {
    notFound();
  }

  const practiceItems: PracticeItem[] = [
    {
      id: topic.part2QuestionId,
      label: "Part 2",
      title: topic.part2QuestionCard,
      href: `/practice/part23/${topic.topicSlug}/${topic.part2QuestionId}`,
      isCompleted: topic.part2IsCompleted,
    },
    ...topic.part3Questions.map((question) => ({
      id: question.id,
      label: `Part 3 · Question ${question.questionIndex}`,
      title: question.questionText,
      href: `/practice/part23/${topic.topicSlug}/${question.id}`,
      isCompleted: question.isCompleted,
    })),
  ];

  const filteredItems = practiceItems.filter((item) => {
    if (completionFilter === "completed") {
      return item.isCompleted;
    }
    if (completionFilter === "pending") {
      return !item.isCompleted;
    }
    return true;
  });

  return (
    <PageShell
      title={`Part 2 & Part 3 · ${topic.topicTitle}`}
      description="先查看 Part 2 Question Card，再选择 Part 2 或 Part 3 对应题目进入练习。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/practice/part23">
            返回 Topic 列表
          </Link>
          <Link className="link-button secondary" href="/history">
            查看历史记录
          </Link>
        </div>
      }
    >
      <SectionCard title="当前 Topic 进度">
        <div className="meta-row">
          <Badge tone={topic.isTopicCompleted ? "ok" : "warn"}>
            {topic.isTopicCompleted ? "已完成" : "未完成"}
          </Badge>
          <Badge>{`进度 ${topic.completedCount}/${topic.totalCount}`}</Badge>
        </div>
        <p className="inline-note">本 Topic 包含 1 个 Part 2 练习项，以及 {topic.part3Questions.length} 个 Part 3 问题。</p>
      </SectionCard>

      <SectionCard title="Part 2 Question Card">
        <p>{topic.part2QuestionCard}</p>
        {topic.cueCardBullets.length > 0 ? (
          <ul className="muted-list">
            {topic.cueCardBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        <div className="meta-row" style={{ marginTop: 12 }}>
          <Badge tone={topic.part2IsCompleted ? "ok" : "warn"}>
            {topic.part2IsCompleted ? "已完成" : "未完成"}
          </Badge>
        </div>
        <div className="action-row">
          <Link className="link-button" href={`/practice/part23/${topic.topicSlug}/${topic.part2QuestionId}`}>
            开始 Part 2 练习
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Part 2 Sample Answer">
        <p>{topic.part2SampleAnswer || "当前题库没有提供示范答案。"}</p>
      </SectionCard>

      <SectionCard title="筛选练习项">
        <form className="form-grid" method="get">
          <label className="form-field">
            <span>完成状态</span>
            <select name="completion" defaultValue={resolved?.completion ?? ""}>
              <option value="">全部</option>
              <option value="completed">已完成</option>
              <option value="pending">未完成</option>
            </select>
          </label>

          <div className="form-field">
            <span>操作</span>
            <div className="action-row">
              <button className="action-button primary" type="submit">
                应用筛选
              </button>
              <Link className="link-button secondary" href={`/practice/part23/${topic.topicSlug}`}>
                重置
              </Link>
            </div>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="练习项列表">
        {filteredItems.length === 0 ? (
          <p>当前筛选条件下没有匹配的练习项。</p>
        ) : (
          <div className="list-grid">
            {filteredItems.map((item) => (
              <Link className="list-item" href={item.href} key={item.id}>
                <div>
                  <p className="eyebrow">{item.label}</p>
                  <h2>{item.title}</h2>
                  <div className="meta-row" style={{ marginTop: 8 }}>
                    <Badge tone={item.isCompleted ? "ok" : "warn"}>
                      {item.isCompleted ? "已完成" : "未完成"}
                    </Badge>
                  </div>
                </div>
                <span className="link-button secondary">开始练习</span>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}
