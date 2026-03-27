import { NextResponse } from "next/server";
import { createPracticeSessionFromScore } from "@/lib/data/sessions";
import { getServerUser } from "@/lib/supabase/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import type {
  DimensionFeedback,
  LiveScoringResult,
  PronunciationItem,
  ScoreBreakdown,
  ScorePracticeRequest,
  SpeakingPart,
} from "@/lib/types";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const SCORING_MODEL = "gpt-4o-mini";
const MAX_REQUEST_BYTES = 50_000;
const MAX_TRANSCRIPT_LENGTH = 8_000;
const MAX_TOPIC_SLUG_LENGTH = 120;
const MAX_TOPIC_TITLE_LENGTH = 200;
const MAX_QUESTION_ID_LENGTH = 160;
const MAX_QUESTION_LABEL_LENGTH = 120;
const MAX_QUESTION_TEXT_LENGTH = 2_000;
const MAX_DURATION_SECONDS = 1_800;
const MAX_QUESTION_INDEX = 50;

const scoringSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    total: { type: "number" },
    fluencyCoherence: { type: "number" },
    lexicalResource: { type: "number" },
    grammar: { type: "number" },
    pronunciation: { type: "number" },
    completeness: { type: "number" },
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 4,
    },
    priorities: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 4,
    },
    nextStep: { type: "string" },
    sampleAnswer: { type: "string" },
    improvedAnswer: { type: "string" },
    dimensionFeedback: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dimension: {
            type: "string",
            enum: ["fluencyCoherence", "lexicalResource", "grammar", "pronunciation", "completeness"],
          },
          coachNote: { type: "string" },
          zhNote: { type: "string" },
        },
        required: ["dimension", "coachNote", "zhNote"],
      },
    },
    pronunciationFocus: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          ipa: { type: "string" },
          tip: { type: "string" },
        },
        required: ["text", "ipa", "tip"],
      },
    },
    sampleAnswerPronunciation: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          ipa: { type: "string" },
          tip: { type: "string" },
        },
        required: ["text", "ipa", "tip"],
      },
    },
    improvedAnswerPronunciation: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          ipa: { type: "string" },
          tip: { type: "string" },
        },
        required: ["text", "ipa", "tip"],
      },
    },
    riskFlag: { type: "boolean" },
    riskReason: { type: "string" },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
  },
  required: [
    "total",
    "fluencyCoherence",
    "lexicalResource",
    "grammar",
    "pronunciation",
    "completeness",
    "summary",
    "strengths",
    "priorities",
    "nextStep",
    "sampleAnswer",
    "improvedAnswer",
    "dimensionFeedback",
    "pronunciationFocus",
    "sampleAnswerPronunciation",
    "improvedAnswerPronunciation",
    "riskFlag",
    "riskReason",
    "confidence",
  ],
};

function isSpeakingPart(value: string): value is SpeakingPart {
  return value === "part1" || value === "part2" || value === "part3";
}

function clampScore(value: number) {
  return Math.min(9, Math.max(0, Math.round(value * 2) / 2));
}

