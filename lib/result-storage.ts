const RESULT_STORAGE_PREFIX = "ai-ielts-result:";

export function buildResultStorageKey(sessionId: string) {
  return `${RESULT_STORAGE_PREFIX}${sessionId}`;
}
