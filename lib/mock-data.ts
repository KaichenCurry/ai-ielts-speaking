import type { DashboardMetric, PromptVersion } from "@/lib/types";

export const dashboardMetrics: DashboardMetric[] = [
  { label: "会话总量", value: "128", helper: "最近 7 天学生练习记录" },
  { label: "异常案例", value: "9", helper: "已自动或人工标记为异常" },
  { label: "申诉数量", value: "4", helper: "待处理与已处理申诉总数" },
  { label: "当前规则版本", value: "v0.1", helper: "学生端评分骨架版本" },
];

export const promptVersions: PromptVersion[] = [
  {
    id: "prompt-v0.1",
    name: "v0.1 Skeleton Baseline",
    description: "当前骨架阶段使用的评分结构定义，强调总分、分项分和风险标记字段。",
    status: "current",
    updatedAt: "2026-03-24",
  },
  {
    id: "prompt-v0.0",
    name: "v0.0 Draft Logic",
    description: "最早期文档草案版本，仅用于定义评分字段和反馈模块。",
    status: "archived",
    updatedAt: "2026-03-22",
  },
];