function normalizeScore(score: ScoreBreakdown): ScoreBreakdown {
  return {
    total: clampScore(score.total),
    fluencyCoherence: clampScore(score.fluencyCoherence),
    lexicalResource: clampScore(score.lexicalResource),
    grammar: clampScore(score.grammar),
    pronunciation: clampScore(score.pronunciation),
    completeness: clampScore(score.completeness),
  };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!checkRateLimit(user.id, "score", 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Scoring service is not configured." }, { status: 500 });
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

    const systemPrompt = [
      "You are an expert IELTS speaking coach and evaluator for an education product.",
      "Evaluate the student's transcript carefully and return structured JSON.",
      "Use five dimensions: fluencyCoherence, lexicalResource, grammar, pronunciation, completeness.",
      "Scores must be in 0.0 to 9.0 increments of 0.5.",
      "pronunciation should be inferred carefully from transcript evidence only.",
      "If the answer is too short, incomplete, vague, or likely unreliable, set riskFlag=true.",
      "",
      "For 'summary': write a detailed, coach-like paragraph (4-6 sentences) in English. Be specific about what the student did well and what needs work. Reference actual phrases or patterns from their transcript.",
      "",
      "For 'dimensionFeedback': provide one entry per dimension (all 5 required). 'coachNote' is a specific English coaching note (2-3 sentences). 'zhNote' is a concise Chinese annotation (1-2 sentences) explaining the same point in Chinese for the student.",
      "",
      "For 'sampleAnswer': write a high-scoring model answer (Band 7-8 level) for this question. It should be natural, fluent, and demonstrate excellent vocabulary and grammar.",
      "",
      "For 'improvedAnswer': rewrite the student's actual answer to make it significantly better. Keep the student's core ideas and personal content, but upgrade vocabulary, fix grammar, improve coherence, and add detail. This should feel like the student's own voice, just polished.",
      "",
      "For 'pronunciationFocus': pick 3-6 words or phrases from the student's transcript that are commonly mispronounced by Chinese speakers. Provide IPA transcription and a brief tip.",
      "",
      "For 'sampleAnswerPronunciation': pick 3-6 key vocabulary words from the sampleAnswer that are important for pronunciation. Provide IPA and a brief tip.",
      "",
      "For 'improvedAnswerPronunciation': pick 3-6 key vocabulary words from the improvedAnswer that are important for pronunciation. Provide IPA and a brief tip.",
      "",
      "Keep strengths and priorities concrete and specific, not generic.",
    ].join(" ");

    const userPrompt = [
      `Speaking part: ${body.part}`,
      `Topic: ${topicTitle}`,
      `Question label: ${questionLabel}`,
      questionIndex !== null ? `Question index: ${questionIndex}` : null,
      `Question: ${questionText}`,
      `Duration seconds: ${durationSeconds}`,
      `Transcript: ${transcript}`,
      "Return a total score, sub-scores, detailed summary, strengths, priorities, nextStep, sampleAnswer, improvedAnswer, dimensionFeedback, pronunciationFocus, sampleAnswerPronunciation, improvedAnswerPronunciation, riskFlag, riskReason, and confidence.",
    ]
      .filter(Boolean)
      .join("\n");

    const upstreamResponse = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: SCORING_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ielts_speaking_score",
            schema: scoringSchema,
            strict: true,
          },
        },
      }),
    });

    if (!upstreamResponse.ok) {
      const upstreamText = await upstreamResponse.text();
      console.error("OpenAI scoring failed:", upstreamText);

      return NextResponse.json(
        { error: "OpenAI scoring failed. Please try again." },
        { status: 502 },
      );
    }

    const data = (await upstreamResponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Scoring response was empty." }, { status: 502 });
    }

    let parsed: {
      total: number;
      fluencyCoherence: number;
      lexicalResource: number;
      grammar: number;
      pronunciation: number;
      completeness: number;
      summary: string;
      strengths: string[];
      priorities: string[];
      nextStep: string;
      sampleAnswer: string;
      improvedAnswer: string;
      dimensionFeedback: DimensionFeedback[];
      pronunciationFocus: PronunciationItem[];
      sampleAnswerPronunciation: PronunciationItem[];
      improvedAnswerPronunciation: PronunciationItem[];
      riskFlag: boolean;
      riskReason: string;
      confidence: "low" | "medium" | "high";
    };

    try {
      parsed = JSON.parse(content) as {
        total: number;
        fluencyCoherence: number;
        lexicalResource: number;
        grammar: number;
        pronunciation: number;
        completeness: number;
        summary: string;
        strengths: string[];
        priorities: string[];
        nextStep: string;
        sampleAnswer: string;
        improvedAnswer: string;
        dimensionFeedback: DimensionFeedback[];
        pronunciationFocus: PronunciationItem[];
        sampleAnswerPronunciation: PronunciationItem[];
        improvedAnswerPronunciation: PronunciationItem[];
        riskFlag: boolean;
        riskReason: string;
        confidence: "low" | "medium" | "high";
      };
    } catch {
      return NextResponse.json({ error: "Scoring response was not valid JSON." }, { status: 502 });
    }

    const score = normalizeScore({
      total: parsed.total,
      fluencyCoherence: parsed.fluencyCoherence,
      lexicalResource: parsed.lexicalResource,
      grammar: parsed.grammar,
      pronunciation: parsed.pronunciation,
      completeness: parsed.completeness,
    });

    const result: LiveScoringResult = {
      sessionId: `${body.part}-${Date.now()}`,
      topicSlug,
      topicTitle,
      questionId,
      questionText,
      questionIndex,
      questionLabel,
      part: body.part,
      transcript,
      durationSeconds,
      score,
      feedback: {
        summary: parsed.summary,
        strengths: parsed.strengths,
        priorities: parsed.priorities,
        nextStep: parsed.nextStep,
        sampleAnswer: parsed.sampleAnswer,
        improvedAnswer: parsed.improvedAnswer,
        dimensionFeedback: parsed.dimensionFeedback,
        pronunciationFocus: parsed.pronunciationFocus,
        sampleAnswerPronunciation: parsed.sampleAnswerPronunciation,
        improvedAnswerPronunciation: parsed.improvedAnswerPronunciation,
      },
      riskFlag: parsed.riskFlag,
      riskReason: parsed.riskReason,
      confidence: parsed.confidence,
      provider: "openai",
      model: SCORING_MODEL,
      scoringMode: "transcript-first",
      createdAt: new Date().toISOString(),
      processingSummary: "Real OpenAI scoring completed successfully.",
    };

    await createPracticeSessionFromScore(result, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to score practice session." }, { status: 500 });
  }
}
