"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecorder } from "@/components/mock/use-recorder";
import type {
  MockPaperPlan,
  MockPaperQuestion,
  TranscriptionResponse,
} from "@/lib/types";

type Step =
  | { kind: "part1"; qIdx: number }
  | { kind: "transition-12" }
  | { kind: "part2-prep" }
  | { kind: "part2-talk" }
  | { kind: "transition-23" }
  | { kind: "part3"; qIdx: number }
  | { kind: "submit" };

type AnswerStatus = "pending" | "transcribing" | "ready" | "failed";

type Answer = {
  sectionIndex: number;
  questionId: string;
  transcript: string;
  durationSeconds: number;
  status: AnswerStatus;
  errorMessage?: string;
};

type RunnerState = {
  stepIndex: number;
  notes: string;
  answers: Record<number, Answer>;
};

type StorageState = RunnerState & { version: 1 };

const STORAGE_PREFIX = "mock-runner:";
const TRANSITION_SECONDS = 10;
const PART1_PART3_MAX_SECONDS = 90;

function buildSteps(plan: MockPaperPlan): Step[] {
  return [
    ...plan.part1Questions.map((_, i) => ({ kind: "part1" as const, qIdx: i })),
    { kind: "transition-12" as const },
    { kind: "part2-prep" as const },
    { kind: "part2-talk" as const },
    { kind: "transition-23" as const },
    ...plan.part3Questions.map((_, i) => ({ kind: "part3" as const, qIdx: i })),
    { kind: "submit" as const },
  ];
}

function getQuestionForStep(plan: MockPaperPlan, step: Step): MockPaperQuestion | null {
  if (step.kind === "part1") return plan.part1Questions[step.qIdx] ?? null;
  if (step.kind === "part2-prep" || step.kind === "part2-talk") return plan.part2Question;
  if (step.kind === "part3") return plan.part3Questions[step.qIdx] ?? null;
  return null;
}

function getActivePart(step: Step): "part1" | "part2" | "part3" | null {
  if (step.kind === "part1") return "part1";
  if (step.kind === "transition-12" || step.kind === "part2-prep" || step.kind === "part2-talk") return "part2";
  if (step.kind === "transition-23" || step.kind === "part3") return "part3";
  return null;
}

function formatClock(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function loadStorage(attemptId: string): RunnerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${attemptId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorageState;
    if (parsed.version !== 1) return null;
    return {
      stepIndex: parsed.stepIndex ?? 0,
      notes: parsed.notes ?? "",
      answers: parsed.answers ?? {},
    };
  } catch {
    return null;
  }
}

function saveStorage(attemptId: string, state: RunnerState) {
  if (typeof window === "undefined") return;
  try {
    const payload: StorageState = { version: 1, ...state };
    window.localStorage.setItem(`${STORAGE_PREFIX}${attemptId}`, JSON.stringify(payload));
  } catch {
    // quota exceeded etc — non-fatal
  }
}

