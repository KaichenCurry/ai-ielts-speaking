import { NextResponse } from "next/server";
import { createBadCase, updateBadCaseStatus } from "@/lib/data/rules";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import type { BadCaseStatus } from "@/lib/types";

function isBadCaseStatus(value: string): value is BadCaseStatus {
  return value === "open" || value === "resolved";
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
      promptVersionId?: string;
      reason?: string;
      action?: string;
      id?: string;
      status?: string;
    };

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
    const message = error instanceof Error ? error.message : "Failed to update bad case.";
    const status = message === "Authentication required." ? 401 : message === "Admin access required." ? 403 : 500;
    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
