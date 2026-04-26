import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  MockAttempt,
  MockAttemptRecord,
  MockAttemptResumeState,
  MockAttemptStatus,
  ScoreBreakdown,
} from "@/lib/types";

function mapAttemptRecord(record: MockAttemptRecord): MockAttempt {
  return {
    id: record.id,
    userId: record.user_id,
    paperId: record.paper_id,
    season: record.season,
    status: record.status,
    startedAt: record.started_at,
    submittedAt: record.submitted_at,
    scoredAt: record.scored_at,
    totalScore: record.total_score,
    bandScores: record.band_scores,
    summary: record.summary,
    resumeState: record.resume_state,
    createdAt: record.created_at,
  };
}

function buildAttemptId(): string {
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Mock attempts require a Supabase connection.");
  }
  return createSupabaseServerClient();
}

export async function createMockAttempt(input: {
  userId: string;
  paperId: string;
  season: string;
}): Promise<MockAttempt> {
  const supabase = ensureSupabase();
  const id = buildAttemptId();
  const now = new Date().toISOString();
  const initialResume: MockAttemptResumeState = {
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    completedQuestionIds: [],
  };

  const { data, error } = await supabase
    .from("mock_attempts")
    .insert({
      id,
      user_id: input.userId,
      paper_id: input.paperId,
      season: input.season,
      status: "in_progress" satisfies MockAttemptStatus,
      started_at: now,
      resume_state: initialResume,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create mock attempt: ${error?.message ?? "unknown error"}`);
  }

  return mapAttemptRecord(data as MockAttemptRecord);
}

export async function getMockAttempt(id: string): Promise<MockAttempt | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mock_attempts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapAttemptRecord(data as MockAttemptRecord);
}

export async function getMockAttemptForUser(id: string, userId: string): Promise<MockAttempt | null> {
  const attempt = await getMockAttempt(id);
  if (!attempt || attempt.userId !== userId) return null;
  return attempt;
}

export async function listMockAttemptsForUser(userId: string, limit = 50): Promise<MockAttempt[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mock_attempts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as MockAttemptRecord[]).map(mapAttemptRecord);
}

export async function findInProgressAttempt(userId: string, paperId: string): Promise<MockAttempt | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mock_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("paper_id", paperId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapAttemptRecord(data as MockAttemptRecord);
}

export async function updateAttemptResumeState(
  id: string,
  userId: string,
  state: MockAttemptResumeState,
): Promise<void> {
  const supabase = ensureSupabase();
  const { error } = await supabase
    .from("mock_attempts")
    .update({ resume_state: state })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update attempt resume state: ${error.message}`);
  }
}

export async function markAttemptSubmitted(id: string, userId: string): Promise<void> {
  const supabase = ensureSupabase();
  const { error } = await supabase
    .from("mock_attempts")
    .update({
      status: "submitted" satisfies MockAttemptStatus,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to mark attempt submitted: ${error.message}`);
  }
}

export async function markAttemptScored(input: {
  id: string;
  userId: string;
  totalScore: number;
  bandScores: ScoreBreakdown;
  summary: string;
}): Promise<void> {
  const supabase = ensureSupabase();
  const { error } = await supabase
    .from("mock_attempts")
    .update({
      status: "scored" satisfies MockAttemptStatus,
      scored_at: new Date().toISOString(),
      total_score: input.totalScore,
      band_scores: input.bandScores,
      summary: input.summary,
    })
    .eq("id", input.id)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to mark attempt scored: ${error.message}`);
  }
}

export async function markAttemptFailed(id: string, userId: string, reason: string): Promise<void> {
  const supabase = ensureSupabase();
  const { error } = await supabase
    .from("mock_attempts")
    .update({
      status: "failed" satisfies MockAttemptStatus,
      summary: reason,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to mark attempt failed: ${error.message}`);
  }
}
