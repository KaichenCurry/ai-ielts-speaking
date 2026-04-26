"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  canStudentSubmitAppeal,
  formatDate,
  getStudentAppealStatusLabel,
  getStudentReviewStatusLabel,
  getStudentRiskStatusLabel,
} from "@/lib/result-display";
import type { PracticeSession } from "@/lib/types";

export function AppealActionPanel({ session }: { session: PracticeSession }) {
  const router = useRouter();
  const [appealNote, setAppealNote] = useState(session.appealNote || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = canStudentSubmitAppeal(session);
  const isSubmitted = session.appealStatus === "submitted";
  const isReviewed = session.appealStatus === "reviewed";
  const isLocked = !canSubmit;
  const trimmedAppealNote = appealNote.trim();

  const statusDescription = useMemo(() => {
    if (isReviewed) {
      return "这条申诉已经处理完成你可以直接查看下面的处理结论、备注和时间";
    }

    if (isSubmitted) {
      return "你的申诉已经提交成功，当前正在等待人工处理处理完成后，这里会更新最新状态";
    }

    return "如果你觉得转写、评分或反馈有明显问题，可以在这里补充说明并提交一次申诉";
  }, [isReviewed, isSubmitted]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedAppealNote) {
      setError("请先写清楚你认为哪里有问题，再提交申诉");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/submit-appeal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          appealNote: trimmedAppealNote,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Appeal submission failed.");
      }

      setSuccess("申诉已提交页面将刷新，随后你会看到最新状态");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "申诉提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="status-block">
        <strong>当前申诉状态：</strong> {getStudentAppealStatusLabel(session)}
      </div>
      <p className="inline-note">{statusDescription}</p>

      <div className="tag-row">
        <span className="badge badge-neutral">{getStudentRiskStatusLabel(session)}</span>
        <span className="badge badge-neutral">{getStudentReviewStatusLabel(session)}</span>
      </div>

      <label className="form-field">
        <span>申诉说明</span>
        <textarea
          className="form-textarea"
          value={appealNote}
          onChange={(event) => setAppealNote(event.target.value)}
          rows={4}
          placeholder="例如：转写遗漏了关键句子，导致评分和反馈明显不准确"
          disabled={isLocked || submitting}
        />
      </label>

      <div className="submission-panel">
        <p>
          {isReviewed
            ? "这条申诉已经处理完成；如果需要复盘，可以结合结果页和完整记录页一起查看"
            : isSubmitted
              ? "你现在不需要重复提交，等待处理完成即可"
              : "提交后，这条记录会进入人工处理流程处理完成后，你可以在结果页和历史详情页查看更新"}
        </p>
        <button className="action-button primary" disabled={isLocked || submitting} type="submit">
          {submitting ? "提交中..." : isReviewed ? "申诉已处理" : isSubmitted ? "等待处理" : "提交申诉"}
        </button>
      </div>

      {session.appealedAt ? <p className="message-info">提交时间：{formatDate(session.appealedAt)}</p> : null}
      {session.appealUpdatedAt ? <p className="message-info">最近处理时间：{formatDate(session.appealUpdatedAt)}</p> : null}
      {session.reviewedAt ? <p className="message-info">处理完成时间：{formatDate(session.reviewedAt)}</p> : null}
      {session.reviewResult ? <p className="message-success">处理结论：{session.reviewResult}</p> : null}
      {session.reviewNote ? <p className="message-info">处理备注：{session.reviewNote}</p> : null}
      {isReviewed && session.appealNote ? <p className="message-info">你的申诉说明：{session.appealNote}</p> : null}
      {error ? <p className="message-error">{error}</p> : null}
      {success ? <p className="message-success">{success}</p> : null}
    </form>
  );
}
