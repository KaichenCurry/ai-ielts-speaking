import Link from "next/link";
import { PageShell } from "@/components/page-shell";

const practiceModules = [
  {
    id: "part1",
    number: "01",
    label: "Part 1",
    title: "Topic → Question",
    description: "先按 Topic 进入，再选择具体 question 开始练习。适合热身问答和快速开口。",
    duration: "4–5 分钟",
    tip: "按 topic 选题，更贴近真实题库结构",
  },
  {
    id: "part23",
    number: "02",
    label: "Part 2 & Part 3",
    title: "Topic → Cue Card → Discussion",
    description: "按 Topic 查看 Part 2 卡片、示范答案和对应的 Part 3 延展问题，再进入练习。",
    duration: "7–9 分钟",
    tip: "同一 topic 下连续理解独白与追问逻辑",
  },
];

export default function PracticePage() {
  return (
    <PageShell
      title="选择练习模块"
      description="Part 1 已切换为 Topic → Question 流程；Part 2 和 Part 3 已合并为同一 Topic 模块。"
      actions={
        <Link className="link-button secondary" href="/history">
          查看历史记录
        </Link>
      }
    >
      <div className="part-select-grid">
        {practiceModules.map((module) => (
          <div className="card part-select-card" key={module.id}>
            <p className="part-number">{module.number}</p>
            <div className="part-select-header">
              <span className="eyebrow">{module.label}</span>
              <h2>{module.title}</h2>
            </div>
            <p className="part-select-desc">{module.description}</p>
            <div className="part-meta-row">
              <span className="part-meta-item">⏱ {module.duration}</span>
              <span className="part-meta-item">💡 {module.tip}</span>
            </div>
            <Link className="link-button part-start-btn" href={`/practice/${module.id}`}>
              进入 {module.label}
            </Link>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
