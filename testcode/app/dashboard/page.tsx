"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Status = "idle" | "connecting" | "listening" | "error";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<Status>("idle");
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([]);
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ── Auth guard ────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  // ── Auto-scroll transcript ────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [finalTranscripts, interimText]);

  // ── Stop everything ───────────────────────────────────────────
  const stopRecording = useCallback((nextStatus: Status = "idle") => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setStatus(nextStatus);
    setInterimText("");
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  // ── Start recording ───────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setErrorMsg("");
    setStatus("connecting");

    try {
      // 1. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Connect to our backend WebSocket proxy
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws/transcribe";
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("listening");

        // Determine best supported MIME type (for cross-browser compatibility, e.g. Safari)
        let mimeType = "";
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }

        // 3. Start MediaRecorder & stream chunks
        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        recorder.start(250); // send every 250ms
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Status messages from our proxy
          if (data.type === "status") return;
          if (data.type === "error") {
            setErrorMsg(data.message);
            stopRecording("error");
            return;
          }

          // Deepgram transcript
          const transcript =
            data?.channel?.alternatives?.[0]?.transcript || "";

          if (data.is_final && transcript) {
            setFinalTranscripts((prev) => [...prev, transcript]);
            setInterimText("");
          } else if (transcript) {
            setInterimText(transcript);
          }
        } catch {
          // ignore non-JSON messages
        }
      };

      ws.onerror = () => {
        setErrorMsg("WebSocket connection failed. Is the backend running?");
        stopRecording("error");
      };

      ws.onclose = () => {
        setStatus((prev) => {
          if (prev === "listening" || prev === "connecting") {
            return "idle";
          }
          return prev;
        });
      };
    } catch (err: unknown) {
      const msg =
        (err as Error).message || "Could not access microphone";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [stopRecording]);

  // ── Toggle ────────────────────────────────────────────────────
  const toggleRecording = () => {
    if (status === "listening" || status === "connecting") {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ── Render guards ─────────────────────────────────────────────
  if (loading) return <div className="spinner" />;
  if (!user) return null;

  const isRecording = status === "listening" || status === "connecting";

  return (
    <div className="container">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">🎙</div>
          <h2>VocaLabs</h2>
        </div>
        <div className="user-info">
          <span className="user-email">{user.email}</span>
          <button
            className="btn btn-ghost"
            onClick={signOut}
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Controls ───────────────────────────────────────────── */}
      <div className="controls">
        <button
          className={`record-btn ${isRecording ? "recording" : ""}`}
          onClick={toggleRecording}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          id="record-button"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: "1rem" }}>
            {isRecording ? "Listening…" : "Press to start"}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              className={`status-badge ${
                status === "error"
                  ? "error"
                  : isRecording
                  ? "listening"
                  : "idle"
              }`}
            >
              <span className="status-dot" />
              {status === "connecting"
                ? "Connecting"
                : status === "listening"
                ? "Live"
                : status === "error"
                ? "Error"
                : "Ready"}
            </span>

            {isRecording && (
              <div className={`visualizer ${isRecording ? "active" : ""}`}>
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
                <div className="bar" />
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="error-msg" style={{ marginBottom: 20 }}>
          {errorMsg}
        </div>
      )}

      {/* ── Transcript ─────────────────────────────────────────── */}
      <section className="transcript-section">
        <h3>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Transcript
        </h3>

        <div className="transcript-box glass-card" id="transcript-box">
          {finalTranscripts.length === 0 && !interimText ? (
            <p className="transcript-placeholder">
              Your spoken words will appear here in real time…
            </p>
          ) : (
            <>
              {finalTranscripts.map((t, i) => (
                <span key={i}>{t} </span>
              ))}
              {interimText && (
                <span className="interim-text">{interimText}</span>
              )}
            </>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </section>
    </div>
  );
}
