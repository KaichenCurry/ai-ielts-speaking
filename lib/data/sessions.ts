import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  AdminPracticeSession,
  AdminStudentSummary,
  GovernanceUpdateInput,
  LiveScoringResult,
  PracticeSession,
  PracticeSessionRecord,
} from "@/lib/types";

function mapRecordToSession(record: PracticeSessionRecord): PracticeSession {
  return {
    id: record.id,
    topicSlug: record.topic_slug,
    topicTitle: record.topic_title,
    questionId: record.question_id,
    questionText: record.question_text,
    questionIndex: record.question_index,
    questionLabel: record.question_label,
    part: record.part,
    transcript: record.transcript,
    durationSeconds: record.duration_seconds,
    createdAt: record.created_at,
    score: {
      total: Number(record.total_score),
      fluencyCoherence: Number(record.fluency_coherence),
      lexicalResource: Number(record.lexical_resource),
      grammar: Number(record.grammar_score),
      pronunciation: Number(record.pronunciation),
      completeness: Number(record.completeness),
    },
    feedback: {
      summary: record.summary_feedback,
      strengths: record.strengths,
      priorities: record.priorities,
      nextStep: record.next_step,
      sampleAnswer: record.sample_answer || undefined,
      improvedAnswer: record.improved_answer || undefined,
      dimensionFeedback: record.dimension_feedback || undefined,
      pronunciationFocus: record.pronunciation_focus || undefined,
      sampleAnswerPronunciation: record.sample_answer_pronunciation || undefined,
      improvedAnswerPronunciation: record.improved_answer_pronunciation || undefined,
    },
    riskFlag: record.risk_flag,
    riskReason: record.risk_reason || undefined,
    appealStatus: record.appeal_status,
    appealNote: record.appeal_note || undefined,
    appealedAt: record.appealed_at,
    appealUpdatedAt: record.appeal_updated_at,
    reviewStatus: record.review_status,
    reviewResult: record.review_result || undefined,
    reviewNote: record.review_note || undefined,
    reviewedAt: record.reviewed_at,
  };
}

function mapRecordToAdminSession(record: PracticeSessionRecord): AdminPracticeSession {
  return {
    ...mapRecordToSession(record),
    userId: record.user_id,
  };
}

function mapScoreToRecord(
  result: LiveScoringResult,
  userId: string,
  options: { mockAttemptId?: string | null; sectionIndex?: number | null } = {},
): PracticeSessionRecord {
  return {
    id: result.sessionId,
    user_id: userId,
    part: result.part,
    topic_slug: result.topicSlug,
    topic_title: result.topicTitle,
    question_id: result.questionId,
    question_text: result.questionText,
    question_index: result.questionIndex ?? null,
    question_label: result.questionLabel,
    transcript: result.transcript,
    duration_seconds: result.durationSeconds,
    total_score: result.score.total,
    fluency_coherence: result.score.fluencyCoherence,
    lexical_resource: result.score.lexicalResource,
    grammar_score: result.score.grammar,
    pronunciation: result.score.pronunciation,
    completeness: result.score.completeness,
    summary_feedback: result.feedback.summary,
    strengths: result.feedback.strengths,
    priorities: result.feedback.priorities,
    next_step: result.feedback.nextStep,
    sample_answer: result.feedback.sampleAnswer || null,
    improved_answer: result.feedback.improvedAnswer || null,
    dimension_feedback: result.feedback.dimensionFeedback || null,
    pronunciation_focus: result.feedback.pronunciationFocus || null,
    sample_answer_pronunciation: result.feedback.sampleAnswerPronunciation || null,
    improved_answer_pronunciation: result.feedback.improvedAnswerPronunciation || null,
    risk_flag: result.riskFlag,
    risk_reason: result.riskReason,
    confidence: result.confidence,
    provider: result.provider,
    model: result.model,
    scoring_mode: result.scoringMode,
    appeal_status: "none",
    appeal_note: "",
    appealed_at: null,
    appeal_updated_at: null,
    review_status: result.riskFlag ? "flagged" : "pending",
    review_result: "",
    review_note: "",
    reviewed_at: null,
    created_at: result.createdAt,
    mock_attempt_id: options.mockAttemptId ?? null,
    section_index: options.sectionIndex ?? null,
  };
}

async function getAccessContext() {
  const user = await getServerUser();
  return {
    userId: user?.id ?? null,
    isAdmin: isAdminEmail(user?.email),
  };
}

