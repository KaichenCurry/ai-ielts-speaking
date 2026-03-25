import { getQuestionConfig, getSessionById, practiceSessions } from "@/lib/mock-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  GovernanceUpdateInput,
  LiveScoringResult,
  PracticeSession,
  PracticeSessionRecord,
} from "@/lib/types";

function mapRecordToSession(record: PracticeSessionRecord): PracticeSession {
  return {
    id: record.id,
    part: record.part,
    title: record.title,
    prompt: record.question,
    transcript: record.transcript,
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

function mapScoreToRecord(result: LiveScoringResult): PracticeSessionRecord {
  const config = getQuestionConfig(result.part);

  return {
    id: result.sessionId,
    part: result.part,
    title: config?.title || `${result.part.toUpperCase()} Practice`,
    question: result.question,
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
  };
}

export function mapLiveResultToPracticeSession(result: LiveScoringResult): PracticeSession {
  return mapRecordToSession(mapScoreToRecord(result));
}

export async function createPracticeSessionFromScore(result: LiveScoringResult) {
  if (!isSupabaseConfigured()) {
    return result.sessionId;
  }

  const supabase = createSupabaseServerClient();
  const record = mapScoreToRecord(result);
  const { error } = await supabase.from("practice_sessions").upsert(record);

  if (error) {
    throw new Error(`Failed to persist practice session: ${error.message}`);
  }

  return result.sessionId;
}

export async function submitPracticeSessionAppeal(sessionId: string, appealNote: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Appeal submission requires database connectivity.");
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const payload = {
    appeal_status: "submitted",
    appeal_note: appealNote,
    appealed_at: now,
    appeal_updated_at: now,
  };

  const { error } = await supabase.from("practice_sessions").update(payload).eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to submit appeal: ${error.message}`);
  }
}

export async function updatePracticeSessionGovernance(input: GovernanceUpdateInput) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Governance actions require database connectivity.");
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

  const { error } = await supabase.from("practice_sessions").update(payload).eq("id", input.sessionId);

  if (error) {
    throw new Error(`Failed to update governance state: ${error.message}`);
  }
}

export async function listPracticeSessions(): Promise<PracticeSession[]> {
  if (!isSupabaseConfigured()) {
    return practiceSessions;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return practiceSessions;
  }

  if (!data || data.length === 0) {
    return practiceSessions;
  }

  return (data as PracticeSessionRecord[]).map(mapRecordToSession);
}

export async function getPracticeSessionById(sessionId: string): Promise<PracticeSession | null> {
  if (!isSupabaseConfigured()) {
    return getSessionById(sessionId) ?? null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return getSessionById(sessionId) ?? null;
  }

  if (!data) {
    return getSessionById(sessionId) ?? null;
  }

  return mapRecordToSession(data as PracticeSessionRecord);
}
