import { NextResponse } from "next/server";
import { createBadCase, updateBadCaseStatus } from "@/lib/data/rules";
import type { BadCaseStatus } from "@/lib/types";

function isBadCaseStatus(value: string): value is BadCaseStatus {
  return value === "open" || value === "resolved";
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sessionId?: string;
    promptVersionId?: string;
    reason?: string;
    action?: string;
    id?: string;
    status?: string;
  };

  try {
    if (body.action === "update-status") {
      if (!body.id?.trim()) {
        return NextResponse.json({ error: "id is required." }, { status: 400 });
      }

      if (!body.status || !isBadCaseStatus(body.status)) {
        return NextResponse.json({ error: "status is invalid." }, { status: 400 });
      }

      await updateBadCaseStatus(body.id.trim(), body.status);
      return NextResponse.json({ success: true });
    }

    if (!body.sessionId?.trim()) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    if (!body.reason?.trim()) {
      return NextResponse.json({ error: "reason is required." }, { status: 400 });
    }

    await createBadCase({
      sessionId: body.sessionId.trim(),
      promptVersionId: body.promptVersionId?.trim() || undefined,
      reason: body.reason.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update bad case.",
      },
      { status: 500 },
    );
  }
}
