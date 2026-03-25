import { NextResponse } from "next/server";
import { submitPracticeSessionAppeal } from "@/lib/data/sessions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sessionId?: string;
    appealNote?: string;
  };

  if (!body.sessionId?.trim()) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  if (!body.appealNote?.trim()) {
    return NextResponse.json({ error: "appealNote is required." }, { status: 400 });
  }

  try {
    await submitPracticeSessionAppeal(body.sessionId.trim(), body.appealNote.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to submit appeal.",
      },
      { status: 500 },
    );
  }
}
