"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import {
  formatDate,
  formatPartLabel,
  getStudentAppealStatusLabel,
  getStudentReviewStatusLabel,
  getStudentRiskStatusLabel,
  scoreClass,
} from "@/lib/result-display";
import { listStoredPracticeSessions } from "@/lib/result-storage";
import type { PracticeSession } from "@/lib/types";

type HistoryListClientProps = {
  initialSessions: PracticeSession[];
};

type PartFilter = "all" | PracticeSession["part"];
type AppealFilter = "all" | PracticeSession["appealStatus"];
type AttentionFilter = "all" | "normal" | "attention" | "reviewed";
type SortOption = "latest" | "oldest" | "score-high" | "score-low";

function getPreviewText(session: PracticeSession) {
  const text = session.feedback?.nextStep || session.feedback?.summary || "";
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

function matchesKeyword(session: PracticeSession, keyword: string) {
  if (!keyword) {
    return true;
  }

  const haystack = [
    session.topicTitle,
    session.questionText,
    session.transcript,
    session.feedback?.summary,
    session.feedback?.nextStep,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  return haystack.includes(keyword);
}

function matchesAttentionFilter(session: PracticeSession, attentionFilter: AttentionFilter) {
  if (attentionFilter === "all") {
    return true;
  }

  if (attentionFilter === "attention") {
    return session.riskFlag || session.reviewStatus === "flagged";
  }

  if (attentionFilter === "reviewed") {
    return session.reviewStatus === "completed";
  }

  return !session.riskFlag && session.reviewStatus !== "flagged";
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

function getReviewTone(session: PracticeSession): "neutral" | "warn" | "ok" {
  if (session.reviewStatus === "completed") {
    return "ok";
  }

  if (session.reviewStatus === "flagged" || session.riskFlag) {
    return "warn";
  }

  return "neutral";
}

export function HistoryListClient({ initialSessions }: HistoryListClientProps) {
  const [localSessions, setLocalSessions] = useState<PracticeSession[]>([]);
  const [hasLoadedLocalSessions, setHasLoadedLocalSessions] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [partFilter, setPartFilter] = useState<PartFilter>("all");
  const [appealFilter, setAppealFilter] = useState<AppealFilter>("all");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("latest");

  useEffect(() => {
    async function loadLocalSessions() {
      setLocalSessions(await listStoredPracticeSessions());
      setHasLoadedLocalSessions(true);
    }

    void loadLocalSessions();
  }, []);

  const persistedSessionIds = useMemo(() => new Set(initialSessions.map((session) => session.id)), [initialSessions]);

  const sessions = useMemo(() => {
    const merged = [...initialSessions];

    localSessions.forEach((session) => {
      if (!persistedSessionIds.has(session.id)) {
        merged.push(session);
      }
    });

    return merged;
  }, [initialSessions, localSessions, persistedSessionIds]);

  const filteredSessions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const matchedSessions = sessions.filter((session) => {
      if (partFilter !== "all" && session.part !== partFilter) {
        return false;
      }

      if (appealFilter !== "all" && session.appealStatus !== appealFilter) {
        return false;
      }

      if (!matchesAttentionFilter(session, attentionFilter)) {
        return false;
      }

      return matchesKeyword(session, normalizedKeyword);
    });

    return matchedSessions.sort((a, b) => {
      if (sortOption === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortOption === "score-high") {
        return b.score.total - a.score.total;
      }

      if (sortOption === "score-low") {
        return a.score.total - b.score.total;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [appealFilter, attentionFilter, keyword, partFilter, sessions, sortOption]);

  if (sessions.length === 0 && !hasLoadedLocalSessions) {
    return (
      <div className="placeholder-box history-empty">
        <p>正在读取浏览器里的本地练习记录…</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="placeholder-box history-empty">
        <p>还没有完整模考记录，去完成第一场吧</p>
        <Link className="link-button" href="/mock" style={{ marginTop: 16, display: "inline-flex" }}>
          开始模考
        </Link>
      </div>
    );
  }

  const isFiltered =
    keyword.trim().length > 0 ||
    partFilter !== "all" ||
    appealFilter !== "all" ||
    attentionFilter !== "all" ||
    sortOption !== "latest";

  return (
    <>
      <SectionCard title="查找与筛选">
        <div className="form-grid">
          <label className="form-field">
            <span>关键词</span>
            <input
              className="form-input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索 Topic、题目、转写或反馈"
              type="text"
            />
          </label>

          <label className="form-field">
            <span>练习模块</span>
            <select value={partFilter} onChange={(event) => setPartFilter(event.target.value as PartFilter)}>
              <option value="all">全部</option>
              <option value="part1">Part 1</option>
              <option value="part2">Part 2</option>
              <option value="part3">Part 3</option>
            </select>
          </label>

          <label className="form-field">
            <span>申诉状态</span>
            <select value={appealFilter} onChange={(event) => setAppealFilter(event.target.value as AppealFilter)}>
              <option value="all">全部</option>
              <option value="none">暂无申诉</option>
              <option value="submitted">申诉已提交</option>
              <option value="reviewed">申诉已处理</option>
            </select>
          </label>

          <label className="form-field">
            <span>关注状态</span>
            <select
              value={attentionFilter}
              onChange={(event) => setAttentionFilter(event.target.value as AttentionFilter)}
            >
              <option value="all">全部</option>
              <option value="normal">当前正常</option>
              <option value="attention">需要人工关注</option>
              <option value="reviewed">人工查看完成</option>
            </select>
          </label>

          <label className="form-field">
            <span>排序方式</span>
            <select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)}>
              <option value="latest">最新优先</option>
              <option value="oldest">最早优先</option>
              <option value="score-high">分数从高到低</option>
              <option value="score-low">分数从低到高</option>
            </select>
          </label>
        </div>

        <div className="action-row" style={{ marginTop: 16 }}>
          <button
            className="action-button secondary"
            disabled={!isFiltered}
            onClick={() => {
              setKeyword("");
              setPartFilter("all");
              setAppealFilter("all");
              setAttentionFilter("all");
              setSortOption("latest");
            }}
            type="button"
          >
            重置条件
          </button>
        </div>

        <div className="meta-row">
          <Badge>{`共 ${sessions.length} 条记录`}</Badge>
          <Badge tone="ok">{`当前显示 ${filteredSessions.length} 条`}</Badge>
          <Badge>{sortOption === "latest" ? "默认按时间倒序" : "已应用自定义排序"}</Badge>
        </div>
      </SectionCard>

      {filteredSessions.length === 0 ? (
        <div className="placeholder-box history-empty">
          <p>当前筛选条件下没有匹配的练习记录</p>
          <p className="inline-note" style={{ marginTop: 8 }}>试试放宽关键词、改成全部模块，或清空筛选条件</p>
        </div>
      ) : (
        <div className="list-grid">
          {filteredSessions.map((session) => {
            const isLocalOnly = !persistedSessionIds.has(session.id);
            const previewText = getPreviewText(session);

            return (
              <section className="list-item history-item" key={session.id}>
                <div className="history-score-col">
                  <span className={`history-score ${scoreClass(session.score.total)}`}>{session.score.total}</span>
                  <span className="history-score-label">总分</span>
                </div>
                <div className="list-main history-main">
                  <h3>{session.topicTitle}</h3>
                  <p>{formatDate(session.createdAt)}</p>
                  <p className="inline-note" style={{ marginTop: 8 }}>{session.questionText}</p>
                  {previewText ? (
                    <p className="inline-note" style={{ marginTop: 8 }}>{`下次重点：${previewText}`}</p>
                  ) : null}
                  <div className="tag-row">
                    <Badge>{session.questionLabel}</Badge>
                    <Badge>{formatPartLabel(session.part)}</Badge>
                    {isLocalOnly ? <Badge>仅当前浏览器可见</Badge> : <Badge tone="ok">已保存到历史</Badge>}
                    {session.durationSeconds > 0 ? <Badge>{`录音 ${session.durationSeconds}s`}</Badge> : null}
                    <Badge tone={session.riskFlag ? "warn" : "ok"}>{getStudentRiskStatusLabel(session)}</Badge>
                    <Badge tone={getAppealTone(session)}>{getStudentAppealStatusLabel(session)}</Badge>
                    <Badge tone={getReviewTone(session)}>{getStudentReviewStatusLabel(session)}</Badge>
                  </div>
                </div>
                <div className="action-row history-actions">
                  <Link className="link-button" href={`/result/${session.id}`}>
                    查看评分反馈
                  </Link>
                  <Link className="link-button secondary" href={`/history/${session.id}`}>
                    查看完整记录
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
