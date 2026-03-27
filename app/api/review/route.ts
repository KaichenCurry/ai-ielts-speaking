import { NextResponse } from "next/server";
import { updatePracticeSessionGovernance } from "@/lib/data/sessions";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import type { AppealStatus, ReviewStatus } from "@/lib/types";

function isReviewStatus(value: string): value is ReviewStatus {
  return value === "pending" || value === "flagged" || value === "completed";
}

function isAppealStatus(value: string): value is AppealStatus {
  return value === "none" || value === "submitted" || value === "reviewed";
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = (await request.json()) as {
      sessionId?: string;
      riskFlag?: boolean;
      riskReason?: string;
      appealStatus?: string;
      appealNote?: string;
      reviewStatus?: string;
      reviewResult?: string;
      reviewNote?: string;
    };

    if (!body.sessionId?.trim()) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    if (!body.reviewStatus || !isReviewStatus(body.reviewStatus)) {
      return NextResponse.json({ error: "reviewStatus is invalid." }, { status: 400 });
    }

    if (!body.appealStatus || !isAppealStatus(body.appealStatus)) {
      return NextResponse.json({ error: "appealStatus is invalid." }, { status: 400 });
    }

    await updatePracticeSessionGovernance({
      sessionId: body.sessionId.trim(),
      riskFlag: Boolean(body.riskFlag),
      riskReason: body.riskReason?.trim() || "",
      appealStatus: body.appealStatus,
      appealNote: body.appealNote?.trim() || "",
      reviewStatus: body.reviewStatus,
      reviewResult: body.reviewResult?.trim() || "",
      reviewNote: body.reviewNote?.trim() || "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update governance state.";
    const status = message === "Authentication required." ? 401 : message === "Admin access required." ? 403 : message === "Practice session not found." ? 404 : 500;
    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
