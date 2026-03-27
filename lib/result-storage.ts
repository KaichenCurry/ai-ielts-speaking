import type {
  DimensionFeedback,
  FeedbackSection,
  LiveScoringResult,
  PracticeSession,
  PronunciationItem,
  ScoreBreakdown,
} from "@/lib/types";

const RESULT_STORAGE_PREFIX = "ai-ielts-result:";
const RESULT_INDEX_STORAGE_PREFIX = "ai-ielts-result-index:";
const ANONYMOUS_STORAGE_SCOPE = "anonymous";

let browserStorageScopePromise: Promise<string> | null = null;

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function parseStoredJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isScoreBreakdown(value: unknown): value is ScoreBreakdown {
  return (
    isRecord(value) &&
    typeof value.total === "number" &&
    typeof value.fluencyCoherence === "number" &&
    typeof value.lexicalResource === "number" &&
    typeof value.grammar === "number" &&
    typeof value.pronunciation === "number" &&
    typeof value.completeness === "number"
  );
}

function isFeedbackDimension(value: unknown): value is DimensionFeedback {
  return (
    isRecord(value) &&
    (value.dimension === "fluencyCoherence" ||
      value.dimension === "lexicalResource" ||
      value.dimension === "grammar" ||
      value.dimension === "pronunciation" ||
      value.dimension === "completeness") &&
    typeof value.coachNote === "string" &&
    typeof value.zhNote === "string"
  );
}

function isPronunciationItem(value: unknown): value is PronunciationItem {
  return isRecord(value) && typeof value.text === "string" && typeof value.ipa === "string" && typeof value.tip === "string";
}

function isOptionalArray<T>(value: unknown, itemGuard: (item: unknown) => item is T) {
  return value === undefined || (Array.isArray(value) && value.every((item) => itemGuard(item)));
}

function isFeedbackSection(value: unknown): value is FeedbackSection {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.summary !== "string" ||
    !isStringArray(value.strengths) ||
    !isStringArray(value.priorities) ||
    typeof value.nextStep !== "string"
  ) {
    return false;
  }

  const optionalStringFields = [value.sampleAnswer, value.improvedAnswer];
  if (optionalStringFields.some((field) => field !== undefined && typeof field !== "string")) {
    return false;
  }

  return (
    isOptionalArray(value.dimensionFeedback, isFeedbackDimension) &&
    isOptionalArray(value.pronunciationFocus, isPronunciationItem) &&
    isOptionalArray(value.sampleAnswerPronunciation, isPronunciationItem) &&
    isOptionalArray(value.improvedAnswerPronunciation, isPronunciationItem)
  );
}

function isLiveScoringResult(value: unknown): value is LiveScoringResult {
  return (
    isRecord(value) &&
    typeof value.sessionId === "string" &&
    typeof value.topicSlug === "string" &&
    typeof value.topicTitle === "string" &&
    typeof value.questionId === "string" &&
    typeof value.questionText === "string" &&
    (value.questionIndex === null || value.questionIndex === undefined || typeof value.questionIndex === "number") &&
    typeof value.questionLabel === "string" &&
    (value.part === "part1" || value.part === "part2" || value.part === "part3") &&
    typeof value.transcript === "string" &&
    typeof value.durationSeconds === "number" &&
    isScoreBreakdown(value.score) &&
    isFeedbackSection(value.feedback) &&
    typeof value.riskFlag === "boolean" &&
    typeof value.riskReason === "string" &&
    (value.confidence === "low" || value.confidence === "medium" || value.confidence === "high") &&
    value.provider === "openai" &&
    typeof value.model === "string" &&
    value.scoringMode === "transcript-first" &&
    typeof value.createdAt === "string" &&
    typeof value.processingSummary === "string"
  );
}

function getResultIndexStorageKey(scope: string) {
  return `${RESULT_INDEX_STORAGE_PREFIX}${scope}`;
}

function readStoredIndex(scope: string) {
  if (!canUseBrowserStorage()) {
    return [] as string[];
  }

  const parsed = parseStoredJson<unknown>(window.localStorage.getItem(getResultIndexStorageKey(scope)));
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function writeStoredIndex(scope: string, sessionIds: string[]) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(getResultIndexStorageKey(scope), JSON.stringify(sessionIds));
}

