import { NextResponse } from "next/server";
import { scoreSpeakingAnswer } from "@/lib/agents/scoring";
import {
  getMockAttemptForUser,
  markAttemptFailed,
  markAttemptScored,
  markAttemptSubmitted,
} from "@/lib/data/attempts";
import { buildMockPaperPlan } from "@/lib/data/papers";
import { createMockSegmentSession } from "@/lib/data/sessions";
import { getServerUser } from "@/lib/supabase/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import type {
  LiveScoringResult,
  ScoreBreakdown,
  SpeakingPart,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCORE_CONCURRENCY = 4;
const MAX_ITEMS = 16;
const MAX_TRANSCRIPT_LENGTH = 8_000;
const MIN_TRANSCRIPT_LENGTH = 1;

type SubmitItem = {
  questionId: string;
  questionText: string;
  questionLabel: string;
  topicSlug: string;
  topicTitle: string;
  questionIndex: number | null;
  part: SpeakingPart;
  transcript: string;
  durationSeconds: number;
  sectionIndex: number;
};

type SubmitBody = {
  attemptId?: string;
  paperId?: string;
  items?: SubmitItem[];
};

function isSpeakingPart(value: unknown): value is SpeakingPart {
  return value === "part1" || value === "part2" || value === "part3";
}

function clampStep(value: number) {
  return Math.min(9, Math.max(0, Math.round(value * 2) / 2));
}

function aggregateBandScores(results: LiveScoringResult[]): ScoreBreakdown {
  if (results.length === 0) {
    return {
      total: 0,
      fluencyCoherence: 0,
      lexicalResource: 0,
      grammar: 0,
      pronunciation: 0,
      completeness: 0,
    };
  }
  const sum = results.reduce(
    (acc, r) => ({
      total: acc.total + r.score.total,
      fluencyCoherence: acc.fluencyCoherence + r.score.fluencyCoherence,
      lexicalResource: acc.lexicalResource + r.score.lexicalResource,
      grammar: acc.grammar + r.score.grammar,
      pronunciation: acc.pronunciation + r.score.pronunciation,
      completeness: acc.completeness + r.score.completeness,
    }),
    { total: 0, fluencyCoherence: 0, lexicalResource: 0, grammar: 0, pronunciation: 0, completeness: 0 },
  );
  const n = results.length;
  return {
    total: clampStep(sum.total / n),
    fluencyCoherence: clampStep(sum.fluencyCoherence / n),
    lexicalResource: clampStep(sum.lexicalResource / n),
    grammar: clampStep(sum.grammar / n),
    pronunciation: clampStep(sum.pronunciation / n),
    completeness: clampStep(sum.completeness / n),
  };
}

function buildOverallSummary(results: LiveScoringResult[], aggregate: ScoreBreakdown): string {
  const partGroups: Record<SpeakingPart, LiveScoringResult[]> = { part1: [], part2: [], part3: [] };
  for (const r of results) partGroups[r.part].push(r);

  const lowestDim = (Object.entries(aggregate) as Array<[keyof ScoreBreakdown, number]>)
    .filter(([key]) => key !== "total")
    .sort((a, b) => a[1] - b[1])[0];

  const lowestLabel: Record<string, string> = {
    fluencyCoherence: "流利度与连贯性",
    lexicalResource: "词汇丰富度",
    grammar: "语法准确性",
    pronunciation: "发音清晰度",
    completeness: "回答完整度",
  };

  const partSummaries = (["part1", "part2", "part3"] as SpeakingPart[])
    .map((p) => {
      const list = partGroups[p];
      if (list.length === 0) return null;
      const avg = list.reduce((s, r) => s + r.score.total, 0) / list.length;
      const partLabel = p === "part1" ? "Part 1" : p === "part2" ? "Part 2" : "Part 3";
      return `${partLabel} 平均 ${clampStep(avg).toFixed(1)} 分（共 ${list.length} 题）`;
    })
    .filter(Boolean)
    .join(" · ");

  const dimensionHint = lowestDim
    ? `当前最薄弱的维度是「${lowestLabel[lowestDim[0]] ?? lowestDim[0]}」(平均 ${lowestDim[1].toFixed(1)})。`
    : "";

  return `整场模考综合 ${aggregate.total.toFixed(1)} 分。${partSummaries}。${dimensionHint}`.trim();
}

type TaskOutcome<R> = { ok: true; value: R } | { ok: false; error: unknown };