export function mapLiveResultToPracticeSession(result: LiveScoringResult) {
  return mapRecordToSession(mapScoreToRecord(result, "local-user"));
}

export async function createPracticeSessionFromScore(result: LiveScoringResult, userId: string) {
  if (!isSupabaseConfigured()) {
    return result.sessionId;
  }

  if (!userId) {
    throw new Error("Authentication required before persisting practice sessions.");
  }

  const supabase = createSupabaseServerClient();
  const record = mapScoreToRecord(result, userId);
  const { error } = await supabase.from("practice_sessions").upsert(record);

  if (error) {
    throw new Error(`Failed to persist practice session: ${error.message}`);
  }

  return result.sessionId;
}

/**
 * Persist one question of a mock attempt into practice_sessions, with the
 * mock_attempt_id + section_index columns set so admin tooling can drill
 * down from an attempt to each per-question record.
 */
export async function createMockSegmentSession(
  result: LiveScoringResult,
  userId: string,
  options: { mockAttemptId: string; sectionIndex: number },
) {
  if (!isSupabaseConfigured()) {
    return result.sessionId;
  }
  if (!userId) {
    throw new Error("Authentication required before persisting practice sessions.");
  }

  const supabase = createSupabaseServerClient();
  const record = mapScoreToRecord(result, userId, options);
  const { error } = await supabase.from("practice_sessions").upsert(record);

  if (error) {
    throw new Error(`Failed to persist mock segment session: ${error.message}`);
  }
  return result.sessionId;
}

/**
 * Load every per-question session row that belongs to a given mock attempt,
 * ordered by section_index so the report can render in true exam order.
 */
export async function listSessionsForMockAttempt(
  mockAttemptId: string,
): Promise<PracticeSession[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("mock_attempt_id", mockAttemptId)
    .order("section_index", { ascending: true });

  if (error || !data) return [];
  return (data as PracticeSessionRecord[]).map(mapRecordToSession);
}

export async function submitPracticeSessionAppeal(sessionId: string, appealNote: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Appeal submission requires database connectivity.");
  }

  const { userId, isAdmin } = await getAccessContext();
  if (!userId) {
    throw new Error("Authentication required.");
  }

  const supabase = createSupabaseServerClient();
  let sessionQuery = supabase.from("practice_sessions").select("id, appeal_status").eq("id", sessionId);

  if (!isAdmin) {
    sessionQuery = sessionQuery.eq("user_id", userId);
  }

  const { data: currentSession, error: sessionError } = await sessionQuery.maybeSingle();

  if (sessionError) {
    throw new Error(`Failed to load practice session: ${sessionError.message}`);
  }

  if (!currentSession) {
    throw new Error("Practice session not found.");
  }

  if (currentSession.appeal_status !== "none") {
    throw new Error(
      currentSession.appeal_status === "reviewed"
        ? "This appeal has already been reviewed."
        : "This appeal has already been submitted.",
    );
  }

  const now = new Date().toISOString();
  const payload = {
    appeal_status: "submitted",
    appeal_note: appealNote,
    appealed_at: now,
    appeal_updated_at: now,
  };

  let query = supabase.from("practice_sessions").update(payload).eq("id", sessionId).eq("appeal_status", "none");
  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select("id").maybeSingle();

  if (error) {
    throw new Error(`Failed to submit appeal: ${error.message}`);
  }

  if (!data) {
    throw new Error("Appeal state changed. Please refresh and try again.");
  }
}

