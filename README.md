# Live Speech-to-Text Dashboard with Nhost Auth

This project is a fully functional web application featuring secure Nhost Authentication and a real-time (streaming) live speech-to-text transcription dashboard powered by Deepgram.

## Architecture & Technology Stack

The application is structured into two main components to ensure maximum security, scalability, and code cleanliness:

### 1. Frontend (`testcode`)
- **Framework**: Next.js 15 (App Router, TypeScript, TailwindCSS, React 19).
- **Authentication**: Powered by **Nhost**. Stays persisted across page reloads and securely guards dashboard routes.
- **Audio Capture & Streaming**: Captures raw audio chunks from the client's microphone via the HTML5 `MediaRecorder` API and streams it in real-time over a WebSocket connection.
- **Visuals**: A clean, premium dashboard showcasing live audio indicator animation, active connection status, and real-time transcript updates.

### 2. Backend (`backend`)
- **Runtime**: Node.js & Express.
- **WebSocket Server**: Uses `ws` library to proxy the WebSocket connection.
- **Security**: The Deepgram API key is stored safely on the server and is never exposed to the client browser. 
- **Deepgram Integration**: Securely proxies the audio streams to Deepgram's live streaming API using the latest **`nova-3`** model for rapid and accurate transcription.

---

## Getting Started (Local Development)

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables file:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your Deepgram API Key:
   ```env
   DEEPGRAM_API_KEY=your_deepgram_api_key
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```
5. Start the server:
   ```bash
   node server.js
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../testcode
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables file:
   ```bash
   cp .env.example .env.local
   ```
4. Configure Nhost subdomain/region and WebSocket endpoint:
   ```env
   NEXT_PUBLIC_NHOST_SUBDOMAIN=your_nhost_subdomain
   NEXT_PUBLIC_NHOST_REGION=your_nhost_region
   NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws/transcribe
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Production Deployment

### Backend (Render, Fly.io, etc.)
- Deploy the `backend` folder as a Web Service.
- Set the following environment variables:
  - `DEEPGRAM_API_KEY`: Your production Deepgram key.
  - `FRONTEND_URL`: The production URL of your deployed frontend (e.g., `https://your-frontend.vercel.app`).
  - `PORT`: (Set automatically by Render).

### Frontend (Vercel, Netlify, etc.)
- Deploy the `testcode` folder as a Next.js application.
- Set the following environment variables in your deployment dashboard:
  - `NEXT_PUBLIC_NHOST_SUBDOMAIN`: Your Nhost project subdomain.
  - `NEXT_PUBLIC_NHOST_REGION`: Your Nhost project region.
  - `NEXT_PUBLIC_WS_URL`: The secure WebSocket URL of your deployed backend (e.g. `wss://your-backend.onrender.com/ws/transcribe`). Note the use of `wss://` for SSL termination.

---

## Key Features Implemented
- **Route Guarding**: Next.js custom Auth Provider intercepts routing. Unauthenticated users attempting to access the `/dashboard` are redirecting to the login page.
- **WebSocket Streaming Proxy**: Transmits audio binary stream directly to Deepgram from the backend to ensure zero exposure of private keys.
- **State Restoration**: Automatic login persistence through Nhost.
- **Robust UI Feedback**: Clear visual states for "Connecting", "Listening", "Error", or "Inactive".
