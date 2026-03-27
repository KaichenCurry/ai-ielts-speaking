"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/charts/kpi-card";
import { RadarChart } from "@/components/charts/radar-chart";
import { ScoreBars } from "@/components/charts/score-bars";
import { TrendLine } from "@/components/charts/trend-line";
import { SectionCard } from "@/components/page-shell";
import { AppealActionPanel } from "@/components/result/appeal-action-panel";
import {
  AnswerBlock,
  CoachSummarySection,
  DimensionFeedbackSection,
  PronunciationSection,
} from "@/components/result/session-feedback-sections";
import { Badge } from "@/components/ui";
import type { DashboardStats } from "@/lib/data/dashboard-stats";
import {
  formatPartLabel,
  getStudentAppealStatusLabel,
  getStudentReviewStatusLabel,
  getStudentRiskStatusLabel,
  scoreClass,
} from "@/lib/result-display";
import { getStoredResult } from "@/lib/result-storage";
import type { LiveScoringResult, PracticeSession } from "@/lib/types";

type ResultClientViewProps = {
  dashboardStats: DashboardStats;
  fallbackSession: PracticeSession | null;
  sessionId: string;
};

function getSourceSummary(isLocalOnly: boolean, hasLiveResult: boolean) {
  if (isLocalOnly) {
    return {
      badge: "即时结果",
      description: "这是你刚完成练习后看到的即时评分结果，目前只保存在当前浏览器里。",
    };
  }

  if (hasLiveResult) {
    return {
      badge: "刚完成练习",
      description: "这是你刚完成练习后的即时结果；同时，这次练习也已经保存到历史记录里。",
    };
  }

  return {
    badge: "历史结果",
    description: "这是已保存的历史结果，适合回看评分、反馈和申诉处理状态。",
  };
}

function getStatusTone(session: Pick<PracticeSession, "reviewStatus" | "riskFlag">): "neutral" | "warn" | "ok" {
  if (session.reviewStatus === "completed") {
    return "ok";
  }

  if (session.reviewStatus === "flagged" || session.riskFlag) {
    return "warn";
  }

  return "neutral";
}

