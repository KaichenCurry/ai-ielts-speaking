"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/result-display";
import type { BadCaseItem, PromptVersion, PracticeSession } from "@/lib/types";

function getBadCaseStatusLabel(status: BadCaseItem["status"]) {
  return status === "resolved" ? "已关闭" : "待处理";
}

function getBadCaseTone(status: BadCaseItem["status"]): "warn" | "ok" {
  return status === "resolved" ? "ok" : "warn";
}

export function BadCasePanel({
  session,
  promptVersions,
  badCases,
}: {
  session: PracticeSession;
  promptVersions: PromptVersion[];
  badCases: BadCaseItem[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [promptVersionId, setPromptVersionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/bad-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          promptVersionId,
          reason,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Bad case create failed.");
      }

      setReason("");
      setPromptVersionId("");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Bad case 创建失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveBadCase(id: string) {
    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/bad-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-status",
          id,
          status: "resolved",
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Bad case update failed.");
      }

      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Bad case 状态更新失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-form">
      <div className="admin-session-summary-row">
        <div className="kpi-card">
          <p className="kpi-card-value">{badCases.length}</p>
          <p className="kpi-card-label">累计样本</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-card-value">{badCases.filter((item) => item.status === "open").length}</p>
          <p className="kpi-card-label">待处理</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-card-value">{badCases.filter((item) => item.status === "resolved").length}</p>
          <p className="kpi-card-label">已关闭</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-card-value">{promptVersions.length}</p>
          <p className="kpi-card-label">可关联版本</p>
        </div>
      </div>

      <p className="inline-note">
        把这条会话里值得回看和复现的问题沉淀下来，后续切换规则版本或复盘误判时会更方便。
      </p>

      <form className="review-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>问题原因</span>
          <textarea
            className="form-textarea"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="例如：分数偏高、发音误判、完整度判断不稳定。"
          />
        </label>

        <label className="form-field">
          <span>关联规则版本（可选）</span>
          <select value={promptVersionId} onChange={(event) => setPromptVersionId(event.target.value)}>
            <option value="">不关联版本</option>
            {promptVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.name}
              </option>
            ))}
          </select>
        </label>

        <div className="submission-panel">
          <p>保存后会新增一条 bad case 记录，方便后续持续跟踪和关闭。</p>
          <button className="action-button primary" disabled={submitting} type="submit">
            {submitting ? "保存中..." : "标记为 bad case"}
          </button>
        </div>

        {error ? <p className="message-error">{error}</p> : null}
      </form>

      <div className="timeline">
        {badCases.length === 0 ? (
          <div className="timeline-item">当前这条会话还没有沉淀 bad case。</div>
        ) : (
          badCases.map((item) => (
            <div className="timeline-item" key={item.id}>
              <div className="tag-row" style={{ marginBottom: 10 }}>
                <Badge tone={getBadCaseTone(item.status)}>{getBadCaseStatusLabel(item.status)}</Badge>
                <Badge>{item.promptVersionId ? "已关联版本" : "未关联版本"}</Badge>
              </div>
              <p>{item.reason}</p>
              <p className="inline-note" style={{ marginTop: 8 }}>
                关联版本：{item.promptVersionId || "未关联"}
              </p>
              <p className="inline-note">创建时间：{formatDate(item.createdAt)}</p>
              <button
                className="action-button ghost"
                disabled={submitting || item.status === "resolved"}
                onClick={() => resolveBadCase(item.id)}
                style={{ marginTop: 12 }}
                type="button"
              >
                {item.status === "resolved" ? "已关闭" : "标记为已关闭"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
