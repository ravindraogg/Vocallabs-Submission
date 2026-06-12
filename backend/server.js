const express = require("express");
const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── WebSocket proxy to Deepgram ───────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws/transcribe" });

wss.on("connection", (clientSocket) => {
  console.log("[WS] Client connected for transcription");

  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) {
    clientSocket.send(
      JSON.stringify({ type: "error", message: "Server missing DEEPGRAM_API_KEY" })
    );
    clientSocket.close();
    return;
  }

  let dgSocket = null;
  let dgReady = false;
  const pendingChunks = []; // buffer audio until Deepgram is ready

  // Deepgram live transcription URL
  // encoding not specified — Deepgram auto-detects webm/opus from the browser
  const dgUrl =
    "wss://api.deepgram.com/v1/listen?" +
    "model=nova-3&language=en&smart_format=true&punctuate=true&interim_results=true";

  dgSocket = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${deepgramKey}` },
  });

  dgSocket.on("open", () => {
    console.log("[DG] Connected to Deepgram");
    dgReady = true;
    clientSocket.send(JSON.stringify({ type: "status", message: "connected" }));

    // Flush any buffered audio
    while (pendingChunks.length > 0) {
      dgSocket.send(pendingChunks.shift());
    }
  });

  // Deepgram → Client (transcript results)
  dgSocket.on("message", (data) => {
    const msg = data.toString();
    // Log transcripts for debugging
    try {
      const parsed = JSON.parse(msg);
      const transcript = parsed?.channel?.alternatives?.[0]?.transcript;
      if (transcript) {
        console.log(`[DG] Transcript: "${transcript}" (final: ${parsed.is_final})`);
      }
    } catch { /* ignore */ }

    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(msg);
    }
  });

  dgSocket.on("close", (code, reason) => {
    console.log(`[DG] Deepgram closed (code: ${code}, reason: ${reason})`);
    dgReady = false;
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({ type: "status", message: "deepgram_closed" })
      );
      clientSocket.close();
    }
  });

  dgSocket.on("error", (err) => {
    console.error("[DG] Deepgram error:", err.message);
    dgReady = false;
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({ type: "error", message: err.message })
      );
    }
  });

  // Client → Deepgram (audio chunks)
  clientSocket.on("message", (data) => {
    if (dgReady && dgSocket && dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.send(data);
    } else {
      // Buffer until Deepgram connection is ready
      pendingChunks.push(data);
    }
  });

  clientSocket.on("close", () => {
    console.log("[WS] Client disconnected");
    if (dgSocket && dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.send(JSON.stringify({ type: "CloseStream" }));
      dgSocket.close();
    }
  });

  clientSocket.on("error", (err) => {
    console.error("[WS] Client error:", err.message);
  });
});

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`   WebSocket proxy at ws://localhost:${PORT}/ws/transcribe\n`);
});

