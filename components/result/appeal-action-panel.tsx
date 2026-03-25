"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PracticeSession } from "@/lib/types";

export function AppealActionPanel({ session }: { session: PracticeSession }) {
  const router = useRouter();
  const [appealNote, setAppealNote] = useState(session.appealNote || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isSubmitted = session.appealStatus === "submitted";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
          appealNote,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Appeal submission failed.");
      }

      setSuccess("申诉已提交。页面将刷新以显示最新状态。");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "申诉提交失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="status-block">
        <strong>当前申诉状态：</strong> {session.appealStatus}
      </div>

      <label className="form-field">
        <span>申诉说明</span>
        <textarea
          className="form-textarea"
          value={appealNote}
          onChange={(event) => setAppealNote(event.target.value)}
          rows={4}
          placeholder="请描述你认为评分或反馈存在问题的原因。"
          disabled={isSubmitted || submitting}
        />
      </label>

      <div className="submission-panel">
        <p>
          {isSubmitted
            ? "你的申诉已提交，后台处理后会更新状态。"
            : "提交后，系统会把当前会话标记为 submitted，并同步到后台治理端。"}
        </p>
        <button className="action-button primary" disabled={isSubmitted || submitting} type="submit">
          {submitting ? "提交中..." : isSubmitted ? "已提交申诉" : "提交申诉"}
        </button>
      </div>

      {session.appealedAt ? <p className="message-info">申诉时间: {session.appealedAt}</p> : null}
      {error ? <p className="message-error">{error}</p> : null}
      {success ? <p className="message-success">{success}</p> : null}
    </form>
  );
}
