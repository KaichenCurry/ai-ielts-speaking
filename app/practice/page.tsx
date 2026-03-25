import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";

const partOptions = [
  { id: "part1", label: "Part 1", description: "热身式短问答，先快速开口。" },
  { id: "part2", label: "Part 2", description: "围绕卡片题进行较完整表达。" },
  { id: "part3", label: "Part 3", description: "延展性讨论，更看逻辑和观点。" },
];

export default function PracticePage() {
  return (
    <PageShell
      title="学生端练习入口"
      description="第一版先帮助学生快速开始一次练习。当前使用骨架数据，重点验证页面结构和主流程。"
      actions={
        <Link className="link-button secondary" href="/history">
          查看历史记录
        </Link>
      }
    >
      <div className="card-grid">
        {partOptions.map((part) => (
          <SectionCard key={part.id} title={part.label}>
            <p>{part.description}</p>
            <Link className="link-button" href={`/practice/${part.id}`}>
              开始 {part.label}
            </Link>
          </SectionCard>
        ))}
      </div>
    </PageShell>
  );
}
