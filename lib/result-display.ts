import type { PracticeSession, SpeakingPart } from "@/lib/types";

export function scoreClass(score: number): string {
  if (score >= 6.5) return "score-high";
  if (score >= 4.5) return "score-mid";
  return "score-low";
}

export const DIMENSION_LABELS: Record<string, string> = {
  fluencyCoherence: "流利度与连贯性",
  lexicalResource: "词汇资源",
  grammar: "语法范围与准确性",
  pronunciation: "发音",
  completeness: "完整度",
};

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPartLabel(part: SpeakingPart): string {
  switch (part) {
    case "part1":
      return "Part 1";
    case "part2":
      return "Part 2";
    case "part3":
      return "Part 3";
    default:
      return part;
  }
}

export function getStudentAppealStatusLabel(session: Pick<PracticeSession, "appealStatus">): string {
  switch (session.appealStatus) {
    case "submitted":
      return "申诉已提交";
    case "reviewed":
      return "申诉已处理";
    case "none":
    default:
      return "暂无申诉";
  }
}

export function getStudentReviewStatusLabel(
  session: Pick<PracticeSession, "reviewStatus" | "riskFlag">,
): string {
  if (session.reviewStatus === "completed") {
    return "人工查看完成";
  }

  if (session.reviewStatus === "flagged" || session.riskFlag) {
    return "需要人工关注";
  }

  return "当前正常";
}

export function getStudentRiskStatusLabel(session: Pick<PracticeSession, "riskFlag">): string {
  return session.riskFlag ? "需要人工关注" : "结果正常";
}

export function canStudentSubmitAppeal(session: Pick<PracticeSession, "appealStatus">): boolean {
  return session.appealStatus === "none";
}
