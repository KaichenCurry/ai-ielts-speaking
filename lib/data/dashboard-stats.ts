import { getServerUser } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { SpeakingPart } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────

export type ScoreTrendPoint = {
  date: string;
  total: number;
  fluencyCoherence: number;
  lexicalResource: number;
  grammar: number;
  pronunciation: number;
  completeness: number;
  part: SpeakingPart;
};

export type DimensionAverage = {
  dimension: string;
  label: string;
  average: number;
};

export type WeeklyFrequency = {
  weekLabel: string;
  weekStart: string;
  count: number;
  totalMinutes: number;
};

export type DashboardStats = {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  bestScore: number;
  averageScore: number;
  recentImprovement: number;
  scoreTrend: ScoreTrendPoint[];
  dimensionAverages: DimensionAverage[];
  weeklyFrequency: WeeklyFrequency[];
};

// ─── Helpers ────────────────────────────────────────────────────

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = [...new Set(dates.map((d) => d.slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ─── Main Query ─────────────────────────────────────────────────

type SessionRow = {
  total_score: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammar_score: number;
  pronunciation: number;
  completeness: number;
  duration_seconds: number;
  part: SpeakingPart;
  created_at: string;
};

export async function getUserDashboardStats(): Promise<DashboardStats> {
  const empty: DashboardStats = {
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    bestScore: 0,
    averageScore: 0,
    recentImprovement: 0,
    scoreTrend: [],
    dimensionAverages: [],
    weeklyFrequency: [],
  };

  if (!isSupabaseConfigured()) {
    return empty;
  }

  const user = await getServerUser();
  if (!user) {
    return empty;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select(
      "total_score, fluency_coherence, lexical_resource, grammar_score, pronunciation, completeness, duration_seconds, part, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return empty;
  }

  const rows = data as SessionRow[];

  // ── KPI metrics ──
  const totalSessions = rows.length;
  const totalMinutes = Math.round(rows.reduce((sum, r) => sum + r.duration_seconds, 0) / 60);
  const scores = rows.map((r) => Number(r.total_score));
  const bestScore = Math.max(...scores);
  const averageScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  const currentStreak = calculateStreak(rows.map((r) => r.created_at));

  // ── Recent improvement: compare last 5 vs previous 5 ──
  let recentImprovement = 0;
  if (scores.length >= 4) {
    const half = Math.floor(scores.length / 2);
    const olderAvg = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const newerAvg = scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half);
    recentImprovement = Math.round((newerAvg - olderAvg) * 10) / 10;
  }

  // ── Score trend (per session) ──
  const scoreTrend: ScoreTrendPoint[] = rows.map((r) => ({
    date: r.created_at.slice(0, 10),
    total: Number(r.total_score),
    fluencyCoherence: Number(r.fluency_coherence),
    lexicalResource: Number(r.lexical_resource),
    grammar: Number(r.grammar_score),
    pronunciation: Number(r.pronunciation),
    completeness: Number(r.completeness),
    part: r.part,
  }));

  // ── Dimension averages (radar chart) ──
  const dims = [
    { key: "fluency_coherence", dimension: "fluencyCoherence", label: "流利度" },
    { key: "lexical_resource", dimension: "lexicalResource", label: "词汇" },
    { key: "grammar_score", dimension: "grammar", label: "语法" },
    { key: "pronunciation", dimension: "pronunciation", label: "发音" },
    { key: "completeness", dimension: "completeness", label: "完整性" },
  ] as const;

  const dimensionAverages: DimensionAverage[] = dims.map((dim) => {
    const values = rows.map((r) => Number(r[dim.key]));
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    return { dimension: dim.dimension, label: dim.label, average: avg };
  });

  // ── Weekly frequency (last 8 weeks) ──
  const weekMap = new Map<string, { count: number; totalMinutes: number }>();
  for (const r of rows) {
    const ws = getWeekStart(r.created_at);
    const existing = weekMap.get(ws) || { count: 0, totalMinutes: 0 };
    existing.count++;
    existing.totalMinutes += Math.round(r.duration_seconds / 60);
    weekMap.set(ws, existing);
  }

  const allWeeks = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8);

  const weeklyFrequency: WeeklyFrequency[] = allWeeks.map(([ws, data]) => ({
    weekLabel: formatWeekLabel(ws),
    weekStart: ws,
    count: data.count,
    totalMinutes: data.totalMinutes,
  }));

  return {
    totalSessions,
    totalMinutes,
    currentStreak,
    bestScore,
    averageScore,
    recentImprovement,
    scoreTrend,
    dimensionAverages,
    weeklyFrequency,
  };
}
