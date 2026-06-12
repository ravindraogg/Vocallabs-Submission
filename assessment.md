Ravindra boss, here's the cleaned-up text from the screenshots:

# SDE Intern — Live Coding Test

**Format:** Live, on Google Meet
**Duration:** 60 minutes
**Submission:** A working product running live, shared via screen share at the end.

---

# The Task

Build a small web app with **two core pieces:**

## 1. Authentication — Login Page (using Nhost)

* Set up an Nhost project (free tier).
* Build a login / signup page wired to Nhost Auth (email + password is fine).
* A user should be able to sign up, log in, and stay logged in (session persists).
* Protect the dashboard route. Only logged-in users can access it.

---

## 2. Live Speech-to-Text Dashboard (using Deepgram)

* After login, the user lands on a dashboard.
* Use the Deepgram free API for **live (streaming) speech-to-text**.
* Capture microphone audio in the browser.
* Stream audio to Deepgram.
* Show the transcript updating in real time on the dashboard.

---

# What "Done" Looks Like

By the end of the hour, during a screen share, you should be able to:

1. Open the app.
2. Sign up / log in via Nhost.
3. Land on a protected dashboard.
4. Click a button.
5. Speak into the microphone.
6. Watch your words appear live on screen.

---

# Ground Rules

* **Everything else is up to you.** Stack, framework, UI, structure, and extra features are your choice. They want to see how you interpret and build it.
* Use any docs, AI tools, or references you'd normally use. This is a real-world test, not a memory test.
* **Working > Pretty.** A rough but functional product beats a beautiful broken one.
* Polish only if you have time left.
* Keep your free API keys safe. Don't commit secrets to a public repository.

---

# How You'll Be Judged

| Area            | What they look for                                                 |
| --------------- | ------------------------------------------------------------------ |
| Working Product | Does the core flow actually run end-to-end?                        |
| Speed & Focus   | Did you prioritize the right things under time pressure?           |
| Code Sense      | Reasonable structure, no obvious foot-guns, secrets handled sanely |
| Resourcefulness | How you unblock yourself, read docs, and debug live                |
| Creativity      | Any thoughtful touches beyond the bare minimum                     |

---

# Quick Pointers

### Nhost

* Sign up.
* Create a project.
* Grab the subdomain + region.
* Use the Nhost JS SDK (`@nhost/nhost-js`) for authentication.

### Deepgram

* Sign up.
* Get an API key.
* Use the streaming/live transcription endpoint over a WebSocket from the browser.
* Use `getUserMedia()` to capture microphone audio.
* Send audio chunks to Deepgram.
* Render the transcript from the response.

### If You Get Stuck

> Get one thing working fully before chasing the other.

---

Looking at this task, I'd estimate they care roughly:

* 50% → End-to-end functionality
* 25% → Speed and decision-making
* 15% → Clean code structure
* 10% → UI/extra features

So if your auth works and speech-to-text works live, you've already completed the core objective. Everything else is bonus.
