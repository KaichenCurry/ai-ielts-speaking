"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuestionDifficulty, SpeakingPart } from "@/lib/types";

export function QuestionCreatePanel() {
  const router = useRouter();
  const [part, setPart] = useState<SpeakingPart>("part1");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("easy");
  const [questionText, setQuestionText] = useState("");
  const [helper, setHelper] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic.trim() || !questionText.trim()) {
      setError("Topic 和题目内容不能为空。");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          part,
          topic,
          difficulty,
          question: questionText,
          helper,
          isActive,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; id?: string; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "题目创建失败。");
      }

      if (payload.id) {
        router.push(`/admin/questions/${payload.id}?success=题目已创建，可在此继续编辑。`);
      } else {
        router.push("/admin/questions?success=题目已创建");
      }
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "题目创建失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field">
          <span>Part</span>
          <select value={part} onChange={(event) => setPart(event.target.value as SpeakingPart)}>
            <option value="part1">Part 1</option>
            <option value="part2">Part 2</option>
            <option value="part3">Part 3</option>
          </select>
        </label>

        <label className="form-field">
          <span>难度</span>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </label>

        <label className="form-field checkbox-field">
          <span>创建后立即启用</span>
          <input
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            type="checkbox"
          />
        </label>
      </div>

      <label className="form-field">
        <span>Topic（话题）</span>
        <input
          className="form-input"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="例：Work and Career"
          required
        />
      </label>

      <label className="form-field">
        <span>题目内容</span>
        <textarea
          className="form-textarea"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          rows={4}
          placeholder="填写题目原文，如：Do you work or study?"
          required
        />
      </label>

      <label className="form-field">
        <span>提示语（Helper，可选）</span>
        <textarea
          className="form-textarea"
          value={helper}
          onChange={(event) => setHelper(event.target.value)}
          rows={3}
          placeholder="可留空，或填写给练习者的额外提示。"
        />
      </label>

      <div className="submission-panel">
        <p>提交后将以 <code>custom-</code> 前缀写入 Supabase，并立即在练习流中可用。</p>
        <button className="action-button primary" disabled={submitting} type="submit">
          {submitting ? "创建中..." : "创建题目"}
        </button>
      </div>

      {error ? <p className="message-error">{error}</p> : null}
    </form>
  );
}
