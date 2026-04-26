/**
 * Scoring Agent — Generation layer.
 *
 * v1 wraps a single OpenAI Chat call with strict JSON schema. P4 will:
 *   - inject Retrieval-layer citations into the prompt
 *   - record traces (model, prompt version, retrieval hits, latency, cost)
 *   - allow swapping models / prompt versions per-request
 *
 * Boundaries:
 *   - Pure function (no Supabase, no auth, no rate-limit). Callers handle
 *     persistence and access control.
 *   - Inputs are already validated by the route handler.
 */

import type {
  DimensionFeedback,
  LiveScoringResult,
  PronunciationItem,
  ScoreBreakdown,
  ScoringConfidence,
  SpeakingPart,
} from "@/lib/types";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const SCORING_MODEL = "gpt-4o-mini";

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
    strengths: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    priorities: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
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
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: [
    "total", "fluencyCoherence", "lexicalResource", "grammar", "pronunciation", "completeness",
    "summary", "strengths", "priorities", "nextStep", "sampleAnswer", "improvedAnswer",
    "dimensionFeedback", "pronunciationFocus", "sampleAnswerPronunciation",
    "improvedAnswerPronunciation", "riskFlag", "riskReason", "confidence",
  ],
};

function clampScore(value: number) {
  return Math.min(9, Math.max(0, Math.round(value * 2) / 2));
}

export function normalizeScore(score: ScoreBreakdown): ScoreBreakdown {
  return {
    total: clampScore(score.total),
    fluencyCoherence: clampScore(score.fluencyCoherence),
    lexicalResource: clampScore(score.lexicalResource),
    grammar: clampScore(score.grammar),
    pronunciation: clampScore(score.pronunciation),
    completeness: clampScore(score.completeness),
  };
}

export type ScoreSpeakingInput = {
  part: SpeakingPart;
  topicSlug: string;
  topicTitle: string;
  questionId: string;
  questionText: string;
  questionLabel: string;
  questionIndex: number | null;
  transcript: string;
  durationSeconds: number;
  /**
   * Optional: when scoring inside a mock attempt, this id is woven into the
   * generated sessionId so all per-question rows fall under the same attempt
   * for downstream queries.
   */
  sessionIdHint?: string;
};

type RawScoringResponse = {
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
  confidence: ScoringConfidence;
};

const SYSTEM_PROMPT = [
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

function buildUserPrompt(input: ScoreSpeakingInput) {
  return [
    `Speaking part: ${input.part}`,
    `Topic: ${input.topicTitle}`,
    `Question label: ${input.questionLabel}`,
    input.questionIndex !== null ? `Question index: ${input.questionIndex}` : null,
    `Question: ${input.questionText}`,
    `Duration seconds: ${input.durationSeconds}`,
    `Transcript: ${input.transcript}`,
    "Return a total score, sub-scores, detailed summary, strengths, priorities, nextStep, sampleAnswer, improvedAnswer, dimensionFeedback, pronunciationFocus, sampleAnswerPronunciation, improvedAnswerPronunciation, riskFlag, riskReason, and confidence.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function scoreSpeakingAnswer(input: ScoreSpeakingInput): Promise<LiveScoringResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const upstreamResponse = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SCORING_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "ielts_speaking_score", schema: scoringSchema, strict: true },
      },
    }),
  });

  if (!upstreamResponse.ok) {
    const upstreamText = await upstreamResponse.text();
    console.error("OpenAI scoring failed:", upstreamText);
    throw new Error("OpenAI scoring failed.");
  }

  const data = (await upstreamResponse.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Scoring response was empty.");
  }

  let parsed: RawScoringResponse;
  try {
    parsed = JSON.parse(content) as RawScoringResponse;
  } catch {
    throw new Error("Scoring response was not valid JSON.");
  }

  const score = normalizeScore({
    total: parsed.total,
    fluencyCoherence: parsed.fluencyCoherence,
    lexicalResource: parsed.lexicalResource,
    grammar: parsed.grammar,
    pronunciation: parsed.pronunciation,
    completeness: parsed.completeness,
  });

  const sessionId = input.sessionIdHint ?? `${input.part}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const result: LiveScoringResult = {
    sessionId,
    topicSlug: input.topicSlug,
    topicTitle: input.topicTitle,
    questionId: input.questionId,
    questionText: input.questionText,
    questionIndex: input.questionIndex,
    questionLabel: input.questionLabel,
    part: input.part,
    transcript: input.transcript,
    durationSeconds: input.durationSeconds,
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

  return result;
}