/**
 * Run `task` for each item with up to `limit` concurrent workers. UNLIKE a
 * naive Promise.all this never short-circuits on the first rejection: each
 * task's success/failure is captured independently. The caller decides
 * whether a partial outcome is acceptable. This lets the mock-submit
 * endpoint score whatever it can, persist successful segments, and report
 * a partial result instead of marking the whole attempt failed if a single
 * upstream OpenAI call hiccups.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<TaskOutcome<R>[]> {
  const results = new Array<TaskOutcome<R>>(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      try {
        const value = await task(items[i], i);
        results[i] = { ok: true, value };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function validateItem(item: unknown): SubmitItem | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (
    typeof o.questionId !== "string" ||
    typeof o.questionText !== "string" ||
    typeof o.questionLabel !== "string" ||
    typeof o.topicSlug !== "string" ||
    typeof o.topicTitle !== "string" ||
    typeof o.transcript !== "string" ||
    typeof o.sectionIndex !== "number" ||
    typeof o.durationSeconds !== "number" ||
    !isSpeakingPart(o.part)
  ) {
    return null;
  }
  const transcript = o.transcript.trim();
  if (transcript.length < MIN_TRANSCRIPT_LENGTH || transcript.length > MAX_TRANSCRIPT_LENGTH) {
    return null;
  }
  const questionIndex =
    typeof o.questionIndex === "number" && Number.isFinite(o.questionIndex) ? o.questionIndex : null;
  return {
    questionId: o.questionId.trim(),
    questionText: o.questionText.trim(),
    questionLabel: o.questionLabel.trim(),
    topicSlug: o.topicSlug.trim(),
    topicTitle: o.topicTitle.trim(),
    questionIndex,
    part: o.part,
    transcript,
    durationSeconds: Math.max(0, Math.min(1800, Math.round(o.durationSeconds))),
    sectionIndex: Math.max(0, Math.min(50, Math.round(o.sectionIndex))),
  };
}

export async function POST(request: Request) {
  let attemptIdForFailure: string | null = null;
  let userIdForFailure: string | null = null;
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    userIdForFailure = user.id;

    if (!checkRateLimit(user.id, "mock-submit", 4, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "你刚刚提交过模考。每小时最多 4 次整场提交。" },
        { status: 429 },
      );
    }

    let body: SubmitBody;
    try {
      body = (await request.json()) as SubmitBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const attemptId = typeof body.attemptId === "string" ? body.attemptId.trim() : "";
    const paperId = typeof body.paperId === "string" ? body.paperId.trim() : "";
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!attemptId || !paperId || rawItems.length === 0) {
      return NextResponse.json(
        { error: "attemptId, paperId, and items are required." },
        { status: 400 },
      );
    }
    if (rawItems.length > MAX_ITEMS) {
      return NextResponse.json({ error: "Too many items in this attempt." }, { status: 400 });
    }
    attemptIdForFailure = attemptId;

    const validatedItems: SubmitItem[] = [];
    for (const raw of rawItems) {
      const v = validateItem(raw);
      if (!v) {
        return NextResponse.json({ error: "Invalid item payload." }, { status: 400 });
      }
      validatedItems.push(v);
    }

    const [attempt, plan] = await Promise.all([
      getMockAttemptForUser(attemptId, user.id),
      buildMockPaperPlan(paperId),
    ]);

    if (!attempt) {
      return NextResponse.json({ error: "Mock attempt not found." }, { status: 404 });
    }
    if (attempt.paperId !== paperId) {
      return NextResponse.json({ error: "Paper mismatch for this attempt." }, { status: 400 });
    }
    if (attempt.status === "scored" || attempt.status === "failed") {
      // Already terminal — don't re-spend OpenAI tokens. Client navigates to
      // the report; if the previous run was failed, the report page surfaces
      // that and offers a retry path.
      return NextResponse.json({ attemptId: attempt.id, status: attempt.status });
    }
    if (!plan) {
      return NextResponse.json({ error: "Paper not available." }, { status: 404 });
    }

    // Mark submitted before the long-running scoring loop, so a crash mid-way
    // is still reflected as "submitted but unscored" rather than stuck "in_progress".
    await markAttemptSubmitted(attempt.id, user.id);

    const outcomes = await runWithConcurrency(validatedItems, SCORE_CONCURRENCY, async (item) => {
      const sessionIdHint = `${attempt.id}::${item.sectionIndex}::${item.questionId}`;
      const result = await scoreSpeakingAnswer({
        part: item.part,
        topicSlug: item.topicSlug,
        topicTitle: item.topicTitle,
        questionId: item.questionId,
        questionText: item.questionText,
        questionLabel: item.questionLabel,
        questionIndex: item.questionIndex,
        transcript: item.transcript,
        durationSeconds: item.durationSeconds,
        sessionIdHint,
      });
      await createMockSegmentSession(result, user.id, {
        mockAttemptId: attempt.id,
        sectionIndex: item.sectionIndex,
      });
      return result;
    });

    const scoredResults = outcomes
      .filter((o): o is { ok: true; value: Awaited<ReturnType<typeof scoreSpeakingAnswer>> } => o.ok)
      .map((o) => o.value);
    const failedCount = outcomes.length - scoredResults.length;

    if (scoredResults.length === 0) {
      // Total wipeout — nothing scored. Mark failed so the report page can
      // surface a clear error and the user can retry.
      console.error(
        "Mock submit: 0/" + outcomes.length + " segments scored",
        outcomes.filter((o) => !o.ok).map((o) => (o as { ok: false; error: unknown }).error),
      );
      await markAttemptFailed(attempt.id, user.id, "评分服务返回失败，请重试");
      return NextResponse.json(
        { error: "评分服务暂时无法完成本次提交，请稍后重试。" },
        { status: 502 },
      );
    }

    const aggregate = aggregateBandScores(scoredResults);
    const summary = buildOverallSummary(scoredResults, aggregate);

    await markAttemptScored({
      id: attempt.id,
      userId: user.id,
      totalScore: aggregate.total,
      bandScores: aggregate,
      summary: failedCount > 0
        ? `${summary}（注：${failedCount} 道题评分失败，已按可用题目计分）`
        : summary,
    });

    return NextResponse.json({
      attemptId: attempt.id,
      status: "scored",
      totalScore: aggregate.total,
      bandScores: aggregate,
      partialFailures: failedCount,
    });
  } catch (error) {
    // Log full error server-side; surface a generic message to the client
    // so we don't leak schema names, FK constraint names, or upstream details.
    console.error("Mock submit failed:", error);
    if (attemptIdForFailure && userIdForFailure) {
      try {
        await markAttemptFailed(attemptIdForFailure, userIdForFailure, "Scoring pipeline failed.");
      } catch (cleanupError) {
        console.error("Failed to mark attempt failed:", cleanupError);
      }
    }
    return NextResponse.json(
      { error: "提交失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
