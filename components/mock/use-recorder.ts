"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "stopped" | "error";

type Options = {
  /** Auto-stop after this many seconds. 0 = no auto-stop. */
  maxSeconds?: number;
  /** Called once per second with the elapsed second. */
  onTick?: (elapsed: number) => void;
  /** Called after recording stops with the produced blob. */
  onStopped?: (blob: Blob, elapsedSec: number) => void;
};

export type UseRecorder = {
  state: RecorderState;
  elapsed: number;
  error: string;
  blob: Blob | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
};

/**
 * Wraps MediaRecorder for one-question recording cycles. The hook is
 * intentionally minimal — no transcription, no auto-upload — so callers
 * can drive ASR and persistence on their own schedule.
 */
export function useRecorder(options: Options = {}): UseRecorder {
  const { maxSeconds = 0, onTick, onStopped } = options;

  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const stopHandlerRef = useRef<((blob: Blob, elapsedSec: number) => void) | undefined>(onStopped);
  const tickHandlerRef = useRef<((elapsed: number) => void) | undefined>(onTick);

  // keep latest callbacks without re-binding the recorder
  useEffect(() => {
    stopHandlerRef.current = onStopped;
  }, [onStopped]);
  useEffect(() => {
    tickHandlerRef.current = onTick;
  }, [onTick]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      cleanupStream();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [clearTimer, cleanupStream]);

  const stop = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    try {
      recorderRef.current.stop();
    } catch (err) {
      console.error(err);
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    cleanupStream();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    elapsedRef.current = 0;
    setBlob(null);
    setElapsed(0);
    setError("");
    setState("idle");
  }, [clearTimer, cleanupStream]);

  const start = useCallback(async () => {
    setError("");
    setBlob(null);
    setState("requesting");
    chunksRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearTimer();
        cleanupStream();
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const finalElapsed = elapsedRef.current;
        setBlob(audioBlob);
        setState("stopped");
        stopHandlerRef.current?.(audioBlob, finalElapsed);
      };

      recorder.start();
      setState("recording");

      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        const next = elapsedRef.current;
        setElapsed(next);
        tickHandlerRef.current?.(next);
        if (maxSeconds > 0 && next >= maxSeconds) {
          // auto-stop
          if (recorderRef.current && recorderRef.current.state !== "inactive") {
            try {
              recorderRef.current.stop();
            } catch (err) {
              console.error(err);
            }
          }
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      cleanupStream();
      setState("error");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("浏览器拒绝了麦克风权限。请在地址栏左侧的权限设置中允许后再试。");
      } else {
        setError(err instanceof Error ? err.message : "麦克风启动失败。");
      }
    }
  }, [clearTimer, cleanupStream, maxSeconds]);

  return { state, elapsed, error, blob, start, stop, reset };
}
