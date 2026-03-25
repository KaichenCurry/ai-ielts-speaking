"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BadCaseItem, PromptVersion, PracticeSession } from "@/lib/types";

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
      <form className="review-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>问题原因</span>
          <textarea
            className="form-textarea"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="记录为什么这条会话值得沉淀为 bad case。"
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
          <p>把当前问题样本沉淀下来，方便后续规则优化和版本回看。</p>
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
              <strong>{item.status}</strong>
              <p>{item.reason}</p>
              <p className="inline-note">关联版本：{item.promptVersionId || "未关联"}</p>
              <p className="inline-note">创建时间：{item.createdAt}</p>
              <button
                className="action-button ghost"
                disabled={submitting || item.status === "resolved"}
                onClick={() => resolveBadCase(item.id)}
                type="button"
              >
                {item.status === "resolved" ? "已关闭" : "标记为 resolved"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
