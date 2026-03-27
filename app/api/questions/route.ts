import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createCustomQuestion, deleteCustomQuestion, updateCustomQuestion } from "@/lib/data/questions";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import type { CreateQuestionInput, SpeakingPart, QuestionDifficulty, UpdateQuestionInput } from "@/lib/types";

export const runtime = "nodejs";

type ActionPayload =
  | { action: "create"; part: string; topic: string; difficulty: string; question: string; helper: string; isActive: boolean }
  | { action: "update"; id: string; part: string; topic: string; difficulty: string; question: string; helper: string; isActive: boolean }
  | { action: "delete"; id: string };

function isValidPart(part: string): part is SpeakingPart {
  return ["part1", "part2", "part3"].includes(part);
}

function isValidDifficulty(difficulty: string): difficulty is QuestionDifficulty {
  return ["easy", "medium", "hard"].includes(difficulty);
}

function revalidateQuestionPaths(questionId?: string) {
  revalidatePath("/admin/questions");
  revalidatePath("/practice");
  revalidatePath("/practice/part1");
  revalidatePath("/practice/part23");

  if (questionId) {
    revalidatePath(`/admin/questions/${questionId}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as ActionPayload;

    if (body.action === "create") {
      const { part, topic, difficulty, question, helper, isActive } = body;

      if (!part || !isValidPart(part)) {
        return NextResponse.json({ error: "part 字段无效" }, { status: 400 });
      }

      if (!difficulty || !isValidDifficulty(difficulty)) {
        return NextResponse.json({ error: "difficulty 字段无效" }, { status: 400 });
      }

      if (!topic?.trim() || !question?.trim()) {
        return NextResponse.json({ error: "topic 和 question 不能为空" }, { status: 400 });
      }

      const input: CreateQuestionInput = {
        part,
        topic: topic.trim(),
        difficulty,
        question: question.trim(),
        helper: helper?.trim() || "",
        isActive: Boolean(isActive),
      };

      const id = await createCustomQuestion(input);
      revalidateQuestionPaths(id);
      return NextResponse.json({ success: true, id });
    }

    if (body.action === "update") {
      const { id, part, topic, difficulty, question, helper, isActive } = body;

      if (!id) {
        return NextResponse.json({ error: "id 字段缺失" }, { status: 400 });
      }

      if (!part || !isValidPart(part)) {
        return NextResponse.json({ error: "part 字段无效" }, { status: 400 });
      }

      if (!difficulty || !isValidDifficulty(difficulty)) {
        return NextResponse.json({ error: "difficulty 字段无效" }, { status: 400 });
      }

      if (!topic?.trim() || !question?.trim()) {
        return NextResponse.json({ error: "topic 和 question 不能为空" }, { status: 400 });
      }

      const input: UpdateQuestionInput = {
        id,
        part,
        topic: topic.trim(),
        difficulty,
        question: question.trim(),
        helper: helper?.trim() || "",
        isActive: Boolean(isActive),
      };

      await updateCustomQuestion(input);
      revalidateQuestionPaths(id);
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      const { id } = body;

      if (!id) {
        return NextResponse.json({ error: "id 字段缺失" }, { status: 400 });
      }

      await deleteCustomQuestion(id);
      revalidateQuestionPaths(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
