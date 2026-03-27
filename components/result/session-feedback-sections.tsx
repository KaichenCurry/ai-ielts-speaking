import type { DimensionFeedback, PracticeSession, PronunciationItem } from "@/lib/types";
import { DIMENSION_LABELS, scoreClass } from "@/lib/result-display";

export function ScoreGrid({ score }: { score: PracticeSession["score"] }) {
  return (
    <div className="score-grid">
      <div className={`score-box ${scoreClass(score.total)}`}>
        <span>总分</span>
        <strong>{score.total}</strong>
      </div>
      <div className={`score-box ${scoreClass(score.fluencyCoherence)}`}>
        <span>流利度</span>
        <strong>{score.fluencyCoherence}</strong>
      </div>
      <div className={`score-box ${scoreClass(score.lexicalResource)}`}>
        <span>词汇</span>
        <strong>{score.lexicalResource}</strong>
      </div>
      <div className={`score-box ${scoreClass(score.grammar)}`}>
        <span>语法</span>
        <strong>{score.grammar}</strong>
      </div>
      <div className={`score-box ${scoreClass(score.pronunciation)}`}>
        <span>发音</span>
        <strong>{score.pronunciation}</strong>
      </div>
      <div className={`score-box ${scoreClass(score.completeness)}`}>
        <span>完整度</span>
        <strong>{score.completeness}</strong>
      </div>
    </div>
  );
}

export function CoachSummarySection({ feedback }: { feedback: PracticeSession["feedback"] }) {
  if (!feedback.summary && !feedback.nextStep) return null;

  return (
    <>
      {feedback.summary ? <p className="coach-summary">{feedback.summary}</p> : null}
      {feedback.nextStep ? (
        <div className="next-step-block">
          <span className="next-step-label">下一步建议</span>
          <p>{feedback.nextStep}</p>
        </div>
      ) : null}
    </>
  );
}

export function StrengthsPrioritiesSection({ feedback }: { feedback: PracticeSession["feedback"] }) {
  if (!feedback.strengths?.length && !feedback.priorities?.length) return null;

  return (
    <>
      {feedback.strengths?.length ? (
        <div>
          <h4>优点</h4>
          <ul className="feedback-list strengths">
            {feedback.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {feedback.priorities?.length ? (
        <div>
          <h4>优先改进点</h4>
          <ul className="feedback-list priorities">
            {feedback.priorities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export function DimensionFeedbackSection({ items }: { items?: DimensionFeedback[] }) {
  if (!items?.length) return null;

  return (
    <div className="dimension-feedback-list">
      {items.map((item) => (
        <article className="dimension-feedback-item" key={item.dimension}>
          <div className="dimension-label">{DIMENSION_LABELS[item.dimension] ?? item.dimension}</div>
          <p className="dimension-coach-note">{item.coachNote}</p>
          <p className="dimension-zh-note">{item.zhNote}</p>
        </article>
      ))}
    </div>
  );
}

export function PronunciationSection({ items, title }: { items?: PronunciationItem[]; title: string }) {
  if (!items?.length) return null;

  return (
    <div className="pronunciation-block">
      {title ? <h4 className="pronunciation-title">{title}</h4> : null}
      <div className="pronunciation-grid">
        {items.map((item) => (
          <div className="pronunciation-card" key={`${item.text}-${item.ipa}`}>
            <span className="pron-word">{item.text}</span>
            <span className="pron-ipa">{item.ipa}</span>
            <span className="pron-tip">{item.tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnswerBlock({
  answer,
  pronunciation,
  title,
  className,
}: {
  answer?: string;
  pronunciation?: PronunciationItem[];
  title: string;
  className?: string;
}) {
  if (!answer) return null;

  return (
    <>
      <div className={`answer-block ${className ?? ""}`.trim()}>
        {title ? <h4>{title}</h4> : null}
        <p>{answer}</p>
      </div>
      {pronunciation?.length ? <PronunciationSection items={pronunciation} title="发音重点" /> : null}
    </>
  );
}