function readValidatedStoredResult(storage: Storage, storageKey: string) {
  const parsed = parseStoredJson<unknown>(storage.getItem(storageKey));
  return isLiveScoringResult(parsed) ? parsed : null;
}

function getStoredResultForScope(sessionId: string, scope: string): LiveScoringResult | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const storageKey = buildResultStorageKey(sessionId, scope);
  return readValidatedStoredResult(window.sessionStorage, storageKey) || readValidatedStoredResult(window.localStorage, storageKey);
}

async function resolveBrowserStorageScope() {
  if (!canUseBrowserStorage()) {
    return ANONYMOUS_STORAGE_SCOPE;
  }

  if (!browserStorageScopePromise) {
    browserStorageScopePromise = (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return ANONYMOUS_STORAGE_SCOPE;
      }

      try {
        const { createSupabaseAuthBrowserClient } = await import("@/lib/supabase/auth-client");
        const supabase = createSupabaseAuthBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        return user ? `user:${user.id}` : ANONYMOUS_STORAGE_SCOPE;
      } catch (error) {
        console.error(error);
        return ANONYMOUS_STORAGE_SCOPE;
      }
    })();
  }

  return browserStorageScopePromise;
}

function removeStorageKeysWithPrefix(storage: Storage, prefix: string) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    storage.removeItem(key);
  });
}

export function resetBrowserStorageScopeCache() {
  browserStorageScopePromise = null;
}

export function clearStoredResultsFromBrowser() {
  if (!canUseBrowserStorage()) {
    return;
  }

  removeStorageKeysWithPrefix(window.sessionStorage, RESULT_STORAGE_PREFIX);
  removeStorageKeysWithPrefix(window.localStorage, RESULT_STORAGE_PREFIX);
  removeStorageKeysWithPrefix(window.localStorage, RESULT_INDEX_STORAGE_PREFIX);
  resetBrowserStorageScopeCache();
}

export function buildResultStorageKey(sessionId: string, scope = ANONYMOUS_STORAGE_SCOPE) {
  return `${RESULT_STORAGE_PREFIX}${scope}:${sessionId}`;
}

export async function saveResultToBrowser(result: LiveScoringResult) {
  if (!canUseBrowserStorage()) {
    return false;
  }

  try {
    const scope = await resolveBrowserStorageScope();
    const storageKey = buildResultStorageKey(result.sessionId, scope);
    const serialized = JSON.stringify(result);

    window.sessionStorage.setItem(storageKey, serialized);
    window.localStorage.setItem(storageKey, serialized);

    const nextIndex = [result.sessionId, ...readStoredIndex(scope).filter((sessionId) => sessionId !== result.sessionId)];
    writeStoredIndex(scope, nextIndex);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getStoredResult(sessionId: string): Promise<LiveScoringResult | null> {
  const scope = await resolveBrowserStorageScope();
  return getStoredResultForScope(sessionId, scope);
}

export function buildPracticeSessionFromResult(result: LiveScoringResult): PracticeSession {
  return {
    id: result.sessionId,
    topicSlug: result.topicSlug,
    topicTitle: result.topicTitle,
    questionId: result.questionId,
    questionText: result.questionText,
    questionIndex: result.questionIndex ?? null,
    questionLabel: result.questionLabel,
    part: result.part,
    transcript: result.transcript,
    durationSeconds: result.durationSeconds,
    createdAt: result.createdAt,
    score: result.score,
    feedback: result.feedback,
    riskFlag: result.riskFlag,
    riskReason: result.riskReason,
    appealStatus: "none",
    appealNote: "",
    appealedAt: null,
    appealUpdatedAt: null,
    reviewStatus: result.riskFlag ? "flagged" : "pending",
    reviewResult: "",
    reviewNote: "",
    reviewedAt: null,
  };
}

export async function getStoredPracticeSession(sessionId: string): Promise<PracticeSession | null> {
  const result = await getStoredResult(sessionId);
  return result ? buildPracticeSessionFromResult(result) : null;
}

export async function listStoredPracticeSessions(): Promise<PracticeSession[]> {
  if (!canUseBrowserStorage()) {
    return [];
  }

  const scope = await resolveBrowserStorageScope();
  const sessions = await Promise.all(readStoredIndex(scope).map((sessionId) => getStoredPracticeSession(sessionId)));

  return sessions
    .filter((session): session is PracticeSession => Boolean(session))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
