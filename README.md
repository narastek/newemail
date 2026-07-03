# Typewriter

A minimal email client with the *Internal Tech Emails* aesthetic: threads read
like the iconic screenshots — bold colored sender names, clean typography, one
quiet sheet of paper per conversation.

## What's inside

- `web/` — React + Vite frontend
- `server/` — Node/Express backend. Two modes:
  - **Demo mode** (default, no config needed): an in-memory mailbox with sample
    threads so you can try the UI immediately.
  - **IMAP mode**: connects to any real mailbox (Gmail, Fastmail, etc.) over
    IMAP for reading and SMTP for sending.

## Features

- Chat-style thread reading view in the Internal Tech Emails style, with
  deterministic per-sender colors (first sender blue, second red, …)
- Inline quick-reply at the bottom of every thread (Cmd/Ctrl+Enter to send)
- Compose new messages
- Star, archive, unread indicators
- **Export as image** — render any thread to a shareable PNG in the exact
  screenshot style

## Run it

```bash
# terminal 1 — backend (demo mode)
cd server && npm install && npm start

# terminal 2 — frontend
cd web && npm install && npm run dev
```

Open http://localhost:5173.

## Connect a real mailbox

Set environment variables before starting the server:

```bash
export IMAP_HOST=imap.gmail.com
export IMAP_USER=you@gmail.com
export IMAP_PASS=your-app-password   # for Gmail: create an App Password
# optional overrides:
# SMTP_HOST (defaults to IMAP_HOST), SMTP_PORT (465), MAIL_ADDRESS,
# SENT_MAILBOX, ARCHIVE_MAILBOX, FETCH_LIMIT (200)
```

Then `npm start` in `server/`. The UI will show your address in the sidebar
instead of the demo badge.
