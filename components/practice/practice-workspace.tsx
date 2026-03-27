"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/page-shell";
import { saveResultToBrowser } from "@/lib/result-storage";
import type {
  LiveScoringResult,
  PracticeQuestionConfig,
  ScorePracticeRequest,
  TranscriptionResponse,
} from "@/lib/types";

type RecorderState = "idle" | "recording" | "recorded" | "scoring";
type TranscriptionState = "idle" | "transcribing" | "ready" | "error";

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function PracticeWorkspace({ config }: { config: PracticeQuestionConfig }) {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [finalDurationSeconds, setFinalDurationSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [transcriptionProvider, setTranscriptionProvider] = useState<string>("");
  const [permissionError, setPermissionError] = useState("");
  const [transcriptionError, setTranscriptionError] = useState("");
  const [scoringError, setScoringError] = useState("");

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioUrl]);

  const canStart = recorderState !== "recording" && recorderState !== "scoring" && transcriptionState !== "transcribing";
  const canStop = recorderState === "recording";
  const canSubmit = recorderState === "recorded" && transcriptionState !== "transcribing" && transcript.trim().length > 0;

  const statusLabel = useMemo(() => {
    if (recorderState === "recording") return "录音中";
    if (recorderState === "scoring") return "正在生成评分结果";
    if (recorderState === "recorded") return "已录音";
    return "待开始";
  }, [recorderState]);

  const transcriptionLabel = useMemo(() => {
    if (transcriptionState === "transcribing") return "正在调用 OpenAI ASR";
    if (transcriptionState === "ready") return "转写完成";
    if (transcriptionState === "error") return "转写失败，可重试或手动编辑";
    return "等待录音完成";
  }, [transcriptionState]);

  async function transcribeAudio(file: File) {
    try {
      setTranscriptionError("");
      setTranscriptionProvider("");
      setTranscriptionState("transcribing");
      setTranscript("");

      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as TranscriptionResponse | { error?: string };

      if (!response.ok || !("transcript" in payload)) {
        throw new Error("error" in payload ? payload.error || "Transcription failed." : "Transcription failed.");
      }

      setTranscript(payload.transcript);
      setTranscriptionProvider(payload.provider);
      setTranscriptionState("ready");
    } catch (error) {
      console.error(error);
      setTranscriptionState("error");
      setTranscriptionError(error instanceof Error ? error.message : "转写失败。请稍后重试。");
    }
  }

  async function startRecording() {
    try {
      setPermissionError("");
      setTranscriptionError("");
      setScoringError("");
      setTranscript("");
      setRecordedFile(null);
      setTranscriptionProvider("");
      setTranscriptionState("idle");
      setDurationSeconds(0);
      chunksRef.current = [];

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const nextAudioUrl = URL.createObjectURL(audioBlob);
        const nextFile = new File([audioBlob], `${config.questionId}-recording.webm`, {
          type: audioBlob.type || "audio/webm",
        });

        setAudioUrl(nextAudioUrl);
        setRecordedFile(nextFile);
        setRecorderState("recorded");
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        void transcribeAudio(nextFile);
      };

      recorder.start();
      setRecorderState("recording");

      timerRef.current = window.setInterval(() => {
        setDurationSeconds((current) => current + 1);
      }, 1000);
    } catch (error) {
      console.error(error);
      setPermissionError("无法访问麦克风。请检查浏览器权限后再试。");
      setRecorderState("idle");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || recorderState !== "recording") {
      return;
    }

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setFinalDurationSeconds(durationSeconds);
  }

  function resetRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setRecordedFile(null);
    setTranscript("");
    setDurationSeconds(0);
    setFinalDurationSeconds(0);
    setPermissionError("");
    setTranscriptionError("");
    setScoringError("");
    setTranscriptionProvider("");
    setRecorderState("idle");
    setTranscriptionState("idle");
  }

  async function retryTranscription() {
    if (!recordedFile || transcriptionState === "transcribing") {
      return;
    }

    await transcribeAudio(recordedFile);
  }

  async function submitPractice() {
    if (!canSubmit) {
      return;
    }

    try {
      setScoringError("");
      setRecorderState("scoring");

      const requestBody: ScorePracticeRequest = {
        part: config.part,
        topicSlug: config.topicSlug,
        topicTitle: config.topicTitle,
        questionId: config.questionId,
        questionText: config.questionText,
        questionIndex: config.questionIndex,
        questionLabel: config.questionLabel,
        transcript,
        durationSeconds,
      };

      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json()) as LiveScoringResult | { error?: string };

      if (!response.ok || !("score" in payload)) {
        throw new Error("error" in payload ? payload.error || "Scoring failed." : "Scoring failed.");
      }

      await saveResultToBrowser(payload);
      router.push(`/result/${payload.sessionId}`);
    } catch (error) {
      console.error(error);
      setScoringError(error instanceof Error ? error.message : "评分失败。请稍后重试。");
      setRecorderState("recorded");
    }
  }

  return (
    <div className="practice-layout">
      <SectionCard title="当前题目">
        <p>{config.questionText}</p>
        <p className="inline-note">{config.questionLabel} · {config.helper}</p>
      </SectionCard>

      <div className="practice-main">
        <SectionCard title="录音控制台">
          <div className="recording-status-panel">
            <div>
              <p className="label">当前状态</p>
              <p className="value">{statusLabel}</p>
            </div>
            <div>
              <p className="label">录音时长</p>
              <p className="timer-value">
                {recorderState === "recording"
                  ? formatSeconds(durationSeconds)
                  : finalDurationSeconds > 0
                    ? formatSeconds(finalDurationSeconds)
                    : formatSeconds(durationSeconds)}
              </p>
            </div>
          </div>

          <div className="control-row">
            <button className="action-button primary" onClick={startRecording} disabled={!canStart} type="button">
              开始录音
            </button>
            <button className="action-button secondary" onClick={stopRecording} disabled={!canStop} type="button">
              停止录音
            </button>
            <button className="action-button ghost" onClick={resetRecording} disabled={recorderState === "scoring"} type="button">
              重新开始
            </button>
          </div>

          {audioUrl ? (
            <div className="audio-preview">
              <p className="label">录音回放</p>
              <audio controls src={audioUrl} className="audio-player">
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : (
            <div className="placeholder-box compact">
              <p>完成录音后，这里会提供回放能力。</p>
            </div>
          )}

          {permissionError ? <p className="message-error">{permissionError}</p> : null}
        </SectionCard>

        <SectionCard title="语音转写">
          {transcriptionState === "transcribing" ? (
            <div className="recording-status-panel transcription-panel">
              <div>
                <p className="label">转写状态</p>
                <p className="value">正在识别语音，请稍候…</p>
              </div>
            </div>
          ) : transcriptionState === "ready" ? (
            <div className="recording-status-panel transcription-panel">
              <div>
                <p className="label">转写状态</p>
                <p className="value">✓ 识别完成</p>
              </div>
              <div>
                <p className="label">识别来源</p>
                <p className="value">{transcriptionProvider || "OpenAI"}</p>
              </div>
            </div>
          ) : transcriptionState === "error" ? (
            <div className="recording-status-panel transcription-panel">
              <div>
                <p className="label">转写状态</p>
                <p className="value">识别失败，可重试或手动输入</p>
              </div>
            </div>
          ) : null}

          <p className="inline-note">录音停止后会自动识别语音。如识别有偏差，可直接在下方文本框修正后再提交。</p>
          <textarea
            className="transcript-input"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="录音完成后，这里会出现 OpenAI ASR 的转写结果。"
            rows={8}
            disabled={recorderState === "scoring" || transcriptionState === "transcribing"}
          />

          <div className="control-row top-gap">
            <button
              className="action-button ghost"
              onClick={retryTranscription}
              disabled={!recordedFile || transcriptionState === "transcribing" || recorderState === "scoring"}
              type="button"
            >
              重新转写
            </button>
          </div>

          {transcriptionError ? <p className="message-error">{transcriptionError}</p> : null}
        </SectionCard>
      </div>

      <SectionCard title="提交评分">
        <div className="submission-panel">
          {recorderState === "scoring" ? (
            <p>AI 正在分析你的回答，通常需要 10–20 秒，请稍候…</p>
          ) : (
            <p>
              {transcriptionState === "ready"
                ? "语音识别完成，确认转写内容无误后提交。"
                : transcriptionState === "transcribing"
                  ? "正在识别语音，识别完成后即可提交。"
                  : "完成录音后，AI 会自动识别语音并生成评分。"}
            </p>
          )}
          <button className="action-button primary practice-submit-button" onClick={submitPractice} disabled={!canSubmit} type="button">
            {recorderState === "scoring" ? "评分中…" : "提交并查看结果"}
          </button>
        </div>
        {scoringError ? <p className="message-error">{scoringError}</p> : null}
      </SectionCard>
    </div>
  );
}
