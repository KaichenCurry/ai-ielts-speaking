import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { listPart23TopicsWithProgress } from "@/lib/data/questions";

type Part23TopicsSearchParams = {
  completion?: string;
};

function parseCompletionFilter(value: string | undefined): "completed" | "pending" | undefined {
  return value === "completed" || value === "pending" ? value : undefined;
}

export default async function Part23TopicsPage({
  searchParams,
}: {
  searchParams?: Promise<Part23TopicsSearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const completionFilter = parseCompletionFilter(resolved?.completion);
  const topics = await listPart23TopicsWithProgress();
  const filteredTopics = topics.filter((topic) => {
    if (completionFilter === "completed") {
      return topic.isTopicCompleted;
    }
    if (completionFilter === "pending") {
      return !topic.isTopicCompleted;
    }
    return true;
  });
  const totalPracticeItems = topics.reduce((sum, topic) => sum + topic.totalCount, 0);
  const completedPracticeItems = topics.reduce((sum, topic) => sum + topic.completedCount, 0);
  const completedTopics = topics.filter((topic) => topic.isTopicCompleted).length;

  return (
    <PageShell
      title="Part 2 & Part 3 · Topic 列表"
      description="每个 Topic 同时展示 Part 2 卡片与对应的 Part 3 延展问题。"
      actions={
        <div className="action-row">
          <Link className="link-button secondary" href="/practice">
            返回模块选择
          </Link>
          <Link className="link-button secondary" href="/history">
            查看历史记录
          </Link>
        </div>
      }
    >
      <SectionCard title="做题进度总览">
        <div className="meta-row">
          <Badge>{`共 ${topics.length} 个 Topic`}</Badge>
          <Badge tone="ok">{`已完成 ${completedTopics} 个 Topic`}</Badge>
          <Badge>{`已完成 ${completedPracticeItems}/${totalPracticeItems} 个练习项`}</Badge>
        </div>
        <p className="inline-note">这里把每个 Topic 的 Part 2 记作 1 个练习项，再加上对应的 Part 3 问题数量。</p>
      </SectionCard>

      <SectionCard title="筛选 Topic">
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
              <Link className="link-button secondary" href="/practice/part23">
                重置
              </Link>
            </div>
          </div>
        </form>
      </SectionCard>

      {topics.length === 0 ? (
        <SectionCard title="暂无可练习题目">
          <p>当前没有启用中的 Part 2 / Part 3 题目。请先到后台题库管理页确认启用状态。</p>
        </SectionCard>
      ) : filteredTopics.length === 0 ? (
        <section className="placeholder-box compact">当前筛选条件下没有匹配的 Topic。</section>
      ) : (
        <div className="list-grid">
          {filteredTopics.map((topic) => (
            <Link className="list-item" href={`/practice/part23/${topic.topicSlug}`} key={topic.id}>
              <div>
                <p className="eyebrow">Topic {topic.topicNumber}</p>
                <h2>{topic.topicTitle}</h2>
                <div className="meta-row" style={{ marginTop: 8 }}>
                  <Badge tone={topic.isTopicCompleted ? "ok" : "warn"}>
                    {topic.isTopicCompleted ? "已完成" : "未完成"}
                  </Badge>
                  <Badge>{`进度 ${topic.completedCount}/${topic.totalCount}`}</Badge>
                </div>
                <p className="inline-note">Part 3 可练习问题 {topic.part3Questions.length} 道</p>
              </div>
              <span className="link-button secondary">查看 Topic</span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
