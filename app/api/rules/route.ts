import { NextResponse } from "next/server";
import { createPromptVersion, setCurrentPromptVersion } from "@/lib/data/rules";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import type { PromptVersionStatus } from "@/lib/types";

function isPromptVersionStatus(value: string): value is PromptVersionStatus {
  return value === "current" || value === "archived";
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
      name?: string;
      description?: string;
      status?: string;
      action?: string;
      id?: string;
    };

    if (body.action === "set-current") {
      if (!body.id?.trim()) {
        return NextResponse.json({ error: "id is required." }, { status: 400 });
      }

      await setCurrentPromptVersion(body.id.trim());
      return NextResponse.json({ success: true });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    if (!body.description?.trim()) {
      return NextResponse.json({ error: "description is required." }, { status: 400 });
    }

    if (!body.status || !isPromptVersionStatus(body.status)) {
      return NextResponse.json({ error: "status is invalid." }, { status: 400 });
    }

    await createPromptVersion({
      name: body.name.trim(),
      description: body.description.trim(),
      status: body.status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update prompt versions.";
    const status = message === "Authentication required." ? 401 : message === "Admin access required." ? 403 : 500;
    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