function clearStorage(attemptId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${attemptId}`);
  } catch {
    // ignore
  }
}

async function transcribeBlob(blob: Blob, filenameHint: string): Promise<string> {
  const file = new File([blob], `${filenameHint}.webm`, { type: blob.type || "audio/webm" });
  const formData = new FormData();
  formData.append("audio", file);
  const res = await fetch("/api/transcribe", { method: "POST", body: formData });
  const payload = (await res.json()) as TranscriptionResponse | { error?: string };
  if (!res.ok || !("transcript" in payload)) {
    throw new Error("error" in payload ? payload.error || "Transcription failed." : "Transcription failed.");
  }
  return payload.transcript;
}

export function MockRunner({
  attemptId,
  plan,
}: {
  attemptId: string;
  plan: MockPaperPlan;
}) {
  const router = useRouter();
  const steps = useMemo(() => buildSteps(plan), [plan]);

  const [stepIndex, setStepIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [restored, setRestored] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  // restore once on mount
  useEffect(() => {
    const saved = loadStorage(attemptId);
    if (saved) {
      setStepIndex(Math.min(saved.stepIndex, steps.length - 1));
      setNotes(saved.notes);
      // Audio blobs are not persisted, but transcripts are. Mark anything
      // mid-transcription as failed (so the submit screen surfaces it).
      const hydrated: Record<number, Answer> = {};
      for (const [idx, a] of Object.entries(saved.answers)) {
        const status: AnswerStatus = a.status === "transcribing" ? "failed" : a.status;
        hydrated[Number(idx)] = {
          ...a,
          status,
          errorMessage: status === "failed" && a.status === "transcribing" ? "页面刷新后需要重新录音" : a.errorMessage,
        };
      }
      setAnswers(hydrated);
    }
    setRestored(true);
  }, [attemptId, steps.length]);

  // persist every change after restore
  useEffect(() => {
    if (!restored) return;
    saveStorage(attemptId, { stepIndex, notes, answers });
  }, [attemptId, restored, stepIndex, notes, answers]);

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const updateAnswer = useCallback((sectionIndex: number, patch: Partial<Answer>) => {
    setAnswers((prev) => ({
      ...prev,
      [sectionIndex]: { ...prev[sectionIndex], ...patch } as Answer,
    }));
  }, []);

  const recordAnswerForStep = useCallback(
    (step: Step, sectionIndex: number, blob: Blob, durationSeconds: number) => {
      const question = getQuestionForStep(plan, step);
      if (!question) return;

      // optimistic — mark transcribing
      setAnswers((prev) => ({
        ...prev,
        [sectionIndex]: {
          sectionIndex,
          questionId: question.questionId,
          transcript: "",
          durationSeconds,
          status: "transcribing",
        },
      }));

      transcribeBlob(blob, `mock-${attemptId}-${sectionIndex}`)
        .then((transcript) => {
          updateAnswer(sectionIndex, { transcript, status: "ready", errorMessage: undefined });
        })
        .catch((err) => {
          updateAnswer(sectionIndex, {
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "转写失败",
          });
        });
    },
    [attemptId, plan, updateAnswer],
  );

  const retryTranscription = useCallback(
    async (sectionIndex: number) => {
      const a = answers[sectionIndex];
      if (!a) return;
      // can't re-transcribe without the original blob; mark failed → user must re-record
      updateAnswer(sectionIndex, {
        status: "failed",
        errorMessage: "需要重新录音才能再次转写",
      });
    },
    [answers, updateAnswer],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitState("submitting");
    setSubmitError("");

    const items = Object.values(answers)
      .filter((a) => a.status === "ready" && a.transcript.trim().length > 0)
      .map((answer) => {
        const step = steps[answer.sectionIndex];
        const question = getQuestionForStep(plan, step);
        if (!question || !step) return null;
        return {
          questionId: question.questionId,
          questionText: question.questionText,
          questionLabel: question.questionLabel,
          topicSlug: question.topicSlug,
          topicTitle: question.topicTitle,
          questionIndex: question.questionIndex ?? null,
          part: question.part,
          transcript: answer.transcript.trim(),
          durationSeconds: answer.durationSeconds,
          sectionIndex: answer.sectionIndex,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      setSubmitState("error");
      setSubmitError("还没有可提交的录音请回到题目重新录制");
      return;
    }

    try {
      const res = await fetch("/api/mock/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, paperId: plan.paper.id, items }),
      });
      const payload = (await res.json()) as { attemptId?: string; error?: string };
      if (!res.ok || !payload.attemptId) {
        throw new Error(payload.error || "提交失败，请稍后重试");
      }
      clearStorage(attemptId);
      router.push(`/report/${payload.attemptId}`);
    } catch (err) {
      setSubmitState("error");
      setSubmitError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    }
  }, [answers, attemptId, plan, router, steps]);

  if (!restored) {
    return (
      <div className="runner-loading">
        <div className="mock-submitting-spinner" />
        <p>正在恢复模考状态…</p>
      </div>
    );
  }

  const step = steps[stepIndex];
  const activePart = getActivePart(step);

  return (
    <div className="runner">
      <RunnerTopbar plan={plan} stepIndex={stepIndex} steps={steps} activePart={activePart} />

      <div className="runner-body">
        {step.kind === "part1" || step.kind === "part3" ? (
          <QuestionStep
            key={`q-${stepIndex}`}
            sectionIndex={stepIndex}
            question={getQuestionForStep(plan, step)!}
            partLabel={step.kind === "part1" ? "Part 1" : "Part 3"}
            qNumber={step.qIdx + 1}
            qTotal={step.kind === "part1" ? plan.part1Questions.length : plan.part3Questions.length}
            existing={answers[stepIndex]}
            onComplete={(blob, elapsed) => {
              recordAnswerForStep(step, stepIndex, blob, elapsed);
              goNext();
            }}
            onSkip={goNext}
          />
        ) : null}

        {step.kind === "transition-12" ? (
          <TransitionStep
            key="t12"
            heading="进入 Part 2"
            description="Part 2 会先给你一张 Cue Card 和 60 秒准备时间，请准备好开始独白"
            onContinue={goNext}
          />
        ) : null}

        {step.kind === "part2-prep" ? (
          <Part2PrepStep
            key={`prep-${stepIndex}`}
            question={plan.part2Question}
            notes={notes}
            onNotesChange={setNotes}
            onContinue={goNext}
          />
        ) : null}

        {step.kind === "part2-talk" ? (
          <Part2TalkStep
            key={`talk-${stepIndex}`}
            sectionIndex={stepIndex}
            question={plan.part2Question}
            notes={notes}
            existing={answers[stepIndex]}
            onComplete={(blob, elapsed) => {
              recordAnswerForStep(step, stepIndex, blob, elapsed);
              goNext();
            }}
          />
        ) : null}

        {step.kind === "transition-23" ? (
          <TransitionStep
            key="t23"
            heading="进入 Part 3"
            description="Part 3 是与 Part 2 同主题的延展讨论，4–5 个问题，每题展开 2–3 句"
            onContinue={goNext}
          />
        ) : null}

        {step.kind === "submit" ? (
          <SubmitStep
            steps={steps}
            plan={plan}
            answers={answers}
            submitState={submitState}
            submitError={submitError}
            onSubmit={handleSubmit}
            onRetry={retryTranscription}
            onJumpTo={(idx) => setStepIndex(idx)}
          />
        ) : null}
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function RunnerTopbar({
  plan,
  stepIndex,
  steps,
  activePart,
}: {
  plan: MockPaperPlan;
  stepIndex: number;
  steps: Step[];
  activePart: "part1" | "part2" | "part3" | null;
}) {
  const part1Total = plan.part1Questions.length;
  const part3Total = plan.part3Questions.length;
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <div className="runner-topbar">
      <div className="runner-progress-rail">
        <div className={`runner-section ${activePart === "part1" ? "runner-section-active" : ""}`}>
          <span className="runner-section-label">Part 1</span>
          <span className="runner-section-meta">{part1Total} questions</span>
        </div>
        <div className={`runner-section ${activePart === "part2" ? "runner-section-active" : ""}`}>
          <span className="runner-section-label">Part 2</span>
          <span className="runner-section-meta">Cue Card</span>
        </div>
        <div className={`runner-section ${activePart === "part3" ? "runner-section-active" : ""}`}>
          <span className="runner-section-label">Part 3</span>
          <span className="runner-section-meta">{part3Total} questions</span>
        </div>
      </div>
      <div className="runner-meta-cluster">
        <div className="runner-meta-progress">
          <div className="runner-meta-progress-track">
            <div className="runner-meta-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="runner-meta-progress-label">{stepIndex + 1} / {steps.length}</span>
        </div>
        <Link href="/mock" className="runner-exit">暂离</Link>
      </div>
    </div>
  );
}

function QuestionStep({
  sectionIndex,
  question,
  partLabel,
  qNumber,
  qTotal,
  existing,
  onComplete,
  onSkip,
}: {
  sectionIndex: number;
  question: MockPaperQuestion;
  partLabel: string;
  qNumber: number;
  qTotal: number;
  existing?: Answer;
  onComplete: (blob: Blob, elapsedSec: number) => void;
  onSkip: () => void;
}) {
  const target = question.targetSeconds ?? 60;
  const recorder = useRecorder({
    maxSeconds: PART1_PART3_MAX_SECONDS,
    onStopped: (blob, elapsed) => {
      onComplete(blob, elapsed);
    },
  });

  // auto-prompt: focus state
  return (
    <section className="runner-card runner-card-question">
      <header className="runner-card-head">
        <span className="runner-card-eyebrow">{partLabel} · {qNumber} / {qTotal}</span>
        <span className="runner-card-meta">建议 {target} 秒 · 最长 {PART1_PART3_MAX_SECONDS} 秒</span>
      </header>

      <h2 className="runner-question">{question.questionText}</h2>
      <p className="runner-question-helper">{question.helper}</p>

      <RecorderControls
        sectionIndex={sectionIndex}
        recorder={recorder}
        existing={existing}
        primaryLabel="开始作答"
        stopLabel="作答完成 · 下一题"
        onSkip={onSkip}
        skipLabel="跳过此题"
      />
    </section>
  );
}

function Part2PrepStep({
  question,
  notes,
  onNotesChange,
  onContinue,
}: {
  question: MockPaperQuestion;
  notes: string;
  onNotesChange: (next: string) => void;
  onContinue: () => void;
}) {
  const total = question.preparationSeconds ?? 60;
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          onContinue();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onContinue]);

  return (
    <section className="runner-card runner-card-prep">
      <header className="runner-card-head">
        <span className="runner-card-eyebrow">Part 2 · 准备时间</span>
        <span className="runner-prep-clock">{formatClock(remaining)}</span>
      </header>

      <CueCard question={question} compact={false} />

      <label className="runner-notes">
        <span className="runner-notes-label">笔记区（考场上你会拿到纸笔，这里是你的草稿）</span>
        <textarea
          className="runner-notes-input"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={"建议按 Cue Card 四个 bullet 各写 1 行关键词，避免完整句子"}
          rows={6}
        />
      </label>

      <div className="runner-card-actions">
        <button type="button" className="runner-btn-primary" onClick={onContinue}>
          准备好了，开始独白 →
        </button>
        <span className="runner-card-actions-hint">{remaining} 秒后会自动开始</span>
      </div>
    </section>
  );
}

function Part2TalkStep({
  sectionIndex,
  question,
  notes,
  existing,
  onComplete,
}: {
  sectionIndex: number;
  question: MockPaperQuestion;
  notes: string;
  existing?: Answer;
  onComplete: (blob: Blob, elapsedSec: number) => void;
}) {
  const maxSec = question.targetSeconds ?? 110;
  const recorder = useRecorder({
    maxSeconds: maxSec,
    onStopped: (blob, elapsed) => {
      onComplete(blob, elapsed);
    },
  });

  return (
    <section className="runner-card runner-card-talk">
      <header className="runner-card-head">
        <span className="runner-card-eyebrow">Part 2 · 独白</span>
        <span className="runner-card-meta">目标 1.5–2 分钟 · 最长 {maxSec} 秒</span>
      </header>

      <div className="runner-talk-grid">
        <div className="runner-talk-main">
          <CueCard question={question} compact />
          <RecorderControls
            sectionIndex={sectionIndex}
            recorder={recorder}
            existing={existing}
            primaryLabel="开始独白"
            stopLabel="结束独白 · 进入 Part 3"
          />
        </div>
        <aside className="runner-talk-side">
          <p className="runner-talk-side-title">你的笔记</p>
          <pre className="runner-talk-notes">{notes || "（无笔记）"}</pre>
        </aside>
      </div>
    </section>
  );
}

function CueCard({ question, compact }: { question: MockPaperQuestion; compact: boolean }) {
  return (
    <div className={`runner-cue-card ${compact ? "runner-cue-card-compact" : ""}`}>
      <p className="runner-cue-card-title">{question.questionText}</p>
      {question.cueCardBullets && question.cueCardBullets.length > 0 ? (
        <ul className="runner-cue-card-bullets">
          {question.cueCardBullets.map((bullet, idx) => (
            <li key={idx}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TransitionStep({
  heading,
  description,
  onContinue,
}: {
  heading: string;
  description: string;
  onContinue: () => void;
}) {
  const [remaining, setRemaining] = useState(TRANSITION_SECONDS);
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          onContinue();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onContinue]);

  return (
    <section className="runner-card runner-card-transition">
      <p className="runner-transition-eyebrow">即将开始</p>
      <h2 className="runner-transition-heading">{heading}</h2>
      <p className="runner-transition-desc">{description}</p>
      <button type="button" className="runner-btn-primary" onClick={onContinue}>
        立即开始 →
      </button>
      <p className="runner-transition-auto">{remaining} 秒后自动开始</p>
    </section>
  );
}

function RecorderControls({
  sectionIndex,
  recorder,
  existing,
  primaryLabel,
  stopLabel,
  onSkip,
  skipLabel,
}: {
  sectionIndex: number;
  recorder: ReturnType<typeof useRecorder>;
  existing?: Answer;
  primaryLabel: string;
  stopLabel: string;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  const startedRef = useRef(false);

  // If user already recorded this question previously (came back to it),
  // show that state instead of letting them clobber it accidentally.
  if (existing && (existing.status === "ready" || existing.status === "transcribing") && recorder.state === "idle" && !startedRef.current) {
    return (
      <div className="runner-recorder runner-recorder-done">
        <span className="runner-recorder-status runner-recorder-status-ok">
          ✓ 已完成（{existing.durationSeconds} 秒）{existing.status === "transcribing" ? " · 正在识别" : ""}
        </span>
        {onSkip ? (
          <button type="button" className="runner-btn-ghost" onClick={onSkip}>
            下一题 →
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="runner-recorder">
      <div className="runner-recorder-meter" data-state={recorder.state}>
        <div className="runner-recorder-meter-pulse" />
        <span className="runner-recorder-clock">{formatClock(recorder.elapsed)}</span>
      </div>

      {recorder.state === "idle" || recorder.state === "stopped" || recorder.state === "error" ? (
        <button
          type="button"
          className="runner-btn-primary runner-btn-record"
          onClick={() => {
            startedRef.current = true;
            void recorder.start();
          }}
        >
          ● {primaryLabel}
        </button>
      ) : null}

      {recorder.state === "requesting" ? (
        <span className="runner-recorder-status">正在请求麦克风…</span>
      ) : null}

      {recorder.state === "recording" ? (
        <button type="button" className="runner-btn-primary runner-btn-stop" onClick={recorder.stop}>
          ■ {stopLabel}
        </button>
      ) : null}

      {recorder.error ? <p className="runner-recorder-error">{recorder.error}</p> : null}

      {recorder.state === "idle" && onSkip && skipLabel ? (
        <button type="button" className="runner-btn-ghost" onClick={onSkip}>
          {skipLabel}
        </button>
      ) : null}

      <p className="runner-recorder-section">section #{sectionIndex}</p>
    </div>
  );
}

function SubmitStep({
  steps,
  plan,
  answers,
  submitState,
  submitError,
  onSubmit,
  onRetry,
  onJumpTo,
}: {
  steps: Step[];
  plan: MockPaperPlan;
  answers: Record<number, Answer>;
  submitState: "idle" | "submitting" | "error";
  submitError: string;
  onSubmit: () => void;
  onRetry: (sectionIndex: number) => void;
  onJumpTo: (sectionIndex: number) => void;
}) {
  const answerableSteps = steps
    .map((step, idx) => ({ step, idx }))
    .filter(({ step }) => step.kind === "part1" || step.kind === "part2-talk" || step.kind === "part3");

  const ready = answerableSteps.filter(({ idx }) => answers[idx]?.status === "ready").length;
  const failed = answerableSteps.filter(({ idx }) => answers[idx]?.status === "failed").length;
  const transcribing = answerableSteps.filter(({ idx }) => answers[idx]?.status === "transcribing").length;
  const missing = answerableSteps.filter(({ idx }) => !answers[idx] || answers[idx].status === "pending").length;

  const canSubmit = submitState !== "submitting" && ready >= 1 && transcribing === 0;

  return (
    <section className="runner-card runner-card-submit">
      <header className="runner-card-head">
        <span className="runner-card-eyebrow">即将交卷</span>
        <span className="runner-card-meta">{ready}/{answerableSteps.length} 已就绪</span>
      </header>

      <h2 className="runner-submit-heading">检查你的回答</h2>
      <p className="runner-submit-desc">
        交卷后系统会按整场表现统一评分已识别的录音会进入评分；缺失或失败的题目会被跳过      </p>

      <div className="runner-submit-stats">
        <span className="runner-submit-stat runner-submit-stat-ok">✓ 就绪 {ready}</span>
        {transcribing > 0 ? <span className="runner-submit-stat runner-submit-stat-pending">⏳ 识别中 {transcribing}</span> : null}
        {failed > 0 ? <span className="runner-submit-stat runner-submit-stat-bad">✗ 失败 {failed}</span> : null}
        {missing > 0 ? <span className="runner-submit-stat runner-submit-stat-missing">○ 未答 {missing}</span> : null}
      </div>

      <ol className="runner-submit-list">
        {answerableSteps.map(({ step, idx }) => {
          const a = answers[idx];
          const question = getQuestionForStep(plan, step);
          if (!question) return null;
          const partLabel = step.kind === "part1" ? "Part 1" : step.kind === "part2-talk" ? "Part 2" : "Part 3";
          const status: AnswerStatus = a?.status ?? "pending";
          return (
            <li key={idx} className={`runner-submit-item runner-submit-item-${status}`}>
              <div className="runner-submit-item-meta">
                <span className="runner-submit-item-tag">{partLabel}</span>
                <span className="runner-submit-item-status">
                  {status === "ready" ? `✓ 已识别（${a!.durationSeconds}s）` : null}
                  {status === "transcribing" ? "⏳ 识别中…" : null}
                  {status === "failed" ? "✗ 失败" : null}
                  {status === "pending" ? "○ 未答" : null}
                </span>
              </div>
              <p className="runner-submit-item-question">{question.questionText}</p>
              {status === "ready" && a ? (
                <p className="runner-submit-item-transcript">{a.transcript}</p>
              ) : null}
              {status === "failed" && a?.errorMessage ? (
                <p className="runner-submit-item-error">{a.errorMessage}</p>
              ) : null}
              {(status === "failed" || status === "pending") ? (
                <div className="runner-submit-item-actions">
                  <button type="button" className="runner-btn-ghost" onClick={() => onJumpTo(idx)}>
                    回到此题重录
                  </button>
                  {status === "failed" ? (
                    <button type="button" className="runner-btn-ghost" onClick={() => onRetry(idx)}>
                      重试转写
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {submitError ? <p className="runner-submit-error">{submitError}</p> : null}

      <div className="runner-submit-cta">
        <button
          type="button"
          className="runner-btn-primary runner-btn-submit"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {submitState === "submitting" ? "正在交卷与评分…" : "提交模考 →"}
        </button>
        <p className="runner-submit-cta-note">
          {transcribing > 0
            ? "请等待识别完成，按钮将自动可用"
            : ready === 0
              ? "至少需要 1 道题就绪才能提交"
              : "评分通常需要 30–60 秒，请勿关闭页面"}
        </p>
      </div>
    </section>
  );
}
