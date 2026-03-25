export type SpeakingPart = "part1" | "part2" | "part3";

export type ScoreBreakdown = {
  total: number;
  fluencyCoherence: number;
  lexicalResource: number;
  grammar: number;
  pronunciation: number;
  completeness: number;
};

export type FeedbackSection = {
  summary: string;
  strengths: string[];
  priorities: string[];
  nextStep: string;
  sampleAnswer?: string;
};

export type AppealStatus = "none" | "submitted" | "reviewed";
export type ReviewStatus = "pending" | "flagged" | "completed";
export type ScoringConfidence = "low" | "medium" | "high";
export type PromptVersionStatus = "current" | "archived";
export type BadCaseStatus = "open" | "resolved";

export type PracticeSession = {
  id: string;
  part: SpeakingPart;
  title: string;
  prompt: string;
  transcript: string;
  createdAt: string;
  score: ScoreBreakdown;
  feedback: FeedbackSection;
  riskFlag: boolean;
  riskReason?: string;
  appealStatus: AppealStatus;
  appealNote?: string;
  appealedAt?: string | null;
  appealUpdatedAt?: string | null;
  reviewStatus: ReviewStatus;
  reviewResult?: string;
  reviewNote?: string;
  reviewedAt?: string | null;
};

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type PromptVersion = {
  id: string;
  name: string;
  description: string;
  status: PromptVersionStatus;
  updatedAt: string;
};

export type PromptVersionRecord = {
  id: string;
  name: string;
  description: string;
  status: PromptVersionStatus;
  created_at: string;
  updated_at: string;
};

export type BadCaseRecord = {
  id: string;
  session_id: string;
  prompt_version_id: string | null;
  reason: string;
  status: BadCaseStatus;
  created_at: string;
};

export type BadCaseItem = {
  id: string;
  sessionId: string;
  promptVersionId?: string | null;
  reason: string;
  status: BadCaseStatus;
  createdAt: string;
};

export type PracticeQuestionConfig = {
  part: SpeakingPart;
  title: string;
  question: string;
  helper: string;
  mockTranscriptHint: string;
  resultSessionId: string;
};

export type MockPracticeResponse = {
  sessionId: string;
  transcript: string;
  processingSummary: string;
};

export type TranscriptionResponse = {
  transcript: string;
  provider: "openai";
};

export type LiveScoringResult = {
  sessionId: string;
  part: SpeakingPart;
  question: string;
  transcript: string;
  durationSeconds: number;
  score: ScoreBreakdown;
  feedback: FeedbackSection;
  riskFlag: boolean;
  riskReason: string;
  confidence: ScoringConfidence;
  provider: "openai";
  model: string;
  scoringMode: "transcript-first";
  createdAt: string;
  processingSummary: string;
};

export type PracticeSessionRecord = {
  id: string;
  part: SpeakingPart;
  title: string;
  question: string;
  transcript: string;
  duration_seconds: number;
  total_score: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammar_score: number;
  pronunciation: number;
  completeness: number;
  summary_feedback: string;
  strengths: string[];
  priorities: string[];
  next_step: string;
  sample_answer: string | null;
  risk_flag: boolean;
  risk_reason: string;
  confidence: ScoringConfidence;
  provider: string;
  model: string;
  scoring_mode: string;
  appeal_status: AppealStatus;
  appeal_note: string;
  appealed_at: string | null;
  appeal_updated_at: string | null;
  review_status: ReviewStatus;
  review_result: string;
  review_note: string;
  reviewed_at: string | null;
  created_at: string;
};

export type GovernanceUpdateInput = {
  sessionId: string;
  riskFlag: boolean;
  riskReason: string;
  appealStatus: AppealStatus;
  appealNote: string;
  reviewStatus: ReviewStatus;
  reviewResult: string;
  reviewNote: string;
};
