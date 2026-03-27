import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { getPart1TopicBySlugWithProgress } from "@/lib/data/questions";

type Part1TopicDetailSearchParams = {
  completion?: string;
};

function parseCompletionFilter(value: string | undefined): "completed" | "pending" | undefined {
  return value === "completed" || value === "pending" ? value : undefined;
}

export default async function Part1TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicSlug: string }>;
  searchParams?: Promise<Part1TopicDetailSearchParams>;
}) {
  const [{ topicSlug }, resolved] = await Promise.all([params, searchParams]);
  const completionFilter = parseCompletionFilter(resolved?.completion);
  const topic = await getPart1TopicBySlugWithProgress(topicSlug);

  if (!topic) {
    notFound();
  }

  const filteredQuestions = topic.questions.filter((question) => {
    if (completionFilter === "completed") {
      return question.isCompleted;
    }
    if (completionFilter === "pending") {
      return !question.isCompleted;
    }
    return true;
  });

  return (
    <PageShell
      title={`Part 1 · ${topic.topicTitle}`}
      description="选择该 Topic 下的具体 question 进入练习页。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/practice/part1">
            返回 Topic 列表
          </Link>
          <Link className="link-button secondary" href="/history">
            查看历史记录
          </Link>
        </div>
      }
    >
      <SectionCard title="当前 Topic">
        <div className="meta-row">
          <Badge tone={topic.isTopicCompleted ? "ok" : "warn"}>
            {topic.isTopicCompleted ? "已完成" : "未完成"}
          </Badge>
          <Badge>{`进度 ${topic.completedCount}/${topic.totalCount}`}</Badge>
        </div>
        <p>{topic.topicTitle}</p>
        <p className="inline-note">共 {topic.totalCount} 道 question，按题库原始顺序展示。</p>
      </SectionCard>

      <SectionCard title="筛选 question">
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
              <Link className="link-button secondary" href={`/practice/part1/${topic.topicSlug}`}>
                重置
              </Link>
            </div>
          </div>
        </form>
      </SectionCard>

      {filteredQuestions.length === 0 ? (
        <section className="placeholder-box compact">当前筛选条件下没有匹配的 question。</section>
      ) : (
        <div className="list-grid">
          {filteredQuestions.map((question) => (
            <Link className="list-item" href={`/practice/part1/${topic.topicSlug}/${question.id}`} key={question.id}>
              <div>
                <p className="eyebrow">Question {question.questionIndex}</p>
                <h2>{question.questionText}</h2>
                <div className="meta-row" style={{ marginTop: 8 }}>
                  <Badge tone={question.isCompleted ? "ok" : "warn"}>
                    {question.isCompleted ? "已完成" : "未完成"}
                  </Badge>
                </div>
                <p className="inline-note">点击后进入录音练习页</p>
              </div>
              <span className="link-button secondary">开始练习</span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
