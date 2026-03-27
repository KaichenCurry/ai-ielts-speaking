"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/result-display";
import type { AppealStatus, PracticeSession, ReviewStatus } from "@/lib/types";

function getAppealLabel(status: AppealStatus) {
  if (status === "submitted") return "待处理";
  if (status === "reviewed") return "已处理";
  return "无申诉";
}

function getAppealTone(status: AppealStatus): "neutral" | "warn" | "ok" {
  if (status === "submitted") return "warn";
  if (status === "reviewed") return "ok";
  return "neutral";
}

function getReviewLabel(status: ReviewStatus) {
  if (status === "flagged") return "已标记";
  if (status === "completed") return "已完成";
  return "待复核";
}

function getReviewTone(status: ReviewStatus): "neutral" | "warn" | "ok" {
  if (status === "flagged") return "warn";
  if (status === "completed") return "ok";
  return "neutral";
}

function formatOptionalDate(dateStr?: string | null) {
  return dateStr ? formatDate(dateStr) : "—";
}

export function ReviewActionPanel({ session, userId }: { session: PracticeSession; userId: string }) {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

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

      router.replace(`/admin/students/${userId}/${session.id}?success=治理结果已保存。`);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "治理提交失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="admin-session-summary-row">
        <div className="kpi-card">
          <p className="kpi-card-value">{riskFlag ? "已标记" : "正常"}</p>
          <p className="kpi-card-label">风险状态</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-card-value">{getAppealLabel(appealStatus)}</p>
          <p className="kpi-card-label">申诉进度</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-card-value">{getReviewLabel(reviewStatus)}</p>
          <p className="kpi-card-label">复核进度</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-card-value">{formatOptionalDate(session.reviewedAt ?? session.appealUpdatedAt ?? session.appealedAt)}</p>
          <p className="kpi-card-label">最近处理</p>
        </div>
      </div>

      <div className="tag-row">
        <Badge tone={riskFlag ? "warn" : "ok"}>{riskFlag ? "异常候选" : "当前正常"}</Badge>
        <Badge tone={getAppealTone(appealStatus)}>申诉：{getAppealLabel(appealStatus)}</Badge>
        <Badge tone={getReviewTone(reviewStatus)}>复核：{getReviewLabel(reviewStatus)}</Badge>
      </div>

      <p className="inline-note">
        {appealStatus === "submitted"
          ? "当前有学生申诉待处理，建议补充处理说明后再保存。"
          : reviewStatus === "completed"
            ? "这条会话已人工完成复核，可继续补充结论和备注做归档。"
            : riskFlag
              ? "已标记为异常候选，请在下方写清判断依据，方便后续回看。"
              : "如果需要升级治理动作，可直接在下方同步更新风险、申诉和复核状态。"}
      </p>

      <div className="form-grid">
        <label className="form-field checkbox-field">
          <span>标记为异常候选</span>
          <input
            checked={riskFlag}
            onChange={(event) => setRiskFlag(event.target.checked)}
            type="checkbox"
          />
        </label>

        <label className="form-field">
          <span>申诉状态</span>
          <select value={appealStatus} onChange={(event) => setAppealStatus(event.target.value as AppealStatus)}>
            <option value="none">无申诉</option>
            <option value="submitted">已提交待处理</option>
            <option value="reviewed">已处理完成</option>
          </select>
        </label>

        <label className="form-field">
          <span>复核状态</span>
          <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}>
            <option value="pending">待复核</option>
            <option value="flagged">已标记处理中</option>
            <option value="completed">人工已完成</option>
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
          placeholder="例如：疑似模板化回答、转写异常、评分与答题内容不一致。"
        />
      </label>

      <label className="form-field">
        <span>申诉处理备注</span>
        <textarea
          className="form-textarea"
          value={appealNote}
          onChange={(event) => setAppealNote(event.target.value)}
          rows={3}
          placeholder="记录当前申诉处理说明，便于后续回看。"
        />
      </label>

      <label className="form-field">
        <span>复核结论</span>
        <textarea
          className="form-textarea"
          value={reviewResult}
          onChange={(event) => setReviewResult(event.target.value)}
          rows={3}
          placeholder="填写人工复核后的最终判断。"
        />
      </label>

      <label className="form-field">
        <span>复核备注</span>
        <textarea
          className="form-textarea"
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={4}
          placeholder="记录判断依据、后续建议或需要继续跟进的点。"
        />
      </label>

      <div className="submission-panel">
        <p>保存后会同步更新数据库中的风险标记、申诉状态、复核状态与人工处理记录。</p>
        <button className="action-button primary" disabled={submitting} type="submit">
          {submitting ? "保存中..." : "保存治理结果"}
        </button>
      </div>

      {error ? <p className="message-error">{error}</p> : null}
    </form>
  );
}