function getAppealTone(session: Pick<PracticeSession, "appealStatus">): "neutral" | "warn" | "ok" {
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

function formatConfidence(value: LiveScoringResult["confidence"]) {
  switch (value) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
    default:
      return "低";
  }
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

export function ResultClientView({ dashboardStats, fallbackSession, sessionId }: ResultClientViewProps) {
  const [liveResult, setLiveResult] = useState<LiveScoringResult | null>(null);

  useEffect(() => {
    async function loadLiveResult() {
      setLiveResult(await getStoredResult(sessionId));
    }

    void loadLiveResult();
  }, [sessionId]);

  const result = liveResult;
  const session = fallbackSession;
  const resultScore = result?.score ?? session?.score;
  const resultFeedback = result?.feedback ?? session?.feedback;
  const resultTranscript = result?.transcript ?? session?.transcript;
  const resultQuestionLabel = result?.questionLabel ?? session?.questionLabel;
  const resultPart = result?.part ?? session?.part;
  const resultDurationSeconds = result?.durationSeconds ?? session?.durationSeconds ?? 0;
  const resultTopicTitle = result?.topicTitle ?? session?.topicTitle;
  const resultQuestionText = result?.questionText ?? session?.questionText;
  const resultRiskFlag = result?.riskFlag ?? session?.riskFlag ?? false;
  const resultRiskReason = result?.riskReason ?? session?.riskReason ?? "";

  if (!result && !session) {
    return (
      <div className="result-layout">
        <SectionCard title="未找到结果">
          <p>当前没有查到这次练习的保存结果，也没有浏览器里的即时记录。</p>
          <p className="inline-note">请先完成一次练习，或返回历史记录页查看可用会话。</p>
        </SectionCard>
      </div>
    );
  }

  const sessionForAppeal = fallbackSession;
  const isLocalOnly = Boolean(!fallbackSession && liveResult);
  const sourceSummary = getSourceSummary(isLocalOnly, Boolean(liveResult));
  const trendPoints = dashboardStats.scoreTrend.slice(-10);

  return (
    <div className="result-layout">
      <div className="result-kpi-row">
        <KpiCard label="总练习次数" value={dashboardStats.totalSessions} />
        <KpiCard label="连续练习天数" value={dashboardStats.currentStreak} />
        <KpiCard label="历史最高分" value={formatScore(dashboardStats.bestScore)} />
        <KpiCard label="平均分" value={formatScore(dashboardStats.averageScore)} />
      </div>

      <div className="result-two-col">
        <SectionCard title="本次结果说明">
          <div className="meta-row">
            <Badge tone={isLocalOnly || result ? "ok" : "neutral"}>{sourceSummary.badge}</Badge>
            {resultQuestionLabel ? <Badge>{resultQuestionLabel}</Badge> : null}
            {resultPart ? <Badge>{formatPartLabel(resultPart)}</Badge> : null}
            {resultDurationSeconds > 0 ? <Badge>{`录音时长 ${resultDurationSeconds}s`}</Badge> : null}
          </div>
          <p className="inline-note result-source-note">{sourceSummary.description}</p>
          {resultTopicTitle ? <p style={{ marginTop: 12 }}><strong>Topic：</strong>{resultTopicTitle}</p> : null}
          {resultQuestionText ? <p style={{ marginTop: 8 }}><strong>题目：</strong>{resultQuestionText}</p> : null}
          {session ? (
            <div className="tag-row" style={{ marginTop: 12 }}>
              <Badge tone={resultRiskFlag ? "warn" : "ok"}>{getStudentRiskStatusLabel(session)}</Badge>
              <Badge tone={getAppealTone(session)}>{getStudentAppealStatusLabel(session)}</Badge>
              <Badge tone={getStatusTone(session)}>{getStudentReviewStatusLabel(session)}</Badge>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="你的回答转写">
          <p className="inline-note" style={{ marginBottom: 12 }}>
            以下是 AI 对你录音的转写，评分与反馈都基于这份内容。如果转写明显不对，可以在页面底部提交申诉。
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>{resultTranscript}</p>
        </SectionCard>
      </div>

      <div className="result-two-col">
        <SectionCard title="总分概览">
          <div className="score-hero">
            <div className={`score-hero-number ${scoreClass(resultScore!.total)}`}>{formatScore(resultScore!.total)}</div>
            <p className="score-hero-label">本次总分 / 9</p>
            <div className="score-hero-track" aria-hidden="true">
              <div className={`score-hero-fill ${scoreClass(resultScore!.total)}`} style={{ width: `${(resultScore!.total / 9) * 100}%` }} />
            </div>
            <div className="meta-row score-hero-meta">
              {resultPart ? <Badge>{formatPartLabel(resultPart)}</Badge> : null}
              {resultDurationSeconds > 0 ? <Badge>{`录音时长 ${resultDurationSeconds}s`}</Badge> : null}
              <Badge tone={resultRiskFlag ? "warn" : "ok"}>
                {resultRiskFlag ? `需要人工关注：${resultRiskReason}` : "结果正常"}
              </Badge>
              {result ? <Badge>{`置信度：${formatConfidence(result.confidence)}`}</Badge> : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="五维能力雷达图">
          <RadarChart score={resultScore!} />
        </SectionCard>
      </div>

      <div className="result-two-col">
        <SectionCard title="各维度分数">
          <ScoreBars score={resultScore!} />
        </SectionCard>

        <SectionCard title="最近成绩趋势">
          <TrendLine points={trendPoints} />
        </SectionCard>
      </div>

      <SectionCard title="教练式总结">
        <CoachSummarySection feedback={resultFeedback!} />
      </SectionCard>

      <div className="result-two-col">
        <SectionCard title="这次回答的优点">
          {renderFeedbackList(resultFeedback!.strengths, "这次还没有提炼出明确优点。")}
        </SectionCard>

        <SectionCard title="优先改进点">
          {renderFeedbackList(resultFeedback!.priorities, "这次还没有生成优先改进点。")}
        </SectionCard>
      </div>

      {resultFeedback!.dimensionFeedback && resultFeedback!.dimensionFeedback.length > 0 ? (
        <SectionCard title="各维度详细点评">
          <DimensionFeedbackSection items={resultFeedback!.dimensionFeedback} />
        </SectionCard>
      ) : null}

      <div className="result-two-col">
        {resultFeedback!.pronunciationFocus && resultFeedback!.pronunciationFocus.length > 0 ? (
          <SectionCard title="本次回答发音重点">
            <p className="inline-note" style={{ marginBottom: 12 }}>以下是你本次回答中值得注意的发音，附 IPA 音标和练习提示。</p>
            <PronunciationSection items={resultFeedback!.pronunciationFocus} title="" />
          </SectionCard>
        ) : (
          <SectionCard title="本次回答发音重点">
            <p className="inline-note">这次没有单独生成发音重点。</p>
          </SectionCard>
        )}

        {resultFeedback!.improvedAnswer ? (
          <SectionCard title="基于你的回答 — 加强版改进答案">
            <p className="inline-note" style={{ marginBottom: 12 }}>
              保留了你的核心想法，在词汇、语法、连贯性上做了升级。对比原文，找出差距。
            </p>
            <AnswerBlock
              answer={resultFeedback!.improvedAnswer}
              pronunciation={resultFeedback!.improvedAnswerPronunciation}
              title=""
              className="improved"
            />
          </SectionCard>
        ) : (
          <SectionCard title="基于你的回答 — 加强版改进答案">
            <p className="inline-note">这次还没有生成改进版答案。</p>
          </SectionCard>
        )}
      </div>

      {resultFeedback!.sampleAnswer ? (
        <SectionCard title="高分示范答案（Band 7-8）">
          <p className="inline-note" style={{ marginBottom: 12 }}>
            这是针对本题的高分参考答案，展示了优秀的词汇和语法运用。
          </p>
          <AnswerBlock
            answer={resultFeedback!.sampleAnswer}
            pronunciation={resultFeedback!.sampleAnswerPronunciation}
            title=""
            className="sample"
          />
        </SectionCard>
      ) : null}

      <SectionCard title="申诉入口">
        {sessionForAppeal ? (
          <AppealActionPanel session={sessionForAppeal} />
        ) : (
          <p className="inline-note">当前展示的是仅保存在浏览器中的即时结果，只有保存到历史后的记录才支持申诉。</p>
        )}
      </SectionCard>
    </div>
  );
}
