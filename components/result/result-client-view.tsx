"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/page-shell";
import { AppealActionPanel } from "@/components/result/appeal-action-panel";
import { Badge } from "@/components/ui";
import { buildResultStorageKey } from "@/lib/result-storage";
import type { LiveScoringResult, PracticeSession } from "@/lib/types";

type ResultClientViewProps = {
  fallbackSession: PracticeSession;
  sessionId: string;
  duration?: string;
  processingSummary?: string;
  submittedTranscript?: string;
};

function buildFallbackResult(
  sessionId: string,
  session: PracticeSession,
  duration?: string,
  processingSummary?: string,
  submittedTranscript?: string,
): LiveScoringResult {
  return {
    sessionId,
    part: session.part,
    question: session.prompt,
    transcript: submittedTranscript || session.transcript,
    durationSeconds: duration ? Number(duration) || 0 : 0,
    score: session.score,
    feedback: session.feedback,
    riskFlag: session.riskFlag,
    riskReason: session.riskReason || "",
    confidence: session.riskFlag ? "medium" : "high",
    provider: "openai",
    model: "database-fallback",
    scoringMode: "transcript-first",
    createdAt: session.createdAt,
    processingSummary: processingSummary || "当前展示的是已持久化的会话结果。",
  };
}

export function ResultClientView({
  fallbackSession,
  sessionId,
  duration,
  processingSummary,
  submittedTranscript,
}: ResultClientViewProps) {
  const [liveResult, setLiveResult] = useState<LiveScoringResult | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(buildResultStorageKey(sessionId));

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as LiveScoringResult;
      setLiveResult(parsed);
    } catch (error) {
      console.error(error);
    }
  }, [sessionId]);

  const result = useMemo(
    () =>
      liveResult ||
      buildFallbackResult(sessionId, fallbackSession, duration, processingSummary, submittedTranscript),
    [duration, fallbackSession, liveResult, processingSummary, sessionId, submittedTranscript],
  );

  const isLiveResult = Boolean(liveResult);

  return (
    <div className="card-grid">
      <SectionCard title="本次提交概览">
        <div className="meta-row">
          {isLiveResult ? <Badge tone="ok">实时评分结果</Badge> : <Badge>持久化结果</Badge>}
          <Badge>{result.provider}</Badge>
          <Badge>{result.model}</Badge>
          {result.durationSeconds > 0 ? <Badge>录音时长 {result.durationSeconds}s</Badge> : null}
        </div>
        <p className="inline-note">{result.processingSummary}</p>
      </SectionCard>

      <SectionCard title="本次转写文本">
        <p>{result.transcript}</p>
      </SectionCard>

      <SectionCard title="总分与状态">
        <div className="score-grid">
          <div className="score-box">
            <span>总分</span>
            <strong>{result.score.total}</strong>
          </div>
          <div className="score-box">
            <span>风险状态</span>
            <strong>{result.riskFlag ? "需关注" : "正常"}</strong>
          </div>
          <div className="score-box">
            <span>置信度</span>
            <strong>{result.confidence}</strong>
          </div>
        </div>
        <div className="meta-row">
          {result.riskFlag ? <Badge tone="warn">已标记风险</Badge> : <Badge tone="ok">当前无风险标记</Badge>}
        </div>
      </SectionCard>

      <SectionCard title="分项分">
        <div className="score-grid">
          <div className="score-box"><span>流利度与连贯性</span><strong>{result.score.fluencyCoherence}</strong></div>
          <div className="score-box"><span>词汇</span><strong>{result.score.lexicalResource}</strong></div>
          <div className="score-box"><span>语法</span><strong>{result.score.grammar}</strong></div>
          <div className="score-box"><span>发音</span><strong>{result.score.pronunciation}</strong></div>
          <div className="score-box"><span>完整度</span><strong>{result.score.completeness}</strong></div>
        </div>
      </SectionCard>

      <SectionCard title="教练式总结反馈">
        <p>{result.feedback.summary}</p>
        <p><strong>下一步建议：</strong> {result.feedback.nextStep}</p>
      </SectionCard>

      <SectionCard title="本次优点">
        <ul>
          {result.feedback.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="当前优先改进点">
        <ul>
          {result.feedback.priorities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="更好的表达参考">
        <p>{result.feedback.sampleAnswer ?? "当前这个会话暂未提供示例参考答案。"}</p>
      </SectionCard>

      <SectionCard title="申诉入口">
        <AppealActionPanel session={fallbackSession} />
      </SectionCard>
    </div>
  );
}
