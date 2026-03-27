export type SpeakingPart = "part1" | "part2" | "part3";

export type ScoreBreakdown = {
  total: number;
  fluencyCoherence: number;
  lexicalResource: number;
  grammar: number;
  pronunciation: number;
  completeness: number;
};

export type FeedbackDimension = "fluencyCoherence" | "lexicalResource" | "grammar" | "pronunciation" | "completeness";

export type DimensionFeedback = {
  dimension: FeedbackDimension;
  coachNote: string;
  zhNote: string;
};

export type PronunciationItem = {
  text: string;
  ipa: string;
  tip: string;
};

export type FeedbackSection = {
  summary: string;
  strengths: string[];
  priorities: string[];
  nextStep: string;
  sampleAnswer?: string;
  improvedAnswer?: string;
  dimensionFeedback?: DimensionFeedback[];
  pronunciationFocus?: PronunciationItem[];
  sampleAnswerPronunciation?: PronunciationItem[];
  improvedAnswerPronunciation?: PronunciationItem[];
};

export type AppealStatus = "none" | "submitted" | "reviewed";
export type ReviewStatus = "pending" | "flagged" | "completed";
export type ScoringConfidence = "low" | "medium" | "high";
export type PromptVersionStatus = "current" | "archived";
export type BadCaseStatus = "open" | "resolved";

export type QuestionMetadata = {
  topicSlug: string;
  topicTitle: string;
  questionId: string;
  questionText: string;
  questionIndex?: number | null;
  questionLabel: string;
};

export type PracticeSession = QuestionMetadata & {
  id: string;
  part: SpeakingPart;
  transcript: string;
  durationSeconds: number;
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

export type PracticeQuestionConfig = QuestionMetadata & {
  part: SpeakingPart;
  title: string;
  difficulty?: QuestionDifficulty;
  helper: string;
};

export type ScorePracticeRequest = QuestionMetadata & {
  part: SpeakingPart;
  transcript: string;
  durationSeconds?: number;
};

export type TranscriptionResponse = {
  transcript: string;
  provider: "openai";
};

export type LiveScoringResult = QuestionMetadata & {
  sessionId: string;
  part: SpeakingPart;
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
  user_id: string | null;
  part: SpeakingPart;
  topic_slug: string;
  topic_title: string;
  question_id: string;
  question_text: string;
  question_index: number | null;
  question_label: string;
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
  improved_answer: string | null;
  dimension_feedback: DimensionFeedback[] | null;
  pronunciation_focus: PronunciationItem[] | null;
  sample_answer_pronunciation: PronunciationItem[] | null;
  improved_answer_pronunciation: PronunciationItem[] | null;
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

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type Part1Question = {
  id: string;
  part: "part1";
  topicTitle: string;
  topicSlug: string;
  questionIndex: number;
  questionText: string;
  answerText: string;
  helper?: string;
  difficulty?: QuestionDifficulty;
  sourceOrder: number;
};

export type Part1Topic = {
  id: string;
  part: "part1";
  topicTitle: string;
  topicSlug: string;
  sourceOrder: number;
  questions: Part1Question[];
};

export type Part3Question = {
  id: string;
  part: "part3";
  topicId: string;
  topicNumber: number;
  topicTitle: string;
  topicSlug: string;
  questionIndex: number;
  questionText: string;
  answerText: string;
  helper?: string;
  difficulty?: QuestionDifficulty;
  sourceOrder: number;
};

export type Part23Topic = {
  id: string;
  topicId: string;
  topicNumber: number;
  topicTitle: string;
  topicSlug: string;
  part2QuestionId?: string;
  part2Difficulty?: QuestionDifficulty;
  part2Helper?: string;
  part2QuestionCard: string;
  cueCardBullets: string[];
  part2SampleAnswer: string;
  part3Questions: Part3Question[];
  sourceOrder: number;
};

export type Question = {
  id: string;
  part: SpeakingPart;
  topic: string;
  difficulty: QuestionDifficulty;
  question: string;
  helper: string;
  isActive: boolean;
  createdAt: string;
};

export type AdminStudentSummary = {
  userId: string;
  email: string | null;
  sessionCount: number;
  lastActive: string;
  avgScore: number;
  bestScore: number;
  riskCount: number;
  pendingAppeals: number;
};

export type AdminPracticeSession = PracticeSession & {
  userId: string | null;
};

export type QuestionRecord = {
  id: string;
  part: SpeakingPart;
  topic: string;
  difficulty: QuestionDifficulty;
  question: string;
  helper: string;
  is_active: boolean;
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

// ─── Question governance types ──────────────────────────────────

export type QuestionSource = "markdown" | "custom";

export type QuestionWithMeta = Question & {
  source: QuestionSource;
  isEditable: boolean;
  isDeletable: boolean;
};

export type CreateQuestionInput = {
  part: SpeakingPart;
  topic: string;
  difficulty: QuestionDifficulty;
  question: string;
  helper: string;
  isActive: boolean;
};

export type UpdateQuestionInput = CreateQuestionInput & {
  id: string;
};
