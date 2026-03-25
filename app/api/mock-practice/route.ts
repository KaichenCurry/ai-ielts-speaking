import { NextResponse } from "next/server";
import { buildMockPracticeResponse, getQuestionConfig } from "@/lib/mock-data";
import type { SpeakingPart } from "@/lib/types";

function isSpeakingPart(value: string): value is SpeakingPart {
  return value === "part1" || value === "part2" || value === "part3";
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    part?: string;
    transcript?: string;
    durationSeconds?: number;
  };

  if (!body.part || !isSpeakingPart(body.part) || !getQuestionConfig(body.part)) {
    return NextResponse.json({ error: "Invalid speaking part." }, { status: 400 });
  }

  const normalizedTranscript = body.transcript?.trim() ?? "";
  const response = buildMockPracticeResponse(body.part, normalizedTranscript);

  return NextResponse.json({
    ...response,
    durationSeconds: body.durationSeconds ?? 0,
  });
}
