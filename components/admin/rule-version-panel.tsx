"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/result-display";
import type { PromptVersion, PromptVersionStatus } from "@/lib/types";

export function RuleVersionPanel({ versions }: { versions: PromptVersion[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PromptVersionStatus>("archived");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          status,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Rule version create failed.");
      }

      setName("");
      setDescription("");
      setStatus("archived");
      router.replace("/admin/rules?success=规则版本已新增。");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "规则版本创建失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function setCurrent(id: string) {
    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set-current",
          id,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Set current version failed.");
      }

      router.replace("/admin/rules?success=已切换当前生效版本。");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "设置当前版本失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-form">
      <form className="review-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>版本名称</span>
          <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label className="form-field">
          <span>版本说明</span>
          <textarea
            className="form-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </label>

        <label className="form-field">
          <span>状态</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as PromptVersionStatus)}>
            <option value="archived">归档</option>
            <option value="current">当前生效</option>
          </select>
        </label>

        <div className="submission-panel">
          <p>用于记录规则版本，方便后续关联问题样本与优化方向。</p>
          <button className="action-button primary" disabled={submitting} type="submit">
            {submitting ? "保存中..." : "新增规则版本"}
          </button>
        </div>

        {error ? <p className="message-error">{error}</p> : null}
      </form>

      <div className="timeline">
        {versions.map((version) => (
          <div className="timeline-item" key={version.id}>
            <strong>{version.name}</strong>
            <p>{version.description}</p>
            <p className="inline-note">
              {version.status === "current" ? "✓ 当前生效" : "已归档"} · 更新于 {formatDate(version.updatedAt)}
            </p>
            <button
              className="action-button ghost"
              disabled={submitting || version.status === "current"}
              onClick={() => setCurrent(version.id)}
              type="button"
            >
              {version.status === "current" ? "当前生效版本" : "设为当前版本"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
