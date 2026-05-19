# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent applications:

| Directory | Stack | Deploy target |
|---|---|---|
| `./` (root) | CommonJS Node.js + Express + whatsapp-web.js | Bare Linux server (systemd) |
| `webhook-viewer/` | Next.js App Router (ESM) + Neon serverless Postgres | Bare Linux server (`webhook-viewer.service` on port 3011) |

## Root — wa-local-api (`server.js`)

A local HTTP API over a WhatsApp Web session. Single file: `server.js`.

### Commands

```bash
npm install
API_TOKEN=your-token node server.js   # listens on 127.0.0.1:3000 by default
npm test                               # placeholder, always fails
```

Environment variables: `API_TOKEN` (default `change-me`), `PORT` (default 3000), `HOST` (default 127.0.0.1), `CHROME_PATH` (default Chrome system install).

### Runtime behavior

- All routes require `x-api-key` header matching `API_TOKEN`.
- `whatsapp-web.js` stores session in `.wwebjs_auth/` via `LocalAuth({ clientId: 'main' })`. This is machine-local state — don't modify it unless resetting login.
- Incoming non-self messages are buffered in-memory (cap 1000), lost on restart.

### Endpoints

- `GET /status` — API health, WhatsApp readiness, inbox size
- `GET /messages?limit=50` — recent messages from the in-memory buffer
- `GET /chats` — all WhatsApp chats (id, name, isGroup, unreadCount)
- `GET /chat/:id/messages?limit=50` — messages from a specific chat (id must be URL-encoded)

### Architecture

`server.js` is monolithic: Express setup → auth middleware → WhatsApp client lifecycle → route handlers → process shutdown. No separate route modules, services, or persistence.

Note: `package.json` declares `"main": "index.js"` but that file doesn't exist. The entrypoint is `server.js`.

## webhook-viewer/

Next.js 15 App Router project, receives webhook POSTs from an Android app, stores them in Neon Postgres, displays them in a browser UI.

Deployed to `/opt/webhook-viewer` as a systemd service (`webhook-viewer.service`), port 3011, no reverse proxy.

### Commands

```bash
cd webhook-viewer
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint     # ESLint via next lint
```

### Environment

Requires `DATABASE_URL` pointing to a Neon serverless Postgres instance.

### Source layout

```
webhook-viewer/
  lib/
    db.js         — neon(sql) connection, ensureSchema(), cleanupExpiredEvents()
    events.js     — getRecentEvents(), getRecentEventsByPackageName()
  app/
    layout.js     — root layout (<html lang="zh-CN">)
    page.js       — 'use client' homepage: token management, event list, polling
    styles.css    — all styles
    api/
      webhook/[token]/route.js  — POST: ingest webhook; GET: info
      events/route.js           — GET: query events by token + optional packageName
      cleanup/route.js          — cron endpoint for Vercel scheduled cleanup
  vercel.json     — framework: nextjs, cron: daily cleanup at midnight
  next.config.js  — Turbopack root config only
```

### Data flow

1. Android app POSTs to `/api/webhook/<token>` with JSON body.
2. Route validates token format, parses body, filters to GoPay / Gojek Indonesia (`/^(GoPay|Gojek Indonesia)$/i`).
3. Deduplicates by `(token, payload.text)` — rejects duplicates with `{ ignored: true, duplicate: true }`.
4. Inserts into `webhook_events` table via Neon.
5. Frontend polls `/api/events?token=...` every 10 seconds, renders cards with title/body/raw JSON.
6. Each ingestion and query triggers `cleanupExpiredEvents()`: deletes rows older than 1 hour plus overflow beyond 5000 rows.

### Key behaviors

- Only GoPay / Gojek Indonesia notifications are stored (case-insensitive regex match).
- Duplicate detection is by text content, not notificationKey.
- Token is 12-char URL-safe base64 (9 random bytes), stored in localStorage.
- Events auto-refresh every 10s; max 200 per query.
- Schema uses `jsonb` for payload; indexes on `(token, received_at DESC)` and `received_at`.
