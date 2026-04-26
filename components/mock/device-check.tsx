"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type CheckState = "idle" | "requesting" | "monitoring" | "passed" | "denied" | "error";

const NOISE_FLOOR = 8;
const SPEECH_THRESHOLD = 24;

export function DeviceCheck() {
  const [state, setState] = useState<CheckState>("idle");
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState<string>("");
  const [hasReachedSpeech, setHasReachedSpeech] = useState(false);
  const [environmentOk, setEnvironmentOk] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const monitoringStartRef = useRef<number | null>(null);
  const noiseSamplesRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopMonitoring() {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
  }

  async function startCheck() {
    setMessage("");
    setHasReachedSpeech(false);
    setEnvironmentOk(null);
    noiseSamplesRef.current = [];
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("当前浏览器不支持 Web Audio API");
      }

      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      monitoringStartRef.current = Date.now();
      setState("monitoring");

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const visibleLevel = Math.min(100, Math.round(rms * 280));
        setLevel(visibleLevel);

        const elapsed = Date.now() - (monitoringStartRef.current ?? Date.now());

        if (elapsed < 2500) {
          noiseSamplesRef.current.push(visibleLevel);
        }

        if (visibleLevel > SPEECH_THRESHOLD && elapsed > 1500) {
          setHasReachedSpeech(true);
        }

        if (elapsed > 6000) {
          const noiseAvg = noiseSamplesRef.current.length
            ? noiseSamplesRef.current.reduce((a, b) => a + b, 0) / noiseSamplesRef.current.length
            : 0;
          const isQuietEnough = noiseAvg < NOISE_FLOOR + 6;
          setEnvironmentOk(isQuietEnough);

          if (hasReachedSpeech) {
            setState("passed");
            stopMonitoring();
            return;
          }
        }

        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);
    } catch (error) {
      console.error(error);
      stopMonitoring();
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setState("denied");
        setMessage("浏览器拒绝了麦克风权限 · 请在地址栏左侧的权限设置中允许后再试");
      } else {
        setState("error");
        setMessage(error instanceof Error ? error.message : "麦克风初始化失败");
      }
    }
  }

  function reset() {
    stopMonitoring();
    setState("idle");
    setLevel(0);
    setHasReachedSpeech(false);
    setEnvironmentOk(null);
    setMessage("");
  }

  const statusLabel = (() => {
    switch (state) {
      case "idle":
        return "尚未开始";
      case "requesting":
        return "正在请求麦克风权限…";
      case "monitoring":
        return hasReachedSpeech ? "已检测到语音，请保持，约 6 秒后完成" : "请正常说一句话，例如：'My name is...'";
      case "passed":
        return "检测通过，可以开始模考";
      case "denied":
        return "麦克风权限被拒绝";
      case "error":
        return "检测过程出错";
      default:
        return "";
    }
  })();

  return (
    <div className="device-check">
      <div className="device-check-card">
        <header className="device-check-header">
          <p className="eyebrow">DEVICE CHECK</p>
          <h2>麦克风与环境检测</h2>
          <p className="device-check-desc">
            真实考场会要求你戴耳机、说话靠近麦克风<br />
            模考前请用 30 秒确认设备和环境正常，避免开始后才发现录音问题
          </p>
        </header>

        <div className="device-check-meter">
          <div className="device-check-meter-track">
            <div className="device-check-meter-fill" style={{ width: `${level}%` }} />
            <div className="device-check-meter-marker" style={{ left: `${SPEECH_THRESHOLD}%` }} aria-hidden />
          </div>
          <div className="device-check-meter-legend">
            <span>静音</span>
            <span>正常说话</span>
            <span>响亮</span>
          </div>
        </div>

        <div className="device-check-status">
          <p className="device-check-status-label">当前状态</p>
          <p className="device-check-status-value">{statusLabel}</p>
        </div>

        <ul className="device-check-list">
          <li className={state === "passed" || state === "monitoring" ? "ok" : ""}>
            <span className="dot" /> 浏览器麦克风权限
          </li>
          <li className={hasReachedSpeech ? "ok" : ""}>
            <span className="dot" /> 录音电平正常（说话时能突破阈值线）
          </li>
          <li className={environmentOk === true ? "ok" : environmentOk === false ? "warn" : ""}>
            <span className="dot" /> 安静环境（前 2.5 秒环境噪声低于阈值）
          </li>
        </ul>

        {message ? <p className="device-check-message">{message}</p> : null}

        <div className="device-check-actions">
          {state === "idle" || state === "denied" || state === "error" ? (
            <button type="button" className="device-check-primary" onClick={startCheck}>
              {state === "idle" ? "开始检测" : "重新检测"}
            </button>
          ) : null}

          {state === "requesting" || state === "monitoring" ? (
            <button type="button" className="device-check-secondary" onClick={reset}>
              停止
            </button>
          ) : null}

          {state === "passed" ? (
            <>
              <Link className="device-check-primary" href="/mock">
                返回选卷开始模考 →
              </Link>
              <button type="button" className="device-check-secondary" onClick={reset}>
                再测一次
              </button>
            </>
          ) : null}
        </div>
      </div>

      <aside className="device-check-tips">
        <h3>考场设备小贴士</h3>
        <ul>
          <li>戴有线耳麦或外接麦克风，效果优于内置麦克</li>
          <li>关闭背景音乐、空调风噪过大的窗户</li>
          <li>说话距离麦克风 10–15cm，保持自然音量</li>
          <li>如有家人/室友，请提前打招呼避免突然打扰</li>
        </ul>
      </aside>
    </div>
  );
}
