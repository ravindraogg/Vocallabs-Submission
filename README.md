# Cold Outreach Pipeline - Vocallabs Assignment

> Fully automated cold-outreach engine — one domain in, personalized emails out. Zero humans in the loop.

## My Approach & Engineering Decisions

Building a robust automation pipeline requires more than just chaining APIs together. Here is how I approached the engineering challenges for this assignment:

1. **Modular Architecture:** I separated the code into four distinct stages (`ocean.js`, `prospeo.js`, `eazyreach.js`, `brevo.js`), orchestrated by a central `pipeline.js`. Each stage is an independent module with single responsibility, making the system easy to extend or debug.
2. **Resilience & Rate-Limiting:** I built a custom `requestWithRetry` utility using Axios. It handles `429 Too Many Requests` by applying exponential backoff, and automatically retries `5xx` server errors. This ensures the pipeline doesn't crash halfway due to transient API issues.
3. **Graceful Fallbacks:** Since Eazyreach credits were unavailable (as per the FAQ), I engineered a fallback mechanism where the pipeline gracefully degrades to use Prospeo's `enrich-person` endpoint to resolve verified work emails. I also completely removed the mock email generator as requested, ensuring strict reliance on live APIs.
4. **Data Integrity & Deduplication:** At each handoff, the data is normalized (e.g., stripping `www.` and `https://` from domains) and deduplicated by unique keys like LinkedIn URLs or Email addresses to ensure no duplicate emails are sent.
5. **Safety Checkpoint:** Before firing off any live emails, the pipeline pauses, displays a formatted CLI table of the enriched contacts, and demands an explicit `y` from the human operator. (This can be bypassed with `AUTO_CONFIRM=true` for fully headless runs).
6. **Dry-Run Mode:** Built a `SEND_EMAILS=false` toggle to simulate the entire pipeline end-to-end without spending API credits or spamming inboxes.

## Architecture

```text
┌─────────────┐     ┌───────────┐     ┌────────────┐     ┌─────────┐
│  Ocean.io   │────▶│  Prospeo  │────▶│ Eazyreach/ │────▶│  Brevo  │
│ Lookalikes  │     │ Contacts  │     │  Prospeo   │     │ Outreach│
└─────────────┘     └───────────┘     └────────────┘     └─────────┘
     Stage 1            Stage 2           Stage 3          Stage 4
  seed domain →     domains →         LinkedIn →       emails →
  company list      C-suite/VP +      verified         outreach
                    LinkedIn URLs     work emails       mail sent
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure your API keys in .env
# (Ensure your actual keys are in .env before running)

# 3. Run the pipeline
node index.js intercom.com
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SEND_EMAILS` | Yes | `false` = dry run (no credits), `true` = live sends |
| `AUTO_CONFIRM` | No | `true` = skips the manual "y/n" prompt before sending emails |
| `OCEAN_API_TOKEN` | Yes | Ocean.io API token |
| `PROSPEO_API_KEY` | Yes | Prospeo API key (from dashboard) |
| `EAZYREACH_API_KEY` | No* | Eazyreach API key (falls back to Prospeo if missing) |
| `BREVO_API_KEY` | Yes** | Brevo API key (**only required when SEND_EMAILS=true**) |
| `SENDER_NAME` | Yes | Your display name for outreach emails |
| `SENDER_EMAIL` | Yes | Your verified sender email (you@yourdomain.com) |

## API Integration Details

### Stage 1 — Ocean.io
- Endpoint: `POST /v3/search/companies`
- Input: Single seed domain.
- Output: Lookalike companies based on firmographics.

### Stage 2 — Prospeo
- Endpoint: `POST /search-person`
- Filters: Company website + seniority (C-Suite, VP, Director, Founder/Owner).

### Stage 3 — Email Enrichment (Prospeo Fallback)
- Strategy: Resolves LinkedIn URLs to verified emails.
- Primary: Eazyreach API (if key available).
- Fallback: Prospeo `POST /enrich-person`.

### Stage 4 — Brevo
- Endpoint: `POST /v3/smtp/email`
- Action: Sends personalized HTML emails with dynamic content based on contact info.
