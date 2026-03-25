"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppealStatus, PracticeSession, ReviewStatus } from "@/lib/types";

export function ReviewActionPanel({ session }: { session: PracticeSession }) {
  const router = useRouter();
  const [riskFlag, setRiskFlag] = useState(session.riskFlag);
  const [riskReason, setRiskReason] = useState(session.riskReason || "");
  const [appealStatus, setAppealStatus] = useState<AppealStatus>(session.appealStatus);
  const [appealNote, setAppealNote] = useState(session.appealNote || "");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(session.reviewStatus);
  const [reviewResult, setReviewResult] = useState(session.reviewResult || "");
  const [reviewNote, setReviewNote] = useState(session.reviewNote || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          riskFlag,
          riskReason,
          appealStatus,
          appealNote,
          reviewStatus,
          reviewResult,
          reviewNote,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Governance update failed.");
      }

      setSuccess("治理结果已保存。正在刷新页面...");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "治理提交失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field checkbox-field">
          <span>标记为风险案例</span>
          <input
            checked={riskFlag}
            onChange={(event) => setRiskFlag(event.target.checked)}
            type="checkbox"
          />
        </label>

        <label className="form-field">
          <span>申诉状态</span>
          <select value={appealStatus} onChange={(event) => setAppealStatus(event.target.value as AppealStatus)}>
            <option value="none">none</option>
            <option value="submitted">submitted</option>
            <option value="reviewed">reviewed</option>
          </select>
        </label>

        <label className="form-field">
          <span>复核状态</span>
          <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}>
            <option value="pending">pending</option>
            <option value="flagged">flagged</option>
            <option value="completed">completed</option>
          </select>
        </label>
      </div>

      <label className="form-field">
        <span>风险原因</span>
        <textarea
          className="form-textarea"
          value={riskReason}
          onChange={(event) => setRiskReason(event.target.value)}
          rows={3}
          placeholder="如果标记异常，请填写判断原因。"
        />
      </label>

      <label className="form-field">
        <span>申诉处理备注</span>
        <textarea
          className="form-textarea"
          value={appealNote}
          onChange={(event) => setAppealNote(event.target.value)}
          rows={3}
          placeholder="记录当前申诉处理说明。"
        />
      </label>

      <label className="form-field">
        <span>复核结论</span>
        <textarea
          className="form-textarea"
          value={reviewResult}
          onChange={(event) => setReviewResult(event.target.value)}
          rows={3}
          placeholder="填写这次人工复核的结论。"
        />
      </label>

      <label className="form-field">
        <span>复核备注</span>
        <textarea
          className="form-textarea"
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={4}
          placeholder="记录判断依据、后续建议或需要跟进的点。"
        />
      </label>

      <div className="submission-panel">
        <p>提交后会同步更新数据库中的申诉状态、风险标记、复核状态和人工备注。</p>
        <button className="action-button primary" disabled={submitting} type="submit">
          {submitting ? "保存中..." : "保存治理结果"}
        </button>
      </div>

      {error ? <p className="message-error">{error}</p> : null}
      {success ? <p className="message-success">{success}</p> : null}
    </form>
  );
}
