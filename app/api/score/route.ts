import { NextResponse } from "next/server";
import { scoreSpeakingAnswer } from "@/lib/agents/scoring";
import { createPracticeSessionFromScore } from "@/lib/data/sessions";
import { getServerUser } from "@/lib/supabase/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ScorePracticeRequest, SpeakingPart } from "@/lib/types";

const MAX_REQUEST_BYTES = 50_000;
const MAX_TRANSCRIPT_LENGTH = 8_000;
const MAX_TOPIC_SLUG_LENGTH = 120;
const MAX_TOPIC_TITLE_LENGTH = 200;
const MAX_QUESTION_ID_LENGTH = 160;
const MAX_QUESTION_LABEL_LENGTH = 120;
const MAX_QUESTION_TEXT_LENGTH = 2_000;
const MAX_DURATION_SECONDS = 1_800;
const MAX_QUESTION_INDEX = 50;

function isSpeakingPart(value: string): value is SpeakingPart {
  return value === "part1" || value === "part2" || value === "part3";
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!checkRateLimit(user.id, "score", 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request body too large." }, { status: 413 });
    }

    let body: Partial<ScorePracticeRequest>;
    try {
      body = (await request.json()) as Partial<ScorePracticeRequest>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.part || !isSpeakingPart(body.part)) {
      return NextResponse.json({ error: "Invalid speaking part." }, { status: 400 });
    }

    const transcript = body.transcript?.trim();
    const topicSlug = body.topicSlug?.trim();
    const topicTitle = body.topicTitle?.trim();
    const questionId = body.questionId?.trim();
    const questionText = body.questionText?.trim();
    const questionLabel = body.questionLabel?.trim();
    const questionIndex = body.questionIndex ?? null;

    if (!transcript || !topicSlug || !topicTitle || !questionId || !questionText || !questionLabel) {
      return NextResponse.json({ error: "Topic/question metadata and transcript are required." }, { status: 400 });
    }
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json({ error: "Transcript exceeds maximum allowed length." }, { status: 400 });
    }
    if (topicSlug.length > MAX_TOPIC_SLUG_LENGTH) {
      return NextResponse.json({ error: "topicSlug exceeds maximum allowed length." }, { status: 400 });
    }
    if (topicTitle.length > MAX_TOPIC_TITLE_LENGTH) {
      return NextResponse.json({ error: "topicTitle exceeds maximum allowed length." }, { status: 400 });
    }
    if (questionId.length > MAX_QUESTION_ID_LENGTH) {
      return NextResponse.json({ error: "questionId exceeds maximum allowed length." }, { status: 400 });
    }
    if (questionLabel.length > MAX_QUESTION_LABEL_LENGTH) {
      return NextResponse.json({ error: "questionLabel exceeds maximum allowed length." }, { status: 400 });
    }
    if (questionText.length > MAX_QUESTION_TEXT_LENGTH) {
      return NextResponse.json({ error: "questionText exceeds maximum allowed length." }, { status: 400 });
    }

    const durationSeconds = body.durationSeconds ?? 0;
    if (
      typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0 ||
      durationSeconds > MAX_DURATION_SECONDS
    ) {
      return NextResponse.json({ error: "Invalid durationSeconds value." }, { status: 400 });
    }
    if (
      questionIndex !== null &&
      (typeof questionIndex !== "number" ||
        !Number.isInteger(questionIndex) ||
        questionIndex < 0 ||
        questionIndex > MAX_QUESTION_INDEX)
    ) {
      return NextResponse.json({ error: "Invalid questionIndex value." }, { status: 400 });
    }

    const result = await scoreSpeakingAnswer({
      part: body.part,
      topicSlug,
      topicTitle,
      questionId,
      questionText,
      questionLabel,
      questionIndex,
      transcript,
      durationSeconds,
    });

    await createPracticeSessionFromScore(result, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to score practice session." }, { status: 500 });
  }
}
