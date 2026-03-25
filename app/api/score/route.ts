import { NextResponse } from "next/server";
import { createPracticeSessionFromScore } from "@/lib/data/sessions";
import { getQuestionConfig } from "@/lib/mock-data";
import type { LiveScoringResult, ScoreBreakdown, SpeakingPart } from "@/lib/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const SCORING_MODEL = "gpt-4.1-mini";

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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Add it to your local environment before using scoring." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    part?: string;
    transcript?: string;
    durationSeconds?: number;
  };

  if (!body.part || !isSpeakingPart(body.part)) {
    return NextResponse.json({ error: "Invalid speaking part." }, { status: 400 });
  }

  const config = getQuestionConfig(body.part);
  const transcript = body.transcript?.trim();

  if (!config || !transcript) {
    return NextResponse.json({ error: "Question config and transcript are required." }, { status: 400 });
  }

  const systemPrompt = [
    "You are an IELTS speaking evaluation assistant for an education product.",
    "Evaluate the transcript conservatively and return only valid structured JSON.",
    "Use five dimensions: fluencyCoherence, lexicalResource, grammar, pronunciation, completeness.",
    "Scores must be in 0.0 to 9.0 increments of 0.5.",
    "pronunciation should be inferred carefully from transcript evidence only, so lower confidence when the transcript does not strongly support it.",
    "If the answer is too short, incomplete, vague, or likely unreliable, set riskFlag=true and explain why.",
    "Keep the summary actionable and coach-like. Strengths and priorities should be concrete, not generic.",
  ].join(" ");

  const userPrompt = [
    `Speaking part: ${body.part}`,
    `Question: ${config.question}`,
    `Duration seconds: ${body.durationSeconds ?? 0}`,
    `Transcript: ${transcript}`,
    "Return a total score, sub-scores, summary, strengths, priorities, nextStep, sampleAnswer, riskFlag, riskReason, and confidence.",
  ].join("\n");

  const upstreamResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SCORING_MODEL,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
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
    output_text?: string;
  };

  if (!data.output_text) {
    return NextResponse.json({ error: "Scoring response was empty." }, { status: 502 });
  }

  const parsed = JSON.parse(data.output_text) as {
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
    riskFlag: boolean;
    riskReason: string;
    confidence: "low" | "medium" | "high";
  };

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
    part: body.part,
    question: config.question,
    transcript,
    durationSeconds: body.durationSeconds ?? 0,
    score,
    feedback: {
      summary: parsed.summary,
      strengths: parsed.strengths,
      priorities: parsed.priorities,
      nextStep: parsed.nextStep,
      sampleAnswer: parsed.sampleAnswer,
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

  await createPracticeSessionFromScore(result);

  return NextResponse.json(result);
}
