"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Question, QuestionDifficulty, SpeakingPart } from "@/lib/types";

type QuestionEditPanelProps = {
  question: Question;
};

export function QuestionEditPanel({ question }: QuestionEditPanelProps) {
  const router = useRouter();
  const [part, setPart] = useState<SpeakingPart>(question.part);
  const [topic, setTopic] = useState(question.topic);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(question.difficulty);
  const [questionText, setQuestionText] = useState(question.question);
  const [helper, setHelper] = useState(question.helper);
  const [isActive, setIsActive] = useState(question.isActive);
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
          action: "update",
          id: question.id,
          part,
          topic,
          difficulty,
          question: questionText,
          helper,
          isActive,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "题目更新失败。");
      }

      router.replace(`/admin/questions/${question.id}?success=题目已保存。`);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "题目更新失败。");
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
          <span>启用状态</span>
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
        <p>保存后将立即更新数据库，并在练习流中生效。</p>
        <button className="action-button primary" disabled={submitting} type="submit">
          {submitting ? "保存中..." : "保存修改"}
        </button>
      </div>

      {error ? <p className="message-error">{error}</p> : null}
    </form>
  );
}