export async function updatePracticeSessionGovernance(input: GovernanceUpdateInput) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Governance actions require database connectivity.");
  }

  const { isAdmin } = await getAccessContext();
  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const appealedAt = input.appealStatus === "submitted" ? now : null;
  const payload = {
    risk_flag: input.riskFlag,
    risk_reason: input.riskReason,
    appeal_status: input.appealStatus,
    appeal_note: input.appealNote,
    appealed_at: appealedAt,
    appeal_updated_at: now,
    review_status: input.reviewStatus,
    review_result: input.reviewResult,
    review_note: input.reviewNote,
    reviewed_at: now,
  };

  const { data, error } = await supabase
    .from("practice_sessions")
    .update(payload)
    .eq("id", input.sessionId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update governance state: ${error.message}`);
  }

  if (!data) {
    throw new Error("Practice session not found.");
  }
}

type PracticeSessionTimeRange = "24h" | "7d" | "30d";
type PracticeSessionQueueFilter = "pending";

function resolveCreatedAfter(timeRange: PracticeSessionTimeRange) {
  const now = Date.now();

  switch (timeRange) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return undefined;
  }
}

type ListPracticeSessionsFilters = {
  part?: PracticeSession["part"];
  riskFlag?: boolean;
  appealStatus?: PracticeSession["appealStatus"];
  reviewStatus?: PracticeSession["reviewStatus"];
  timeRange?: PracticeSessionTimeRange;
  queue?: PracticeSessionQueueFilter;
  keyword?: string;
};

export async function listPracticeSessions(filters?: ListPracticeSessionsFilters): Promise<AdminPracticeSession[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { userId, isAdmin } = await getAccessContext();
  if (!userId) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  let query = supabase.from("practice_sessions").select("*");

  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }

  if (filters?.part) {
    query = query.eq("part", filters.part);
  }

  if (typeof filters?.riskFlag === "boolean") {
    query = query.eq("risk_flag", filters.riskFlag);
  }

  if (filters?.appealStatus) {
    query = query.eq("appeal_status", filters.appealStatus);
  }

  if (filters?.reviewStatus) {
    query = query.eq("review_status", filters.reviewStatus);
  }

  if (filters?.timeRange) {
    const createdAfter = resolveCreatedAfter(filters.timeRange);
    if (createdAfter) {
      query = query.gte("created_at", createdAfter);
    }
  }

  if (filters?.queue === "pending") {
    query = query.or("risk_flag.eq.true,appeal_status.eq.submitted,review_status.eq.flagged");
  }

  const keyword = filters?.keyword?.trim();
  if (keyword) {
    const escapedKeyword = keyword.replace(/[%,]/g, " ").trim();
    if (escapedKeyword) {
      query = query.or(
        `topic_title.ilike.%${escapedKeyword}%,question_text.ilike.%${escapedKeyword}%,transcript.ilike.%${escapedKeyword}%,risk_reason.ilike.%${escapedKeyword}%,appeal_note.ilike.%${escapedKeyword}%,review_note.ilike.%${escapedKeyword}%,review_result.ilike.%${escapedKeyword}%`,
      );
    }
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as PracticeSessionRecord[]).map(mapRecordToAdminSession);
}

export async function listStudents(): Promise<AdminStudentSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { isAdmin } = await getAccessContext();
  if (!isAdmin) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("user_id, created_at, total_score, risk_flag, appeal_status")
    .not("user_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const studentMap = new Map<string, Omit<AdminStudentSummary, "email">>();

  for (const record of data) {
    const userId = record.user_id;
    if (!userId) {
      continue;
    }

    const score = Number(record.total_score ?? 0);
    const existing = studentMap.get(userId);

    if (!existing) {
      studentMap.set(userId, {
        userId,
        sessionCount: 1,
        lastActive: record.created_at,
        avgScore: score,
        bestScore: score,
        riskCount: record.risk_flag ? 1 : 0,
        pendingAppeals: record.appeal_status === "submitted" ? 1 : 0,
      });
      continue;
    }

    const nextSessionCount = existing.sessionCount + 1;
    studentMap.set(userId, {
      ...existing,
      sessionCount: nextSessionCount,
      lastActive: existing.lastActive > record.created_at ? existing.lastActive : record.created_at,
      avgScore: (existing.avgScore * existing.sessionCount + score) / nextSessionCount,
      bestScore: Math.max(existing.bestScore, score),
      riskCount: existing.riskCount + (record.risk_flag ? 1 : 0),
      pendingAppeals: existing.pendingAppeals + (record.appeal_status === "submitted" ? 1 : 0),
    });
  }

  const userIds = Array.from(studentMap.keys());
  const { data: users } = await supabase.auth.admin.listUsers();
  const emailMap = new Map<string, string>();

  if (users?.users) {
    for (const user of users.users) {
      if (userIds.includes(user.id)) {
        emailMap.set(user.id, user.email || "");
      }
    }
  }

  return Array.from(studentMap.values())
    .map((student) => ({
      ...student,
      email: emailMap.get(student.userId) || null,
    }))
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive));
}

export async function listPracticeSessionsByUserId(targetUserId: string): Promise<AdminPracticeSession[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { isAdmin } = await getAccessContext();
  if (!isAdmin) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as PracticeSessionRecord[]).map(mapRecordToAdminSession);
}

export async function getPracticeSessionById(sessionId: string): Promise<AdminPracticeSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { userId, isAdmin } = await getAccessContext();
  if (!userId) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  let query = supabase.from("practice_sessions").select("*").eq("id", sessionId);

  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapRecordToAdminSession(data as PracticeSessionRecord);
}
