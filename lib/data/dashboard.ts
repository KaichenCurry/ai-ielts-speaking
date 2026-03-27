import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type DashboardMetricItem = {
  label: string;
  value: string;
  helper: string;
};

export async function getDashboardMetrics(): Promise<DashboardMetricItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const [sessions, risks, appeals, currentVersion, badCases, activeStudents] = await Promise.all([
    supabase.from("practice_sessions").select("id", { count: "exact", head: true }),
    supabase.from("practice_sessions").select("id", { count: "exact", head: true }).eq("risk_flag", true),
    supabase.from("practice_sessions").select("id", { count: "exact", head: true }).in("appeal_status", ["submitted", "reviewed"]),
    supabase.from("prompt_versions").select("name").eq("status", "current").limit(1).maybeSingle(),
    supabase.from("bad_cases").select("id", { count: "exact", head: true }),
    supabase.from("practice_sessions").select("user_id").not("user_id", "is", null),
  ]);

  const activeStudentCount = new Set((activeStudents.data ?? []).map((record) => record.user_id).filter(Boolean)).size;

  return [
    { label: "会话总量", value: String(sessions.count ?? 0), helper: "practice_sessions 总记录数" },
    { label: "风险会话", value: String(risks.count ?? 0), helper: "risk_flag = true" },
    { label: "申诉数量", value: String(appeals.count ?? 0), helper: "submitted / reviewed 申诉总数" },
    { label: "活跃学生数", value: String(activeStudentCount), helper: "有练习记录的学生总数" },
    { label: "当前规则版本", value: currentVersion.data?.name ?? "未设置", helper: "status = current" },
    { label: "bad case", value: String(badCases.count ?? 0), helper: "已沉淀的问题样本数量" },
  ];
}
