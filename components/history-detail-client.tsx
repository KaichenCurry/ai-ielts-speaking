"use client";

import { useEffect, useMemo, useState } from "react";
import { ScoreBars } from "@/components/charts/score-bars";
import { SectionCard } from "@/components/page-shell";
import { AppealActionPanel } from "@/components/result/appeal-action-panel";
import {
  AnswerBlock,
  CoachSummarySection,
  DimensionFeedbackSection,
  PronunciationSection,
} from "@/components/result/session-feedback-sections";
import { Badge } from "@/components/ui";
import {
  formatDate,
  formatPartLabel,
  getStudentAppealStatusLabel,
  getStudentReviewStatusLabel,
  getStudentRiskStatusLabel,
  scoreClass,
} from "@/lib/result-display";
import { getStoredPracticeSession } from "@/lib/result-storage";
import type { PracticeSession } from "@/lib/types";

type HistoryDetailClientProps = {
  fallbackSession: PracticeSession | null;
  sessionId: string;
};

function getStatusTone(session: PracticeSession): "neutral" | "warn" | "ok" {
  if (session.reviewStatus === "completed") {
    return "ok";
  }

  if (session.reviewStatus === "flagged" || session.riskFlag) {
    return "warn";
  }

  return "neutral";
}

function getAppealTone(session: PracticeSession): "neutral" | "warn" | "ok" {
  if (session.appealStatus === "submitted") {
    return "warn";
  }

  if (session.appealStatus === "reviewed") {
    return "ok";
  }

  return "neutral";
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function renderFeedbackList(items: string[] | undefined, emptyText: string) {
  if (!items?.length) {
    return <p className="inline-note">{emptyText}</p>;
  }

  return (
    <ul className="feedback-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function HistoryDetailClient({ fallbackSession, sessionId }: HistoryDetailClientProps) {
  const [localSession, setLocalSession] = useState<PracticeSession | null>(null);

  useEffect(() => {
    async function loadLocalSession() {
      setLocalSession(await getStoredPracticeSession(sessionId));
    }

    void loadLocalSession();
  }, [sessionId]);

  const session = useMemo(() => fallbackSession || localSession, [fallbackSession, localSession]);

  if (!session) {
    return (
      <div className="result-layout">
        <SectionCard title="未找到练习记录">
          <p>当前没有查到这次练习的保存结果，也没有浏览器里的本地记录</p>
          <p className="inline-note">请先完成一次练习，或返回历史记录页查看可用会话</p>
        </SectionCard>
      </div>
    );
  }

  const isLocalOnly = Boolean(localSession && !fallbackSession);

  return (
    <div className="result-layout">
      <div className="result-two-col">
        <SectionCard title="这次练习的完整记录">
          <p><strong>Topic：</strong>{session.topicTitle}</p>
          <p><strong>题目标识：</strong>{session.questionLabel}</p>
          <p><strong>练习模块：</strong>{formatPartLabel(session.part)}</p>
          <p><strong>练习时间：</strong>{formatDate(session.createdAt)}</p>
          {session.durationSeconds > 0 ? <p><strong>录音时长：</strong>{session.durationSeconds}s</p> : null}
          <div className="tag-row" style={{ marginTop: 12 }}>
            {isLocalOnly ? <Badge>仅当前浏览器可见</Badge> : <Badge tone="ok">已保存到历史</Badge>}
            <Badge tone={session.riskFlag ? "warn" : "ok"}>{getStudentRiskStatusLabel(session)}</Badge>
            <Badge tone={getAppealTone(session)}>{getStudentAppealStatusLabel(session)}</Badge>
            <Badge tone={getStatusTone(session)}>{getStudentReviewStatusLabel(session)}</Badge>
          </div>
          {session.riskReason ? <p className="message-info" style={{ marginTop: 12 }}>系统提示：这次结果触发了人工关注，原因是 {session.riskReason}</p> : null}
          {session.appealedAt ? <p style={{ marginTop: 12 }}><strong>申诉提交时间：</strong>{formatDate(session.appealedAt)}</p> : null}
          {session.appealUpdatedAt ? <p><strong>最近处理时间：</strong>{formatDate(session.appealUpdatedAt)}</p> : null}
          {session.reviewedAt ? <p><strong>人工查看完成时间：</strong>{formatDate(session.reviewedAt)}</p> : null}
          {session.reviewResult ? <p className="message-success" style={{ marginTop: 12 }}>处理结论：{session.reviewResult}</p> : null}
          {session.reviewNote ? <p className="message-info">处理备注：{session.reviewNote}</p> : null}
          {session.appealStatus === "reviewed" && session.appealNote ? <p className="message-info">你的申诉说明：{session.appealNote}</p> : null}
          <p style={{ marginTop: 16 }}><strong>原题目：</strong></p>
          <p>{session.questionText}</p>
        </SectionCard>

        <SectionCard title="分数展示">
          <div className="score-hero">
            <div className={`score-hero-number ${scoreClass(session.score.total)}`}>{formatScore(session.score.total)}</div>
            <p className="score-hero-label">本次总分 / 9</p>
            <div className="score-hero-track" aria-hidden="true">
              <div className={`score-hero-fill ${scoreClass(session.score.total)}`} style={{ width: `${(session.score.total / 9) * 100}%` }} />
            </div>
            <div className="meta-row score-hero-meta">
              <Badge>{formatPartLabel(session.part)}</Badge>
              {session.durationSeconds > 0 ? <Badge>{`录音时长 ${session.durationSeconds}s`}</Badge> : null}
              <Badge tone={session.riskFlag ? "warn" : "ok"}>{getStudentRiskStatusLabel(session)}</Badge>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <ScoreBars score={session.score} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="你的回答转写">
        <p className="inline-note" style={{ marginBottom: 8 }}>
          这是系统根据你的录音整理出的文本，下面的评分与反馈都基于这份转写        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>{session.transcript}</p>
      </SectionCard>

      <SectionCard title="教练式总结">
        <CoachSummarySection feedback={session.feedback} />
      </SectionCard>

      <div className="result-two-col">
        <SectionCard title="这次回答的优点">
          {renderFeedbackList(session.feedback.strengths, "这次还没有提炼出明确优点")}
        </SectionCard>

        <SectionCard title="优先改进点">
          {renderFeedbackList(session.feedback.priorities, "这次还没有生成优先改进点")}
        </SectionCard>
      </div>

      {session.feedback.dimensionFeedback?.length ? (
        <SectionCard title="各维度详细点评">
          <DimensionFeedbackSection items={session.feedback.dimensionFeedback} />
        </SectionCard>
      ) : null}

      <div className="result-two-col">
        {session.feedback.pronunciationFocus?.length ? (
          <SectionCard title="本次回答发音重点">
            <PronunciationSection items={session.feedback.pronunciationFocus} title="" />
          </SectionCard>
        ) : (
          <SectionCard title="本次回答发音重点">
            <p className="inline-note">这次没有单独生成发音重点</p>
          </SectionCard>
        )}

        {session.feedback.improvedAnswer ? (
          <SectionCard title="基于你的回答 — 加强版改进答案">
            <AnswerBlock
              answer={session.feedback.improvedAnswer}
              pronunciation={session.feedback.improvedAnswerPronunciation}
              title=""
              className="improved"
            />
          </SectionCard>
        ) : (
          <SectionCard title="基于你的回答 — 加强版改进答案">
            <p className="inline-note">这次还没有生成改进版答案</p>
          </SectionCard>
        )}
      </div>

      {session.feedback.sampleAnswer ? (
        <SectionCard title="高分示范答案（Band 7-8）">
          <AnswerBlock
            answer={session.feedback.sampleAnswer}
            pronunciation={session.feedback.sampleAnswerPronunciation}
            title=""
            className="sample"
          />
        </SectionCard>
      ) : null}

      <SectionCard title="提交申诉">
        {fallbackSession ? (
          <AppealActionPanel session={fallbackSession} />
        ) : (
          <p className="inline-note">当前展示的是仅保存在浏览器中的即时结果，只有保存到历史后的记录才支持申诉</p>
        )}
      </SectionCard>
    </div>
  );
}
