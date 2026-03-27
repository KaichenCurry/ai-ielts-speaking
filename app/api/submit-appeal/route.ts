import { NextResponse } from "next/server";
import { submitPracticeSessionAppeal } from "@/lib/data/sessions";
import { getServerUser } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: "请先登录后再提交申诉。" }, { status: 401 });
    }

    const body = (await request.json()) as {
      sessionId?: string;
      appealNote?: string;
    };

    if (!body.sessionId?.trim()) {
      return NextResponse.json({ error: "缺少练习记录 ID。" }, { status: 400 });
    }

    if (!body.appealNote?.trim()) {
      return NextResponse.json({ error: "请先填写申诉说明。" }, { status: 400 });
    }

    await submitPracticeSessionAppeal(body.sessionId.trim(), body.appealNote.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to submit appeal.";
    const status =
      message === "Authentication required."
        ? 401
        : message === "Practice session not found."
          ? 404
          : message === "This appeal has already been submitted." ||
              message === "This appeal has already been reviewed." ||
              message === "Appeal state changed. Please refresh and try again."
            ? 409
            : 500;

    const clientMessage =
      status === 401
        ? "请先登录后再提交申诉。"
        : status === 404
          ? "没有找到这条练习记录。"
          : message === "This appeal has already been reviewed."
            ? "这条申诉已经处理完成，不能重复提交。"
            : message === "This appeal has already been submitted."
              ? "这条申诉已经提交过了，请刷新页面查看最新状态。"
              : message === "Appeal state changed. Please refresh and try again."
                ? "这条申诉状态刚刚发生了变化，请刷新页面后再试。"
                : "申诉提交失败，请稍后重试。";

    return NextResponse.json(
      {
        error: clientMessage,
      },
      { status },
    );
  }
}
